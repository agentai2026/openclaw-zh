#!/usr/bin/env node
/**
 * CI：拒绝带 UTF-8 BOM 的文本文件（会导致 package.json 等 JSON 解析失败）
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TEXT_EXT = new Set(['.json', '.yml', '.yaml', '.mjs', '.js', '.md', '.ps1', '.sh', '.css']);
const SKIP_DIR = new Set(['node_modules', '.git', 'openclaw', 'dist']);

function hasBom(filePath) {
  const buf = readFileSync(filePath);
  return buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf;
}

function walk(relDir, out) {
  const dir = join(ROOT, relDir === '.' ? '' : relDir);
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    if (SKIP_DIR.has(name)) continue;
    const rel = relDir === '.' ? name : `${relDir}/${name}`;
    const abs = join(ROOT, rel);
    const st = statSync(abs);
    if (st.isDirectory()) walk(rel, out);
    else {
      const ext = name.includes('.') ? name.slice(name.lastIndexOf('.')) : '';
      if (TEXT_EXT.has(ext)) out.add(rel.replace(/\\/g, '/'));
    }
  }
}

const files = new Set();
walk('.', files);

const bad = [...files].filter((f) => hasBom(f));
if (bad.length) {
  for (const f of bad) console.error(`::error::UTF-8 BOM 不允许: ${f}`);
  console.error(`[check-no-bom] 共 ${bad.length} 个文件；请用 UTF-8 无 BOM 保存（勿用 PowerShell Set-Content -Encoding UTF8）`);
  process.exit(1);
}
console.log(`[check-no-bom] OK（已检查 ${files.size} 个文件）`);
