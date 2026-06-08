#!/usr/bin/env node
/**
 * 汇总多平台便携包 meta，创建 GitHub Release + latest.json
 */
import { readFileSync, readdirSync, existsSync, writeFileSync, basename } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const STAGING = process.env.RELEASE_STAGING_DIR || 'release-staging';
const UPSTREAM_VERSION = process.env.UPSTREAM_VERSION || '';
const BUILT_VERSION = process.env.BUILT_VERSION || '';
const UPSTREAM_SHA = (process.env.UPSTREAM_SHA || '').slice(0, 7);
const REPO = process.env.GITHUB_REPOSITORY || '';

function loadMetas() {
  if (!existsSync(STAGING)) return [];
  return readdirSync(STAGING)
    .filter((f) => f.endsWith('.meta.json'))
    .map((f) => JSON.parse(readFileSync(join(STAGING, f), 'utf8')));
}

function buildBody(zh, official) {
  const lines = [
    `## OpenClaw ${BUILT_VERSION}`,
    '',
    `跟进官方 **openclaw ${UPSTREAM_VERSION}**${UPSTREAM_SHA ? `（\`${UPSTREAM_SHA}\`）` : ''}，由 [openclaw-zh](https://github.com/agentai2026/openclaw-zh) 自动构建。`,
    '',
    '**零依赖**：已内置 Node.js。Windows 为 **`.exe` 安装程序**；macOS/Linux 为 `.tar.gz` 便携包。',
    '',
    '### 汉化版（openclaw-zh-*）',
    '',
    '| 平台 | 文件 | SHA256 |',
    '|------|------|--------|',
  ];
  for (const m of zh) {
    lines.push(`| ${m.platform} | \`${m.file}\` | \`${m.sha256.slice(0, 16)}…\` |`);
  }
  if (official.length) {
    lines.push('', '### 官方版（openclaw-*，无汉化）', '', '| 平台 | 文件 | SHA256 |', '|------|------|--------|');
    for (const m of official) {
      lines.push(`| ${m.platform} | \`${m.file}\` | \`${m.sha256.slice(0, 16)}…\` |`);
    }
  }
  lines.push(
    '',
    '### 使用',
    '',
    '- Windows：运行 `.exe` 安装程序（便携 `.zip` 默认不生成以加快 CI）',
    '- macOS / Linux：`chmod +x bin/openclaw-gateway.sh && ./bin/openclaw-gateway.sh gateway run`',
    '- npm：`npm i -g @agentai2027/openclaw-zh@' + BUILT_VERSION,
    '',
    '---',
    '',
    '*构建：GitHub Actions · agentai2026/openclaw-zh*',
  );
  return lines.join('\n');
}

function main() {
  const metas = loadMetas();
  const zh = metas.filter((m) => m.variant === 'zh');
  const official = metas.filter((m) => m.variant === 'official');

  const tag = `v${BUILT_VERSION}`;
  const body = buildBody(zh, official);

  const latest = {
    version: BUILT_VERSION,
    upstream_version: UPSTREAM_VERSION,
    upstream_sha: UPSTREAM_SHA,
    published_at: new Date().toISOString(),
    repository: REPO ? `https://github.com/${REPO}` : 'https://github.com/agentai2026/openclaw-zh',
    npm: `@agentai2027/openclaw-zh@${BUILT_VERSION}`,
    assets: Object.fromEntries(
      metas.map((m) => [
        m.platform + (m.variant === 'official' ? '-official' : ''),
        { file: m.file, sha256: m.sha256, size: m.size, variant: m.variant },
      ]),
    ),
  };

  writeFileSync(join(STAGING, 'latest.json'), `${JSON.stringify(latest, null, 2)}\n`);
  writeFileSync('release-notes.md', body);

  const files = [
    join(STAGING, 'latest.json'),
    ...metas.map((m) => join(STAGING, m.file)),
  ].filter(existsSync);

  if (files.length < 2) {
    console.error('[release] 产物不足，请检查 meta 与安装包是否齐全');
    process.exit(1);
  }

  const allowedNames = new Set(files.map((f) => basename(f)));

  try {
    execSync(`gh release view "${tag}"`, { stdio: 'pipe' });
    console.log(`[release] 已存在 ${tag}，清理多余资产后重新上传`);
    const assets = JSON.parse(
      execSync(`gh release view "${tag}" --json assets`, { encoding: 'utf8' }),
    ).assets;
    for (const a of assets) {
      if (!allowedNames.has(a.name)) {
        console.log(`[release] 删除多余资产: ${a.name}`);
        execSync(`gh api -X DELETE "repos/${REPO}/releases/assets/${a.id}"`, { stdio: 'inherit' });
      }
    }
    execSync(`gh release upload "${tag}" ${files.map((f) => `"${f}"`).join(' ')} --clobber`, {
      stdio: 'inherit',
    });
    execSync(`gh release edit "${tag}" --notes-file release-notes.md`, { stdio: 'inherit' });
  } catch {
    execSync(
      `gh release create "${tag}" ${files.map((f) => `"${f}"`).join(' ')} --title "OpenClaw ${BUILT_VERSION}" --notes-file release-notes.md`,
      { stdio: 'inherit' },
    );
  }

  console.log(`[release] https://github.com/${REPO}/releases/tag/${tag}`);
}

main();
