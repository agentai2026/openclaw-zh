#!/usr/bin/env node
/**
 * 批量删除 GitHub Actions 失败/取消/跳过的运行记录
 * 用法: PAT=ghp_xxx node scripts/delete-failed-runs.js
 * 或:   GITHUB_TOKEN=xxx node scripts/delete-failed-runs.js
 */

const OWNER = 'agentai2026';
const REPO = 'openclaw-zh';
const STATUSES = ['failure', 'cancelled', 'skipped'];
const PER_PAGE = 100;
const DELAY_MS = 200;

const token = process.env.PAT || process.env.GITHUB_TOKEN;
if (!token) {
  console.error('[error] 请设置环境变量 PAT 或 GITHUB_TOKEN');
  process.exit(1);
}

function log(msg) {
  console.log(`[cleanup] ${msg}`);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function api(path, method = 'GET') {
  const res = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (method === 'DELETE' && res.status === 204) {
    return null;
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${method} ${path} -> ${res.status}: ${text}`);
  }
  return res.json();
}

async function listRuns(status, page) {
  const q = new URLSearchParams({ status, per_page: String(PER_PAGE), page: String(page) });
  const data = await api(`/repos/${OWNER}/${REPO}/actions/runs?${q}`);
  return data.workflow_runs ?? [];
}

async function deleteRun(runId) {
  await api(`/repos/${OWNER}/${REPO}/actions/runs/${runId}`, 'DELETE');
}

async function purgeStatus(status) {
  let page = 1;
  let deleted = 0;
  while (true) {
    const runs = await listRuns(status, page);
    if (runs.length === 0) {
      break;
    }
    for (const run of runs) {
      try {
        await deleteRun(run.id);
        deleted += 1;
        log(`已删除 #${run.run_number} ${run.name} (${status}) id=${run.id}`);
        await sleep(DELAY_MS);
      } catch (err) {
        log(`跳过 id=${run.id}: ${err instanceof Error ? err.message : err}`);
      }
    }
    if (runs.length < PER_PAGE) {
      break;
    }
    page += 1;
  }
  return deleted;
}

async function main() {
  log(`开始清理 ${OWNER}/${REPO} 的 Actions 记录...`);
  let total = 0;
  for (const status of STATUSES) {
    log(`处理 status=${status}`);
    total += await purgeStatus(status);
  }
  log(`完成，共删除 ${total} 条记录`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
