#!/usr/bin/env node
/**
 * CI：老版本回填成功后更新 backfill-state.json（不修改 last-build.json）
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import {
  isOpenclawCalverVersion,
  sortVersionsDesc,
  publishedUpstreamBases,
  pickNextBackfillVersion,
  fetchNpmVersions,
} from './npm-version-utils.mjs';

const upstream_version = process.env.UPSTREAM_VERSION || '';
const built_version = process.env.BUILT_VERSION || '';
const OFFICIAL_PACKAGE = process.env.OFFICIAL_PACKAGE || 'openclaw';
const NPM_PACKAGE = process.env.NPM_PACKAGE || '@agentai2027/openclaw-zh';

async function snapshot() {
  const officialAll = (await fetchNpmVersions(OFFICIAL_PACKAGE)).filter(isOpenclawCalverVersion);
  const officialSorted = sortVersionsDesc(officialAll);
  let zhAll = [];
  try {
    zhAll = await fetchNpmVersions(NPM_PACKAGE);
  } catch {
    zhAll = [];
  }
  const publishedBases = publishedUpstreamBases(zhAll);
  const next = pickNextBackfillVersion(officialSorted, publishedBases);
  return {
    official_latest: officialSorted[0] || '',
    official_earliest: officialSorted[officialSorted.length - 1] || '',
    backfill_complete: !next,
    published_baseline_count: publishedBases.size,
  };
}

async function main() {
  if (!built_version || !upstream_version) {
    console.log('[backfill-state] 无发布版本，跳过');
    return;
  }

  const snap = await snapshot();
  const state = {
    last_backfilled_upstream: upstream_version,
    last_built_version: built_version,
    backfilled_at: new Date().toISOString(),
    official_latest: snap.official_latest,
    official_earliest: snap.official_earliest,
    backfill_complete: snap.backfill_complete,
    published_baseline_count: snap.published_baseline_count,
  };

  writeFileSync('.github/backfill-state.json', `${JSON.stringify(state, null, 2)}\n`, 'utf8');

  const msg = snap.backfill_complete
    ? `ci(backfill): 发布 ${built_version}，老版本回填已全部完成`
    : `ci(backfill): 发布汉化 ${built_version}（官方 ${upstream_version}）`;

  execSync('git config user.name "openclaw-zh-bot"', { stdio: 'inherit' });
  execSync('git config user.email "41898282+github-actions[bot]@users.noreply.github.com"', {
    stdio: 'inherit',
  });
  execSync('git add .github/backfill-state.json', { stdio: 'inherit' });

  if (existsSync('.github/publish-pending.json')) {
    writeFileSync(
      '.github/publish-pending.json',
      `${JSON.stringify({ status: 'done', cleared_at: new Date().toISOString() }, null, 2)}\n`,
    );
    execSync('git add .github/publish-pending.json', { stdio: 'inherit' });
  }

  try {
    execSync(`git commit -m ${JSON.stringify(msg)}`, { stdio: 'inherit' });
    execSync('git push', { stdio: 'inherit' });
    console.log('[backfill-state] 已推送 backfill-state.json');
  } catch {
    console.log('[backfill-state] 无新变更或 push 跳过');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
