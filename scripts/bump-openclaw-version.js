#!/usr/bin/env node
/**
 * bump-openclaw-version.js
 * 汉化版版本 = 官方版本 + "-zh"
 * 例: 官方 5.2.0 → 5.2.0-zh；官方 2026.5.30 → 2026.5.30-zh
 *
 * 若同一官方版本需再次发布（仅汉化词条变更），设置 FORCE_REVISION=1
 * 则变为 5.2.0-zh.20260531
 */
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { resolveOpenClawTarget } from './paths.mjs';

const PKG = join(resolveOpenClawTarget(), 'package.json');

function dateSuffix() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
}

async function main() {
  const official = process.env.UPSTREAM_VERSION;
  if (!official || !existsSync(PKG)) {
    console.error('需要 UPSTREAM_VERSION 与 openclaw/package.json');
    process.exit(1);
  }

  const pkg = JSON.parse(await readFile(PKG, 'utf8'));
  const base = `${official}-zh`;
  const next =
    process.env.FORCE_REVISION === '1' ? `${base}.${dateSuffix()}` : base;

  pkg.version = next;
  await writeFile(PKG, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
  console.log(`[version] 官方 ${official} → 汉化版 ${next}`);

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
