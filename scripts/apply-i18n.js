#!/usr/bin/env node
/**
 * apply-i18n.js
 * 根据 i18n/zh-CN 与 patches 词典，替换 UI 源码中的字符串字面量。
 *
 * 规则：
 * - 仅扫描 src/、apps/（不扫描 packages/，避免误改 workspace 的 package.json）
 * - 不处理任何 package.json / lock 文件
 * - 仅替换与词典 key 完全一致的字符串字面量
 */

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative, basename } from 'node:path';
import { existsSync } from 'node:fs';

const ROOT = process.cwd();
const I18N_DIR = join(ROOT, 'i18n', 'zh-CN');
const BRAND_PATCH = join(ROOT, 'patches', 'brand-replace.json');
const SCAN_DIRS = ['src', 'apps'];
const EXTENSIONS = new Set(['.js', '.ts', '.tsx']);
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next']);
const SKIP_FILE_NAMES = new Set([
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'package-lock.json',
]);

function log(step, detail) {
  console.log(`[${step}] 状态：${detail}`);
}

async function loadDictionary() {
  const dict = {};

  if (existsSync(I18N_DIR)) {
    const files = (await readdir(I18N_DIR)).filter((f) => f.endsWith('.json'));
    for (const file of files) {
      const raw = await readFile(join(I18N_DIR, file), 'utf8');
      const data = JSON.parse(raw);
      for (const [key, value] of Object.entries(data)) {
        if (key === '_meta' || typeof value !== 'string') {
          continue;
        }
        dict[key] = value;
      }
      log('load', `已加载 i18n/${file}`);
    }
  }

  if (existsSync(BRAND_PATCH)) {
    const brand = JSON.parse(await readFile(BRAND_PATCH, 'utf8'));
    for (const [key, value] of Object.entries(brand)) {
      if (key === '_meta' || typeof value !== 'string') {
        continue;
      }
      dict[key] = value;
    }
    log('load', '已合并 patches/brand-replace.json');
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
    if (!key || key === value) {
      continue;
    }

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

function shouldSkipFile(filePath) {
  return SKIP_FILE_NAMES.has(basename(filePath));
}

async function collectFiles(dir, acc = []) {
  if (!existsSync(dir)) {
    return acc;
  }
  const entries = await readdir(dir, { withFileTypes: true });
  for (const ent of entries) {
    if (SKIP_DIRS.has(ent.name)) {
      continue;
    }
    const full = join(dir, ent.name);
    if (ent.isDirectory()) {
      await collectFiles(full, acc);
    } else if (EXTENSIONS.has(full.slice(full.lastIndexOf('.'))) && !shouldSkipFile(full)) {
      acc.push(full);
    }
  }
  return acc;
}

async function main() {
  log('init', '开始应用汉化替换');

  const dict = await loadDictionary();
  if (Object.keys(dict).length === 0) {
    log('dict', '词典为空，退出');
    process.exit(0);
  }
  log('dict', `共 ${Object.keys(dict).length} 个词条`);

  const files = [];
  for (const dir of SCAN_DIRS) {
    await collectFiles(join(ROOT, dir), files);
  }
  log('scan', `待扫描 ${files.length} 个文件（已排除 packages/ 与 package.json）`);

  let modifiedFiles = 0;
  let totalReplacements = 0;

  for (const filePath of files) {
    const original = await readFile(filePath, 'utf8');
    const { content, replaceCount } = replaceStringLiterals(original, dict);
    if (content !== original) {
      await writeFile(filePath, content, 'utf8');
      modifiedFiles += 1;
      totalReplacements += replaceCount;
      log('file', `已修改 ${relative(ROOT, filePath)}（${replaceCount} 处）`);
    }
  }

  log('done', `完成：${modifiedFiles} 个文件，${totalReplacements} 处替换`);
}

main().catch((err) => {
  log('fatal', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
