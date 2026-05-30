#!/usr/bin/env node
/**
 * apply-i18n.js
 * 根据 i18n/zh-CN 与 patches 词典，替换 src、packages 中的字符串字面量。
 *
 * 规则：
 * - 仅替换与词典 key 完全一致的字符串字面量（' " ` 包裹）
 * - 不替换变量名、属性名、注释
 */

import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { existsSync } from 'node:fs';

const ROOT = process.cwd();
const I18N_DIR = join(ROOT, 'i18n', 'zh-CN');
const BRAND_PATCH = join(ROOT, 'patches', 'brand-replace.json');
const SCAN_DIRS = ['src', 'packages'];
const EXTENSIONS = new Set(['.js', '.ts', '.tsx', '.json']);
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next']);

/**
 * @param {string} step
 * @param {string} detail
 */
function log(step, detail) {
  console.log(`[${step}] 状态：${detail}`);
}

/**
 * 读取并合并 JSON 词典（跳过 _meta）
 * @returns {Promise<Record<string, string>>}
 */
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
      log('load', `已加载 i18n/${file}，当前词条数 ${Object.keys(dict).length}`);
    }
  } else {
    log('load', 'i18n/zh-CN 目录不存在，跳过');
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

/**
 * 转义用于 RegExp 的字符串
 * @param {string} s
 */
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 在文件内容中替换完全匹配的字符串字面量
 * @param {string} content
 * @param {Record<string, string>} dict
 */
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
      { q: "'", re: new RegExp(`'${escapeRegExp(key)}'`, 'g'), out: `'${value.replace(/'/g, "\\'")}'` },
      { q: '"', re: new RegExp(`"${escapeRegExp(key)}"`, 'g'), out: `"${value.replace(/"/g, '\\"')}"` },
      {
        q: '`',
        re: new RegExp('`' + escapeRegExp(key) + '`', 'g'),
        out: '`' + value.replace(/`/g, '\\`') + '`',
      },
    ];

    for (const { re, out } of patterns) {
      const before = result;
      result = result.replace(re, () => {
        replaceCount += 1;
        return out;
      });
      if (result !== before) {
        // counted in replace callback
      }
    }
  }

  return { content: result, replaceCount };
}

/**
 * 递归收集待处理文件
 * @param {string} dir
 * @param {string[]} acc
 */
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
    } else if (EXTENSIONS.has(full.slice(full.lastIndexOf('.')))) {
      acc.push(full);
    }
  }
  return acc;
}

async function main() {
  log('init', '开始应用汉化替换');

  const dict = await loadDictionary();
  const entryCount = Object.keys(dict).length;
  if (entryCount === 0) {
    log('dict', '词典为空，退出');
    process.exit(0);
  }
  log('dict', `合并后共 ${entryCount} 个词条`);

  const files = [];
  for (const dir of SCAN_DIRS) {
    await collectFiles(join(ROOT, dir), files);
  }
  log('scan', `待扫描文件 ${files.length} 个`);

  let modifiedFiles = 0;
  let totalReplacements = 0;

  for (const filePath of files) {
    const original = await readFile(filePath, 'utf8');
    const { content, replaceCount } = replaceStringLiterals(original, dict);
    if (content !== original) {
      await writeFile(filePath, content, 'utf8');
      modifiedFiles += 1;
      totalReplacements += replaceCount;
      log('file', `已修改 ${relative(ROOT, filePath)}（${replaceCount} 处替换）`);
    }
  }

  log('done', `完成：修改 ${modifiedFiles} 个文件，共 ${totalReplacements} 处替换`);
}

main().catch((err) => {
  log('fatal', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
