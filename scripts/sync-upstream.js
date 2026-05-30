#!/usr/bin/env node
/**
 * sync-upstream.js
 * 同步策略：以 upstream/main 为基准 reset，再覆盖汉化受保护文件（无 merge，无冲突）
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync } from 'node:fs';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const execFileAsync = promisify(execFile);

const UPSTREAM_URL = 'https://github.com/openclaw/openclaw.git';
const UPSTREAM_REMOTE = 'upstream';
const UPSTREAM_BRANCH = 'main';
const ORIGIN_BRANCH = 'main';
const SYNC_REF_FILE = '.github/upstream-sync-ref';
const BACKUP_DIR = '.sync-overlay-backup';

const PROTECTED_PATHS = [
  '.github/workflows/',
  'scripts/',
  'i18n/',
  'patches/',
  'docker/',
  'deploy/',
  'README.md',
  'package.json',
];

const FETCH_MAX_RETRIES = 3;
const FETCH_RETRY_DELAY_MS = 30_000;

function log(step, detail) {
  console.log(`[${step}] 状态：${detail}`);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run(cmd, args = []) {
  const { stdout, stderr } = await execFileAsync(cmd, args, {
    cwd: process.cwd(),
    maxBuffer: 100 * 1024 * 1024,
    encoding: 'utf8',
  });
  if (stdout?.trim()) {
    console.log(stdout.trim());
  }
  if (stderr?.trim()) {
    console.error(stderr.trim());
  }
}

async function runOutput(cmd, args = []) {
  const { stdout } = await execFileAsync(cmd, args, {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
  return stdout.trim();
}

async function tryRun(cmd, args = []) {
  try {
    await run(cmd, args);
    return true;
  } catch {
    return false;
  }
}

async function hasRemote(name) {
  const remotes = await runOutput('git', ['remote']);
  return remotes.split('\n').includes(name);
}

async function fetchWithRetry(remote, branch, label) {
  for (let attempt = 1; attempt <= FETCH_MAX_RETRIES; attempt++) {
    try {
      log('fetch', `第 ${attempt}/${FETCH_MAX_RETRIES} 次拉取 ${label}`);
      await run('git', ['fetch', remote, branch]);
      return;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log('fetch', `失败: ${msg}`);
      if (attempt >= FETCH_MAX_RETRIES) {
        process.exit(1);
      }
      await sleep(FETCH_RETRY_DELAY_MS);
    }
  }
}

/** 清理可能遗留的冲突/合并状态 */
async function cleanGitState() {
  log('clean', '清理未完成的 merge/rebase 状态');
  await tryRun('git', ['merge', '--abort']);
  await tryRun('git', ['rebase', '--abort']);
  await tryRun('git', ['reset', '--merge']);
  const porcelain = await runOutput('git', ['status', '--porcelain']);
  if (porcelain.includes('UU') || porcelain.includes('AA') || porcelain.includes('DD')) {
    log('clean', '检测到冲突文件，执行 reset --hard HEAD');
    await run('git', ['reset', '--hard', 'HEAD']);
  }
}

/** 将受保护路径备份到临时目录 */
async function backupProtectedFiles() {
  log('backup', `备份汉化文件到 ${BACKUP_DIR}`);
  await rm(BACKUP_DIR, { recursive: true, force: true });
  await mkdir(BACKUP_DIR, { recursive: true });

  for (const p of PROTECTED_PATHS) {
    try {
      await run('git', ['checkout', 'HEAD', '--', p]);
    } catch {
      // 首次可能部分路径不存在
    }
    if (!existsSync(p)) {
      continue;
    }
    const dest = join(BACKUP_DIR, p);
    await mkdir(join(dest, '..'), { recursive: true });
    await cp(p, dest, { recursive: true, force: true });
    log('backup', `已备份: ${p}`);
  }
}

/** 从临时目录恢复汉化文件 */
async function restoreProtectedFromBackup() {
  log('restore', '将汉化文件覆盖到官方代码树');
  for (const p of PROTECTED_PATHS) {
    const src = join(BACKUP_DIR, p);
    if (!existsSync(src)) {
      log('restore', `跳过（备份不存在）: ${p}`);
      continue;
    }
    await cp(src, p, { recursive: true, force: true });
    log('restore', `已恢复: ${p}`);
  }
}

async function readSyncedUpstreamRef() {
  if (!existsSync(SYNC_REF_FILE)) {
    return '';
  }
  return (await readFile(SYNC_REF_FILE, 'utf8')).trim();
}

async function writeSyncedUpstreamRef(ref) {
  await mkdir('.github', { recursive: true });
  await writeFile(SYNC_REF_FILE, `${ref}\n`, 'utf8');
}

function commitMessage() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const ts = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}:${pad(now.getMinutes())}`;
  return `sync: ${ts} 自动同步上游`;
}

async function pushToOrigin() {
  await fetchWithRetry('origin', ORIGIN_BRANCH, 'origin/main');

  try {
    await run('git', ['push', 'origin', ORIGIN_BRANCH]);
    log('push', '推送成功');
    return;
  } catch (err) {
    log('push', `普通推送失败: ${err instanceof Error ? err.message : err}`);
  }

  log('push', '尝试 force-with-lease（清理远程历史分叉，仅用于同步机器人）');
  try {
    await run('git', ['push', 'origin', ORIGIN_BRANCH, '--force-with-lease']);
    log('push', 'force-with-lease 推送成功');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log('push', `推送失败，请确认 PAT 有 repo 权限: ${msg}`);
    process.exit(1);
  }
}

async function main() {
  log('init', '开始上游同步（overlay 模式，无 merge）');

  if (!existsSync('.git')) {
    log('init', '错误：不是 git 仓库');
    process.exit(1);
  }

  await cleanGitState();

  if (!(await hasRemote(UPSTREAM_REMOTE))) {
    await run('git', ['remote', 'add', UPSTREAM_REMOTE, UPSTREAM_URL]);
    log('remote', `已添加 ${UPSTREAM_REMOTE}`);
  }

  await fetchWithRetry('origin', ORIGIN_BRANCH, 'origin/main');
  await fetchWithRetry(UPSTREAM_REMOTE, UPSTREAM_BRANCH, 'upstream/main');

  const upstreamRef = await runOutput('git', [
    'rev-parse',
    `${UPSTREAM_REMOTE}/${UPSTREAM_BRANCH}`,
  ]);

  const lastSynced = await readSyncedUpstreamRef();
  if (lastSynced === upstreamRef) {
    log('compare', `上游未变化 (${upstreamRef.slice(0, 7)})`);
    console.log('无更新，跳过本次同步');
    process.exit(0);
  }

  log('overlay', `对齐到 upstream/main @ ${upstreamRef.slice(0, 7)}`);
  await backupProtectedFiles();
  await run('git', ['reset', '--hard', `${UPSTREAM_REMOTE}/${UPSTREAM_BRANCH}`]);
  await restoreProtectedFromBackup();
  await writeSyncedUpstreamRef(upstreamRef);

  await rm(BACKUP_DIR, { recursive: true, force: true });

  const status = await runOutput('git', ['status', '--porcelain']);
  if (!status) {
    log('commit', '工作区无变更');
    console.log('无更新，跳过本次同步');
    process.exit(0);
  }

  const msg = commitMessage();
  log('commit', msg);
  await run('git', ['add', '-A']);
  await run('git', ['commit', '-m', msg]);

  await pushToOrigin();
  log('done', '上游同步完成');
}

main().catch((err) => {
  log('fatal', err instanceof Error ? err.stack ?? err.message : String(err));
  process.exit(1);
});
