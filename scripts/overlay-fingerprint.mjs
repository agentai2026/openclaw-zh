#!/usr/bin/env node
/**
 * 汉化 overlay 内容指纹：translations / overlay / patches / 相关 scripts
 */
import { createHash } from 'node:crypto';
import { createReadStream, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const OVERLAY_DIRS = ['translations', 'overlay', 'patches', 'cli'];

const OVERLAY_SCRIPT_NAMES = new Set([
  'apply-package-zh.js',
  'apply-i18n.js',
  'apply-feature-panel.mjs',
  'bump-openclaw-version.js',
  'i18n-engine.mjs',
  'paths.mjs',
  'prepare-npm-publish.js',
  'regenerate-schema-artifacts.mjs',
  'build-feature-panel.mjs',
]);

function walkFiles(dir, acc) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walkFiles(p, acc);
    else acc.push(p);
  }
}

function collectPaths() {
  const files = [];
  for (const d of OVERLAY_DIRS) {
    walkFiles(join(ROOT, d), files);
  }
  const scriptsDir = join(ROOT, 'scripts');
  if (existsSync(scriptsDir)) {
    for (const name of readdirSync(scriptsDir)) {
      if (OVERLAY_SCRIPT_NAMES.has(name)) {
        files.push(join(scriptsDir, name));
      }
    }
  }
  return files.sort((a, b) => a.localeCompare(b));
}

function hashFile(path, hash) {
  return new Promise((resolve, reject) => {
    const rel = relative(ROOT, path).replace(/\\/g, '/');
    hash.update(rel);
    hash.update('\0');
    const stream = createReadStream(path);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', resolve);
    stream.on('error', reject);
  });
}

export async function computeOverlayFingerprint() {
  const hash = createHash('sha256');
  const files = collectPaths();
  for (const f of files) {
    await hashFile(f, hash);
  }
  return hash.digest('hex').slice(0, 16);
}

const isMain =
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  computeOverlayFingerprint()
    .then((fp) => {
      console.log(fp);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
