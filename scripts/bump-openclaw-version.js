#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { resolveOpenClawTarget } from './paths.mjs';

const PKG = join(resolveOpenClawTarget(), 'package.json');

async function main() {
  const official = process.env.UPSTREAM_VERSION;
  if (!official || !existsSync(PKG)) {
    console.error('需要 UPSTREAM_VERSION 与 openclaw/package.json');
    process.exit(1);
  }
  const pkg = JSON.parse(await readFile(PKG, 'utf8'));
  const runId = process.env.GITHUB_RUN_NUMBER || '';
  const next = runId ? `${official}-zh.nightly.${runId}` : `${official}-zh`;
  pkg.version = next;
  await writeFile(PKG, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
  console.log(`[version] ${next}`);
  if (process.env.GITHUB_OUTPUT) {
    const { appendFile } = await import('node:fs/promises');
    await appendFile(
      process.env.GITHUB_OUTPUT,
      `version=${next}\nofficial_version=${official}\n`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
