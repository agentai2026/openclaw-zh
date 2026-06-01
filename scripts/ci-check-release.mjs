#!/usr/bin/env node
/**
 * CI：判断本次是否构建/发布（含上游变更与 npm 发布失败后的每小时重试）
 */
import { readFileSync, existsSync } from 'node:fs';
import { appendFileSync } from 'node:fs';

const NPM_PACKAGE = process.env.NPM_PACKAGE || '@agentai2027/openclaw-zh';
const UPSTREAM_REPO = process.env.UPSTREAM_REPO || 'openclaw/openclaw';
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
  console.log(`[check] ${k}=${v}`);
}

async function fetchUpstream() {
  const verRes = await fetch('https://registry.npmjs.org/openclaw/latest');
  const verJson = await verRes.json();
  const upstream_version = verJson.version;

  const shaRes = await fetch(`https://api.github.com/repos/${UPSTREAM_REPO}/commits/main`);
  const shaJson = await shaRes.json();
  const upstream_sha = shaJson.sha.slice(0, 7);

  return { upstream_version, upstream_sha };
}

/** @returns {{ state: 'ok'|'missing'|'unpublished', unpublishedAt?: Date }} */
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

function cooldownFromPending(pending) {
  if (!pending?.retry_after) return null;
  const retryAfter = new Date(pending.retry_after);
  if (Number.isNaN(retryAfter.getTime())) return null;
  if (Date.now() >= retryAfter.getTime()) return null;
  return { inCooldown: true, retryAfter };
}

function inCooldown(unpublishedAt) {
  const retryAfter = new Date(unpublishedAt.getTime() + NPM_COOLDOWN_MS);
  return { inCooldown: Date.now() < retryAfter.getTime(), retryAfter };
}

function followUpstreamEnabled() {
  const policy = readJson('.github/release-policy.json', null);
  if (policy && policy.follow_upstream === false) {
    console.log('[check] release-policy: follow_upstream=false，跳过自动跟官方');
    return false;
  }
  return true;
}

async function main() {
  if (!followUpstreamEnabled()) {
    const { upstream_version, upstream_sha } = await fetchUpstream();
    out('upstream_version', upstream_version);
    out('upstream_sha', upstream_sha);
    out('has_upstream_changes', 'false');
    out('in_npm_cooldown', 'false');
    out('npm_retry_after', '');
    out('publish_pending', 'false');
    out('need_build', 'false');
    out('need_publish', 'false');
    out('wait_cooldown', 'false');
    return;
  }

  const { upstream_version, upstream_sha } = await fetchUpstream();
  const lastBuild = readJson('.github/last-build.json', {});
  const pending = readJson('.github/publish-pending.json', null);

  const lastSha = lastBuild.upstream_sha || '';
  const lastVer = lastBuild.upstream_version || '';
  const has_upstream_changes =
    FORCE ||
    upstream_sha !== lastSha ||
    upstream_version !== lastVer;

  const npm = await npmPackageState();
  let in_npm_cooldown = 'false';
  let npm_retry_after = '';
  if (npm.state === 'unpublished' && npm.unpublishedAt) {
    const cd = inCooldown(npm.unpublishedAt);
    if (cd.inCooldown) {
      in_npm_cooldown = 'true';
      npm_retry_after = cd.retryAfter.toISOString();
      console.log(
        `::warning::npm 整包已下架（${npm.unpublishedAt.toISOString()}），${cd.retryAfter.toISOString()} 前无法 npm install；本次将跳过构建`,
      );
    }
  } else if (pending) {
    const cd = cooldownFromPending(pending);
    if (cd) {
      in_npm_cooldown = 'true';
      npm_retry_after = cd.retryAfter.toISOString();
      console.log(
        `::warning::publish-pending 记录冷却中，${cd.retryAfter.toISOString()} 后再构建发布`,
      );
    }
  }

  const publish_pending = pending?.status === 'pending' ? 'true' : 'false';
  const pending_ready =
    publish_pending === 'true' &&
    (!pending.retry_after || Date.now() >= new Date(pending.retry_after).getTime());

  const want_release =
    has_upstream_changes ||
    (publish_pending === 'true' && pending_ready);

  const need_build = in_npm_cooldown === 'false' && want_release;
  const need_publish = need_build;

  // npm 删包 24h 冷却：每小时只检查，不跑完整构建
  const wait_cooldown =
    in_npm_cooldown === 'true' && (publish_pending === 'true' || has_upstream_changes);

  out('upstream_version', upstream_version);
  out('upstream_sha', upstream_sha);
  out('has_upstream_changes', has_upstream_changes ? 'true' : 'false');
  out('in_npm_cooldown', in_npm_cooldown);
  out('npm_retry_after', npm_retry_after);
  out('publish_pending', publish_pending);
  out('need_build', need_build ? 'true' : 'false');
  out('need_publish', need_publish ? 'true' : 'false');
  out('wait_cooldown', wait_cooldown ? 'true' : 'false');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
