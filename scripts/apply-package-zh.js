#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { resolveOpenClawTarget, patchesDir } from './paths.mjs';

const TARGET = resolveOpenClawTarget();
const PKG = join(TARGET, 'package.json');
const OVERLAY = join(patchesDir(), 'package-zh-overlay.json');
const MERGE_KEYS = [
  'description',
  'keywords',
  'homepage',
  'bugs',
  'repository',
  'author',
  'license',
  'publishConfig',
  'bin',
];

function log(step, detail) {
  console.log(`[${step}] 状态：${detail}`);
}

async function main() {
  if (!existsSync(PKG) || !existsSync(OVERLAY)) {
    log('error', '缺少 package.json 或 overlay 配置');
    process.exit(1);
  }
  const pkg = JSON.parse(await readFile(PKG, 'utf8'));
  const overlay = JSON.parse(await readFile(OVERLAY, 'utf8'));
  for (const key of MERGE_KEYS) {
    if (overlay[key] === undefined) continue;
    if (key === 'bin' && typeof overlay.bin === 'object') {
      pkg.bin = { ...(pkg.bin ?? {}), ...overlay.bin };
    } else {
      pkg[key] = overlay[key];
    }
  }
  await writeFile(PKG, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
  log('done', `已合并 -> name=${pkg.name}, version=${pkg.version}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
