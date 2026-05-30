#!/usr/bin/env node
/**
 * apply-i18n.js — 按范围应用汉化，避免替换 src 内协议/类型用字符串
 *
 * - dashboard.json → ui/
 * - config.json    → schema.labels.ts / schema.help.ts
 * - cli.json       → src/cli、src/commands（仅较长文案键）
 * - brand-replace  → ui/ + README
 */

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative, basename } from 'node:path';
import { existsSync } from 'node:fs';
import { resolveOpenClawTarget, translationsDir, patchesDir, OVERLAY_ROOT } from './paths.mjs';

const TARGET = resolveOpenClawTarget();
const I18N_DIR = translationsDir();
const BRAND_PATCH = join(patchesDir(), 'brand-replace.json');
const EXTENSIONS = new Set(['.js', '.ts', '.tsx']);
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next']);
const SKIP_FILE_NAMES = new Set([
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'package-lock.json',
]);

/** 词典文件 → 允许扫描的相对路径片段（相对于 TARGET） */
const RULES = [
  { file: 'dashboard.json', match: (p) => p.replace(/\\/g, '/').includes('/ui/') },
  {
    file: 'config.json',
    match: (p) => {
      const n = basename(p);
      return n === 'schema.labels.ts' || n === 'schema.help.ts';
    },
  },
  {
    file: 'cli.json',
    match: (p) => {
      const n = p.replace(/\\/g, '/');
      return n.includes('/src/cli/') || n.includes('/src/commands/');
    },
  },
  {
    file: 'brand-replace.json',
    fromPatch: true,
    match: (p) => {
      const n = p.replace(/\\/g, '/');
      return n.includes('/ui/') || basename(p) === 'README.md';
    },
  },
];

function log(step, detail) {
  console.log(`[${step}] 状态：${detail}`);
}

async function loadJsonDict(path) {
  if (!existsSync(path)) return {};
  const data = JSON.parse(await readFile(path, 'utf8'));
  const dict = {};
  for (const [key, value] of Object.entries(data)) {
    if (key === '_meta' || typeof value !== 'string') continue;
    dict[key] = value;
  }
  return dict;
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replaceStringLiterals(content, dict) {
  const keys = Object.keys(dict).sort((a, b) => b.length - a.length);
  let result = content;
  let replaceCount = 0;

  for (const key of keys) {
    const value = dict[key];
    if (!key || key === value) continue;

    const patterns = [
      { re: new RegExp(`'${escapeRegExp(key)}'`, 'g'), out: `'${value.replace(/'/g, "\\'")}'` },
      { re: new RegExp(`"${escapeRegExp(key)}"`, 'g'), out: `"${value.replace(/"/g, '\\"')}"` },
      {
        re: new RegExp('`' + escapeRegExp(key) + '`', 'g'),
        out: '`' + value.replace(/`/g, '\\`') + '`',
      },
    ];

    for (const { re, out } of patterns) {
      result = result.replace(re, () => {
        replaceCount += 1;
        return out;
      });
    }
  }

  return { content: result, replaceCount };
}

async function collectFiles(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  const entries = await readdir(dir, { withFileTypes: true });
  for (const ent of entries) {
    if (SKIP_DIRS.has(ent.name)) continue;
    const full = join(dir, ent.name);
    if (ent.isDirectory()) {
      await collectFiles(full, acc);
    } else if (EXTENSIONS.has(full.slice(full.lastIndexOf('.'))) && !SKIP_FILE_NAMES.has(basename(full))) {
      acc.push(full);
    }
  }
  return acc;
}

async function main() {
  log('init', `target=${TARGET}`);

  const allFiles = [];
  for (const root of ['ui', 'src', 'apps']) {
    await collectFiles(join(TARGET, root), allFiles);
  }
  const readme = join(TARGET, 'README.md');
  if (existsSync(readme)) allFiles.push(readme);

  log('scan', `候选文件 ${allFiles.length} 个`);

  let modifiedFiles = 0;
  let totalReplacements = 0;

  for (const rule of RULES) {
    const dictPath = rule.fromPatch
      ? BRAND_PATCH
      : join(I18N_DIR, rule.file);
    const dict = await loadJsonDict(dictPath);
    if (Object.keys(dict).length === 0) continue;

    log('rule', `${rule.file} → ${Object.keys(dict).length} 条`);

    for (const filePath of allFiles) {
      const rel = relative(TARGET, filePath);
      if (!rule.match(rel)) continue;

      const original = await readFile(filePath, 'utf8');
      const { content, replaceCount } = replaceStringLiterals(original, dict);
      if (content === original) continue;

      await writeFile(filePath, content, 'utf8');
      modifiedFiles += 1;
      totalReplacements += replaceCount;
      log('file', `${rel}（${replaceCount} 处）`);
    }
  }

  log('done', `完成：${modifiedFiles} 个文件，${totalReplacements} 处替换`);
  console.log(`##STATS##applied=${totalReplacements}|files=${modifiedFiles}##`);
}

main().catch((err) => {
  log('fatal', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
