#!/usr/bin/env node
/**
 * CI：发布成功后更新 last-build、CHANGELOG，并用规范的提交说明推送到 GitHub
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import {
  buildReleaseNotes,
  readPrevLastBuild,
  appendChangelog,
} from './ci-release-notes.mjs';
import { computeOverlayFingerprint } from './overlay-fingerprint.mjs';

const upstream_version = process.env.UPSTREAM_VERSION || '';
const upstream_sha = process.env.UPSTREAM_SHA || '';
const built_version = process.env.BUILT_VERSION || '';
const release_note_extra = process.env.RELEASE_NOTE_EXTRA || '';

async function main() {
  const filesToCommit = [];

  if (built_version) {
    const prev = readPrevLastBuild('.github/last-build.json');

    const notes = buildReleaseNotes({
      prev,
      upstream_version,
      upstream_sha,
      built_version,
      extra: release_note_extra,
    });

    console.log('[release] 提交说明:\n' + notes.commitMessage);

    const overlay_sha = await computeOverlayFingerprint();

    writeFileSync(
      '.github/last-build.json',
      `${JSON.stringify(
        {
          upstream_version,
          upstream_sha,
          built_version,
          built_at: new Date().toISOString(),
          overlay_sha,
          release_subject: notes.subject,
        },
        null,
        2,
      )}\n`,
    );
    filesToCommit.push('.github/last-build.json');

    writeFileSync('CHANGELOG.md', appendChangelog(notes.changelogBlock));
    filesToCommit.push('CHANGELOG.md');

    if (existsSync('.github/publish-pending.json')) {
      writeFileSync(
        '.github/publish-pending.json',
        `${JSON.stringify({ status: 'done', cleared_at: new Date().toISOString() }, null, 2)}\n`,
      );
      filesToCommit.push('.github/publish-pending.json');
    }

    if (process.env.GITHUB_OUTPUT) {
      const esc = (s) => s.replace(/\r/g, '').replace(/\n/g, '%0A');
      writeFileSync(
        process.env.GITHUB_OUTPUT,
        `release_subject=${esc(notes.subject)}\nrelease_commit_message=${esc(notes.commitMessage)}\n`,
        { flag: 'a' },
      );
    }

    execSync('git config user.name "openclaw-zh-bot"', { stdio: 'inherit' });
    execSync('git config user.email "41898282+github-actions[bot]@users.noreply.github.com"', {
      stdio: 'inherit',
    });

    for (const f of filesToCommit) execSync(`git add ${JSON.stringify(f)}`, { stdio: 'inherit' });

    try {
      const msgFile = '.github/.release-commit-msg.txt';
      writeFileSync(msgFile, notes.commitMessage, 'utf8');
      execSync(`git commit -F ${JSON.stringify(msgFile)}`, { stdio: 'inherit' });
      execSync('git push', { stdio: 'inherit' });
      console.log('[git] 已推送发布记录与更新日志');
    } catch {
      console.log('[git] 无新变更或 push 跳过');
    }
  } else {
    const files = ['.github/last-build.json', '.github/publish-pending.json'].filter((f) =>
      existsSync(f),
    );
    if (!files.length) return;

    execSync('git config user.name "openclaw-zh-bot"', { stdio: 'inherit' });
    execSync('git config user.email "41898282+github-actions[bot]@users.noreply.github.com"', {
      stdio: 'inherit',
    });
    for (const f of files) execSync(`git add ${JSON.stringify(f)}`, { stdio: 'inherit' });
    try {
      execSync(`git commit -m ${JSON.stringify(`ci: 更新发布状态 ${upstream_sha}`)}`, {
        stdio: 'inherit',
      });
      execSync('git push', { stdio: 'inherit' });
    } catch {
      console.log('[git] 无新变更或 push 跳过');
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
