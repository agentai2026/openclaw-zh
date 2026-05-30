#!/usr/bin/env node
/**
 * bump-version.js
 * 汉化版版本号跟随官方：
 * - 官方版本 + `-zh`（例: 2026.5.30 -> 2026.5.30-zh）
 * - 官方未变但汉化有更新: 2026.5.30-zh.20260529
 *
 * 读取上游 package.json 的 version，写入本仓库受保护的 package.json
 */

import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const ZH_PACKAGE = 'package.json';

/**
 * @param {string} step
 * @param {string} detail
 */
function log(step, detail) {
  console.log(`[${step}] 状态：${detail}`);
}

/**
 * @param {string} path
 * @returns {Promise<{ version?: string } & Record<string, unknown>>}
 */
async function readJson(path) {
  const raw = await readFile(path, 'utf8');
  return JSON.parse(raw);
}

/**
 * @param {string} path
 * @param {object} data
 */
async function writeJson(path, data) {
  await writeFile(path, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

/**
 * 从版本字符串解析官方基础版本（去掉 -zh 后缀）
 * @param {string} ver
 */
function parseOfficialBase(ver) {
  const m = String(ver).match(/^(.+?)(-zh(?:\.\d{8})?)?$/);
  return m ? m[1] : ver;
}

/**
 * 今日日期后缀 YYYYMMDD
 */
function dateSuffix() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

/**
 * 检测 i18n / patches 是否有未提交变更或相对上次提交有 diff
 */
async function hasI18nChanges() {
  try {
    const { stdout } = await execFileAsync(
      'git',
      ['diff', '--name-only', 'HEAD', '--', 'i18n/', 'patches/'],
      { encoding: 'utf8' },
    );
    if (stdout.trim()) {
      return true;
    }
    const { stdout: unstaged } = await execFileAsync(
      'git',
      ['diff', '--name-only', '--', 'i18n/', 'patches/'],
      { encoding: 'utf8' },
    );
    return unstaged.trim().length > 0;
  } catch {
    return process.env.FORCE_DATE_SUFFIX === '1';
  }
}

/**
 * 从 upstream/main 的 package.json 读取官方 version（合并后本地 package.json 已被汉化版覆盖）
 */
async function getUpstreamVersion() {
  const gitRefs = ['upstream/main:package.json'];

  for (const ref of gitRefs) {
    try {
      const { stdout } = await execFileAsync('git', ['show', ref], { encoding: 'utf8' });
      const pkg = JSON.parse(stdout);
      if (pkg.version) {
        return String(pkg.version);
      }
    } catch {
      // 尝试下一个 ref
    }
  }

  if (process.env.UPSTREAM_VERSION) {
    return process.env.UPSTREAM_VERSION;
  }

  throw new Error(
    '无法确定上游官方版本。请先 git fetch upstream，或设置环境变量 UPSTREAM_VERSION',
  );
}

async function main() {
  log('init', '开始计算汉化版版本号');

  if (!existsSync(ZH_PACKAGE)) {
    log('error', `缺少 ${ZH_PACKAGE}`);
    process.exit(1);
  }

  const zhPkg = await readJson(ZH_PACKAGE);
  const currentVersion = String(zhPkg.version ?? '0.0.0');
  const currentBase = parseOfficialBase(currentVersion);

  let officialVersion;
  try {
    officialVersion = await getUpstreamVersion();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log('upstream', `警告: ${msg}，使用环境变量 UPSTREAM_VERSION`);
    officialVersion = process.env.UPSTREAM_VERSION;
    if (!officialVersion) {
      process.exit(1);
    }
  }

  log('upstream', `官方版本: ${officialVersion}`);
  log('current', `当前汉化版版本: ${currentVersion}`);

  let nextVersion;
  const baseZh = `${officialVersion}-zh`;

  if (officialVersion !== currentBase) {
    nextVersion = baseZh;
    log('rule', '官方版本已变化，使用 base-zh');
  } else if (await hasI18nChanges()) {
    nextVersion = `${baseZh}.${dateSuffix()}`;
    log('rule', '官方未变但汉化词条有变更，追加日期后缀');
  } else if (process.env.FORCE_DATE_SUFFIX === '1') {
    nextVersion = `${baseZh}.${dateSuffix()}`;
    log('rule', 'FORCE_DATE_SUFFIX=1，强制日期后缀');
  } else {
    nextVersion = currentVersion.startsWith(baseZh) ? currentVersion : baseZh;
    log('rule', '版本保持不变');
  }

  if (nextVersion === currentVersion) {
    log('done', `无需更新，仍为 ${currentVersion}`);
    return;
  }

  zhPkg.version = nextVersion;
  await writeJson(ZH_PACKAGE, zhPkg);
  log('done', `版本已更新: ${currentVersion} -> ${nextVersion}`);

  if (process.env.GITHUB_OUTPUT) {
    const { appendFile } = await import('node:fs/promises');
    await appendFile(
      process.env.GITHUB_OUTPUT,
      `version=${nextVersion}\nofficial_version=${officialVersion}\n`,
    );
  }
}

main().catch((err) => {
  log('fatal', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
