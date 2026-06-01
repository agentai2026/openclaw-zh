#!/usr/bin/env node
/**
 * CI：每小时从官方 latest 往前补一个尚未发布的旧版汉化包
 */
import { readFileSync, existsSync, appendFileSync } from 'node:fs';
import {
  isOpenclawCalverVersion,
  sortVersionsDesc,
  publishedUpstreamBases,
  pickNextBackfillVersion,
  fetchNpmVersions,
} from './npm-version-utils.mjs';

const NPM_PACKAGE = process.env.NPM_PACKAGE || '@agentai2027/openclaw-zh';
const OFFICIAL_PACKAGE = process.env.OFFICIAL_PACKAGE || 'openclaw';
const FORCE = process.env.FORCE === 'true';
const NPM_COOLDOWN_MS = Number(process.env.NPM_COOLDOWN_MS || 24 * 60 * 60 * 1000);

function readJson(path, fallback = null) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, 'utf8'));
}

function out(k, v) {
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `${k}=${v}\n`);
  }
  console.log(`[backfill-check] ${k}=${v}`);
}

async function npmPackageState() {
  const url = `https://registry.npmjs.org/${NPM_PACKAGE.replace('/', '%2f')}`;
  const res = await fetch(url);
  const text = await res.text();

  if (res.ok) {
    try {
      const json = JSON.parse(text);
      const unpub = json.time?.unpublished;
      if (unpub) {
        const at = typeof unpub === 'string' ? unpub : unpub.time;
        if (at) return { state: 'unpublished', unpublishedAt: new Date(at) };
      }
      return { state: 'ok' };
    } catch {
      return { state: 'ok' };
    }
  }

  const m = text.match(/Unpublished on ([0-9TZ.:+-]+)/i);
  if (m) return { state: 'unpublished', unpublishedAt: new Date(m[1]) };
  return { state: 'missing' };
}

function inCooldown(unpublishedAt) {
  const retryAfter = new Date(unpublishedAt.getTime() + NPM_COOLDOWN_MS);
  return { inCooldown: Date.now() < retryAfter.getTime(), retryAfter };
}

function backfillEnabled() {
  const policy = readJson('.github/release-policy.json', null);
  if (policy && policy.backfill_legacy === false) {
    console.log('[backfill-check] release-policy: backfill_legacy=false，跳过');
    return false;
  }
  return true;
}

async function main() {
  if (!backfillEnabled()) {
    out('need_build', 'false');
    out('backfill_complete', 'true');
    out('upstream_version', '');
    return;
  }

  const pending = readJson('.github/publish-pending.json', null);
  const pendingBackfill =
    pending?.status === 'pending' &&
    (pending.kind === 'backfill' || pending.reason === 'backfill_legacy');
  // 忽略「跟新包 / 汉化同步」的 pending，避免误重试别的任务
  const foreignPending =
    pending?.status === 'pending' &&
    pending.kind &&
    pending.kind !== 'backfill';
  const pending_ready =
    pendingBackfill &&
    (!pending.retry_after || Date.now() >= new Date(pending.retry_after).getTime());

  let officialAll = await fetchNpmVersions(OFFICIAL_PACKAGE);
  officialAll = officialAll.filter(isOpenclawCalverVersion);
  const officialSorted = sortVersionsDesc(officialAll);

  if (officialSorted.length === 0) {
    console.error('::error::无法获取官方 openclaw 版本列表');
    process.exit(1);
  }

  const latest = officialSorted[0];
  const earliest = officialSorted[officialSorted.length - 1];

  out('official_latest', latest);
  out('official_earliest', earliest);
  out('official_version_count', String(officialSorted.length));

  let zhAll = [];
  try {
    zhAll = await fetchNpmVersions(NPM_PACKAGE);
  } catch {
    zhAll = [];
  }
  const publishedBases = publishedUpstreamBases(zhAll);
  out('zh_published_count', String(publishedBases.size));

  let target = pickNextBackfillVersion(officialSorted, publishedBases);

  if (FORCE && !target && officialSorted.length > 1) {
    target = officialSorted[1];
    console.log('[backfill-check] FORCE：无缺口时仍尝试 index 1');
  }

  if (foreignPending) {
    console.log(`[backfill-check] 存在其他任务的 publish-pending（kind=${pending.kind}），本次跳过`);
    out('backfill_complete', 'false');
    out('need_build', 'false');
    out('need_publish', 'false');
    out('wait_cooldown', 'false');
    out('upstream_version', '');
    return;
  }

  if (pending_ready && pending.upstream_version) {
    target = pending.upstream_version;
    console.log(`[backfill-check] 重试待发布版本 ${target}`);
  }

  if (!target) {
    console.log(
      `::notice::回填已完成：官方稳定版 ${earliest}～${latest} 均已有对应汉化包（共 ${publishedBases.size} 个基线版本）`,
    );
    out('backfill_complete', 'true');
    out('need_build', 'false');
    out('need_publish', 'false');
    out('wait_cooldown', 'false');
    out('upstream_version', '');
    return;
  }

  out('backfill_complete', 'false');
  out('upstream_version', target);

  const npm = await npmPackageState();
  let in_npm_cooldown = false;
  let npm_retry_after = '';
  if (npm.state === 'unpublished' && npm.unpublishedAt) {
    const cd = inCooldown(npm.unpublishedAt);
    if (cd.inCooldown) {
      in_npm_cooldown = true;
      npm_retry_after = cd.retryAfter.toISOString();
      console.log(`::warning::npm 冷却中，${npm_retry_after} 后再试`);
    }
  }

  const need_build = !in_npm_cooldown;
  const wait_cooldown = in_npm_cooldown;

  out('in_npm_cooldown', in_npm_cooldown ? 'true' : 'false');
  out('npm_retry_after', npm_retry_after);
  out('need_build', need_build ? 'true' : 'false');
  out('need_publish', need_build ? 'true' : 'false');
  out('wait_cooldown', wait_cooldown ? 'true' : 'false');

  console.log(
    `[backfill-check] 本小时目标：官方 ${target}（latest=${latest}，最早=${earliest}）`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
