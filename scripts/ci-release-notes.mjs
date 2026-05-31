#!/usr/bin/env node
/**
 * 生成汉化版发布说明（Git 提交说明 + CHANGELOG 条目）
 * 风格参考：feat: 适配上游 vX / chore: 发布 vX-zh
 */
import { readFileSync, existsSync } from 'node:fs';

/**
 * @param {{
 *   prev?: { upstream_version?: string; built_version?: string } | null;
 *   upstream_version: string;
 *   upstream_sha?: string;
 *   built_version: string;
 *   extra?: string;
 * }} input
 */
export function buildReleaseNotes(input) {
  const { prev, upstream_version, upstream_sha, built_version, extra } = input;
  const prevUpstream = prev?.upstream_version?.trim() || '';
  const sha = (upstream_sha || '').trim().slice(0, 7);
  const shaPart = sha ? `（${sha}）` : '';

  const isRevision =
    /\.\d{8}$/.test(built_version.split('-zh').pop() || '') &&
    built_version.includes('-zh.');
  const isUpstreamBump =
    Boolean(upstream_version) &&
    !isRevision &&
    (!prevUpstream || upstream_version !== prevUpstream);

  let type;
  let subject;
  let bullets;

  if (isUpstreamBump) {
    type = 'feat';
    subject = `feat: 适配上游 v${upstream_version}，发布汉化版 ${built_version}`;
    bullets = [
      `跟进官方 openclaw **${upstream_version}**${shaPart}`,
      '同步 `translations/` 全量汉化与控制台功能面板',
      `npm 安装：@agentai2026/openclaw-zh@${built_version}`,
    ];
  } else if (isRevision) {
    type = 'chore';
    subject = `chore: 重发汉化 ${built_version}（翻译/面板/脚本更新）`;
    bullets = [
      `官方版本仍为 **${upstream_version || prevUpstream}**${shaPart}`,
      '仅更新汉化词条、`overlay/panel/` 或构建脚本后重新发布',
      `npm 安装：@agentai2026/openclaw-zh@${built_version}`,
    ];
  } else {
    type = 'chore';
    subject = `chore: 发布汉化版 ${built_version}`;
    bullets = [
      `对应官方 **${upstream_version}**${shaPart}`,
      `npm 安装：@agentai2026/openclaw-zh@${built_version}`,
    ];
  }

  if (extra?.trim()) {
    bullets.push(extra.trim());
  }

  const body = bullets.map((b) => `- ${b}`).join('\n');
  const commitMessage = `${subject}\n\n${body}`;

  const date = new Date().toISOString().slice(0, 10);
  const changelogBlock = [
    `## ${built_version}（${date}）`,
    '',
    `**${subject.split(': ').slice(1).join(': ')}**`,
    '',
    ...bullets.map((b) => `- ${b.replace(/\*\*/g, '')}`),
    '',
  ].join('\n');

  return { type, subject, body, commitMessage, changelogBlock };
}

export function readPrevLastBuild(path = '.github/last-build.json') {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

export function appendChangelog(block, path = 'CHANGELOG.md') {
  const header = '# 更新日志\n\n> 汉化版每次发布会自动追加；控制台「功能面板 → 更新日志」同步展示 GitHub 提交记录。\n\n';
  let content = existsSync(path) ? readFileSync(path, 'utf8') : header;
  if (!content.startsWith('# 更新日志')) {
    content = header + content;
  }
  const insertAt = content.indexOf('\n\n', content.indexOf('# 更新日志')) + 2;
  const before = content.slice(0, insertAt);
  const after = content.slice(insertAt).replace(/^\n+/, '');
  return `${before}${block}\n${after}`;
}

if (process.argv[1]?.includes('ci-release-notes')) {
  const prev = readPrevLastBuild();
  const built_version = process.env.BUILT_VERSION || '';
  const notes = buildReleaseNotes({
    prev,
    upstream_version: process.env.UPSTREAM_VERSION || '',
    upstream_sha: process.env.UPSTREAM_SHA || '',
    built_version,
    extra: process.env.RELEASE_NOTE_EXTRA || '',
  });
  console.log(notes.commitMessage);
}
