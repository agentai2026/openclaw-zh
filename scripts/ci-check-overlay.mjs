#!/usr/bin/env node
/**
 * CI：汉化 overlay 有变更且官方版本未变 → 同版本重发（加日期后缀）
 */
import { readFileSync, existsSync, appendFileSync } from 'node:fs';
import { computeOverlayFingerprint } from './overlay-fingerprint.mjs';

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
  console.log(`[overlay-check] ${k}=${v}`);
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

function followUpstreamEnabled() {
  const policy = readJson('.github/release-policy.json', null);
  return !(policy && policy.follow_upstream === false);
}

async function main() {
  const lastBuild = readJson('.github/last-build.json', {});
  const pending = readJson('.github/publish-pending.json', null);
  const overlay_sha = await computeOverlayFingerprint();

  out('overlay_sha', overlay_sha);

  if (!followUpstreamEnabled()) {
    out('need_build', 'false');
    out('need_publish', 'false');
    out('wait_cooldown', 'false');
    out('upstream_version', lastBuild.upstream_version || '');
    out('upstream_sha', lastBuild.upstream_sha || '');
    out('has_overlay_changes', 'false');
    console.log('[overlay-check] follow_upstream=false，跳过');
    return;
  }

  const lastVer = lastBuild.upstream_version || '';
  const lastSha = lastBuild.upstream_sha || '';
  const savedOverlay = lastBuild.overlay_sha || '';

  if (!lastVer) {
    console.log('[overlay-check] 尚无 last-build 记录，跳过');
    out('upstream_version', '');
    out('upstream_sha', '');
    out('has_overlay_changes', 'false');
    out('need_build', 'false');
    out('need_publish', 'false');
    out('wait_cooldown', 'false');
    return;
  }

  const { upstream_version, upstream_sha } = await fetchUpstream();
  out('upstream_version', lastVer);
  out('upstream_sha', lastSha);

  const upstream_version_changed = upstream_version !== lastVer;

  if (upstream_version_changed && !FORCE) {
    console.log(
      `[overlay-check] 官方 npm 版本已更新为 ${upstream_version}，交由「定时发布」处理`,
    );
    out('has_overlay_changes', 'false');
    out('need_build', 'false');
    out('need_publish', 'false');
    out('wait_cooldown', 'false');
    return;
  }

  const has_overlay_changes =
    FORCE || (savedOverlay && savedOverlay !== overlay_sha);

  if (!savedOverlay && !FORCE) {
    console.log(
      '[overlay-check] 尚无 overlay_sha 基线（下次发布成功后会写入），本次跳过',
    );
    out('has_overlay_changes', 'false');
    out('need_build', 'false');
    out('need_publish', 'false');
    out('wait_cooldown', 'false');
    return;
  }

  if (!has_overlay_changes) {
    console.log('[overlay-check] 汉化内容未变更');
    out('has_overlay_changes', 'false');
    out('need_build', 'false');
    out('need_publish', 'false');
    out('wait_cooldown', 'false');
    return;
  }

  out('has_overlay_changes', 'true');

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

  const publish_pending = pending?.status === 'pending' ? true : false;
  const pending_overlay =
    publish_pending &&
    (pending.reason === 'overlay_republish' || pending.kind === 'overlay');
  const pending_ready =
    pending_overlay &&
    (!pending.retry_after || Date.now() >= new Date(pending.retry_after).getTime());

  const want_release = has_overlay_changes || pending_ready;
  const need_build = !in_npm_cooldown && want_release;
  const wait_cooldown = in_npm_cooldown && want_release;

  out('in_npm_cooldown', in_npm_cooldown ? 'true' : 'false');
  out('npm_retry_after', npm_retry_after);
  out('need_build', need_build ? 'true' : 'false');
  out('need_publish', need_build ? 'true' : 'false');
  out('wait_cooldown', wait_cooldown ? 'true' : 'false');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
