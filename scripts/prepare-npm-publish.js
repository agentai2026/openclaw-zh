#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { resolveOpenClawTarget } from './paths.mjs';

const PKG = join(resolveOpenClawTarget(), 'package.json');
const NPM_NAME = '@agentai2027/openclaw-zh';

async function main() {
  const pkg = JSON.parse(await readFile(PKG, 'utf8'));
  console.log(`[publish] ${pkg.name} -> ${NPM_NAME}`);
  pkg.name = NPM_NAME;
  pkg.publishConfig = {
    access: 'public',
    registry: 'https://registry.npmjs.org/',
    ...(pkg.publishConfig ?? {}),
  };
  await writeFile(PKG, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
