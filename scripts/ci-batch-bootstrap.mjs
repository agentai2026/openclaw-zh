#!/usr/bin/env node
/**
 * 在 CI 中按顺序触发「指定版本汉化」工作流，完成 npm 首发 20 版。
 * 需要 GH_TOKEN（workflow 内默认 github.token）与 gh CLI。
 */
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const REPO = process.env.GITHUB_REPOSITORY;
const WORKFLOW_FILE = 'build-version.yml';
const TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
const PUBLISH_NPM = process.env.PUBLISH_NPM !== 'false';
const PUBLISH_DOCKER = process.env.PUBLISH_DOCKER === 'true';
const RELEASE_NOTE = process.env.RELEASE_NOTE || 'npm 首发批量汉化（20 版之一）';
const VERSIONS_PATH =
  process.env.BOOTSTRAP_VERSIONS_FILE || '.github/bootstrap-versions.json';
const POLICY_PATH = '.github/release-policy.json';
const NPM_PACKAGE = process.env.NPM_PACKAGE || '@agentai2027/openclaw-zh';

function sh(cmd) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}

function gh(args) {
  return sh(`gh ${args}`);
}

function readJson(path, fallback = {}) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, 'utf8'));
}

async function npmPublishedVersions() {
  const url = `https://registry.npmjs.org/${NPM_PACKAGE.replace('/', '%2f')}`;
  const res = await fetch(url);
  if (!res.ok) return new Set();
  const json = await res.json();
  return new Set(Object.keys(json.versions || {}));
}

function waitForRun(runId) {
  console.log(`[batch] 等待 workflow run ${runId} …`);
  gh(`run watch ${runId} --repo ${REPO} --exit-status`);
}

function triggerVersion(version) {
  const note = RELEASE_NOTE.replace(/"/g, "'");
  gh(
    `workflow run ${WORKFLOW_FILE} --repo ${REPO} ` +
      `-f upstream_version=${version} ` +
      `-f publish_npm=${PUBLISH_NPM} ` +
      `-f publish_docker=${PUBLISH_DOCKER} ` +
      `-f force_revision=false ` +
      `-f release_note="${note}"`,
  );
  console.log(`[batch] 已触发 ${version}，等待 run 出现…`);
  execSync('sleep 25');
  const runs = JSON.parse(
    gh(
      `run list --repo ${REPO} --workflow=${WORKFLOW_FILE} --limit 3 --json databaseId,status,conclusion`,
    ),
  );
  const runId = runs[0]?.databaseId;
  if (!runId) throw new Error(`无法获取 ${version} 的 run id`);
  waitForRun(runId);
}

function markBootstrapComplete(publishedZh) {
  const policy = readJson(POLICY_PATH);
  policy.follow_upstream = false;
  policy.bootstrap_completed_at = new Date().toISOString();
  policy.bootstrap_published_count = publishedZh.length;
  writeFileSync(POLICY_PATH, JSON.stringify(policy, null, 2) + '\n');
  console.log('[batch] 已写入 release-policy.json：follow_upstream=false');
}

async function main() {
  if (!TOKEN) {
    console.error('缺少 GH_TOKEN / GITHUB_TOKEN');
    process.exit(1);
  }
  process.env.GH_TOKEN = TOKEN;

  const cfg = readJson(VERSIONS_PATH);
  const versions = cfg.versions || [];
  if (!versions.length) {
    console.error('bootstrap-versions.json 无 versions');
    process.exit(1);
  }

  const published = await npmPublishedVersions();
  const todo = versions.filter((v) => {
    const zh = `${v}-zh`;
    return !published.has(zh) && !published.has(v);
  });

  console.log(
    `[batch] 共 ${versions.length} 个目标，npm 已有 ${published.size} 个版本，待构建 ${todo.length} 个`,
  );

  let ok = 0;
  for (const version of todo) {
    try {
      triggerVersion(version);
      ok++;
    } catch (e) {
      console.error(`[batch] ${version} 失败:`, e.message || e);
      process.exit(1);
    }
  }

  if (todo.length === 0) {
    console.log('[batch] 全部目标版本已在 npm，跳过构建');
  }

  markBootstrapComplete(
    versions.map((v) => `${v}-zh`),
  );
  console.log(`[batch] 完成。成功触发/完成 ${ok} 个新版本构建。`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
