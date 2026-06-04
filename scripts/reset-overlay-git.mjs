#!/usr/bin/env node
/** 重置 git 索引为仅 overlay 文件（先删磁盘上的上游残留） */
import { execSync } from 'node:child_process';
import { readdirSync, rmSync, statSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const KEEP_TOP = new Set([
  '.git',
  '.github',
  'cli',
  'translations',
  'patches',
  'scripts',
  'docker',
  'deploy',
  'node_modules',
  'openclaw',
  'README.md',
  'SETUP_GUIDE.md',
  'package.json',
  '.gitignore',
  'LICENSE',
]);

const KEEP_GITHUB = new Set([
  'workflows/nightly.yml',
  'last-build.json',
  'dependabot.yml',
]);

function rmGitHubExtras() {
  const gh = join(ROOT, '.github');
  if (!existsSync(gh)) return;
  for (const name of readdirSync(gh)) {
    const p = join(gh, name);
    if (name === 'workflows') {
      const wf = join(p);
      for (const f of readdirSync(wf)) {
        if (!KEEP_GITHUB.has(`workflows/${f}`)) {
          rmSync(join(wf, f), { force: true });
        }
      }
      continue;
    }
    if (name !== 'last-build.json') {
      rmSync(p, { recursive: true, force: true });
    }
  }
}

function rmRootExtras() {
  for (const name of readdirSync(ROOT)) {
    if (KEEP_TOP.has(name)) continue;
    const p = join(ROOT, name);
    try {
      if (statSync(p).isDirectory()) rmSync(p, { recursive: true, force: true });
      else rmSync(p, { force: true });
    } catch {}
  }
  const patches = join(ROOT, 'patches');
  if (existsSync(patches)) {
    for (const f of readdirSync(patches)) {
      if (!['brand-replace.json', 'package-zh-overlay.json'].includes(f)) {
        rmSync(join(patches, f), { force: true });
      }
    }
  }
}

const ADD_PATHS = [
  'cli',
  'translations',
  'patches',
  'scripts',
  'docker',
  'deploy',
  'README.md',
  'SETUP_GUIDE.md',
  'package.json',
  '.gitignore',
  'LICENSE',
  '.github/workflows/nightly.yml',
  '.github/last-build.json',
  '.github/dependabot.yml',
];

rmRootExtras();
rmGitHubExtras();

process.chdir(ROOT);
execSync('git rm -rf --cached .', { stdio: 'inherit' });
for (const p of ADD_PATHS) {
  if (existsSync(p)) execSync(`git add ${JSON.stringify(p)}`, { stdio: 'inherit' });
}
console.log('完成。tracked:', execSync('git ls-files', { encoding: 'utf8' }).trim().split('\n').length);
