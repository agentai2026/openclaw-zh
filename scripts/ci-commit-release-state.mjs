#!/usr/bin/env node
/**
 * CI：发布成功后更新 last-build，并提交 pending / last-build 状态
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

const upstream_version = process.env.UPSTREAM_VERSION || '';
const upstream_sha = process.env.UPSTREAM_SHA || '';
const built_version = process.env.BUILT_VERSION || '';

if (built_version) {
  writeFileSync(
    '.github/last-build.json',
    `${JSON.stringify(
      {
        upstream_version,
        upstream_sha,
        built_version,
        built_at: new Date().toISOString(),
      },
      null,
      2,
    )}\n`,
  );
  if (existsSync('.github/publish-pending.json')) {
    writeFileSync(
      '.github/publish-pending.json',
      `${JSON.stringify({ status: 'done', cleared_at: new Date().toISOString() }, null, 2)}\n`,
    );
  }
}

const files = ['.github/last-build.json', '.github/publish-pending.json'].filter((f) =>
  existsSync(f),
);

if (!files.length) process.exit(0);

execSync('git config user.name "openclaw-zh-bot"', { stdio: 'inherit' });
execSync('git config user.email "41898282+github-actions[bot]@users.noreply.github.com"', {
  stdio: 'inherit',
});
for (const f of files) execSync(`git add ${f}`, { stdio: 'inherit' });
try {
  execSync(`git commit -m "ci: release state ${upstream_sha}"`, { stdio: 'inherit' });
  execSync('git push', { stdio: 'inherit' });
} catch {
  console.log('[git] 无新变更或 push 跳过');
}
