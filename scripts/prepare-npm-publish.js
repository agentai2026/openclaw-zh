#!/usr/bin/env node
/**
 * prepare-npm-publish.js
 * 构建完成后、npm publish 前将包名改为 @agentai2026/openclaw-zh
 * （构建阶段必须保持 name=openclaw 以满足 workspace:* 依赖）
 */

import { readFile, writeFile } from 'node:fs/promises';

const PKG = 'package.json';
const NPM_NAME = '@agentai2026/openclaw-zh';

function log(step, detail) {
  console.log(`[${step}] 状态：${detail}`);
}

async function main() {
  const raw = await readFile(PKG, 'utf8');
  const pkg = JSON.parse(raw);

  log('publish', `workspace 包名: ${pkg.name} -> ${NPM_NAME}`);
  pkg.name = NPM_NAME;
  pkg.publishConfig = {
    access: 'public',
    registry: 'https://registry.npmjs.org/',
    ...(pkg.publishConfig ?? {}),
  };

  await writeFile(PKG, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
  log('done', `npm 发布名已设为 ${NPM_NAME}，版本 ${pkg.version}`);
}

main().catch((err) => {
  log('fatal', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
