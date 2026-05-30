#!/usr/bin/env node
/**
 * apply-package-zh.js
 * 在官方 package.json 上合并汉化版元数据，保留 overrides / scripts / pnpm 配置。
 */

import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const PKG = 'package.json';
const OVERLAY = 'patches/package-zh-overlay.json';

/** 仅覆盖这些顶层字段（不触碰 overrides、scripts、dependencies 等） */
const MERGE_KEYS = [
  'name',
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
  if (!existsSync(PKG)) {
    log('error', `缺少 ${PKG}`);
    process.exit(1);
  }
  if (!existsSync(OVERLAY)) {
    log('error', `缺少 ${OVERLAY}`);
    process.exit(1);
  }

  const pkg = JSON.parse(await readFile(PKG, 'utf8'));
  const overlay = JSON.parse(await readFile(OVERLAY, 'utf8'));

  for (const key of MERGE_KEYS) {
    if (overlay[key] === undefined) {
      continue;
    }
    if (key === 'bin' && typeof overlay.bin === 'object') {
      pkg.bin = { ...(pkg.bin ?? {}), ...overlay.bin };
    } else {
      pkg[key] = overlay[key];
    }
  }

  await writeFile(PKG, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
  log('done', `已合并汉化元数据 -> name=${pkg.name}, version=${pkg.version}`);
}

main().catch((err) => {
  log('fatal', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
