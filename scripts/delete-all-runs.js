#!/usr/bin/env node
/**
 * 删除仓库内全部 GitHub Actions 运行记录（含成功/排队/进行中）
 * 用法: PAT=ghp_xxx node scripts/delete-all-runs.js
 */

const OWNER = 'agentai2026';
const REPO = 'openclaw-zh';
const PER_PAGE = 100;
const DELAY_MS = 120;

/** 按状态轮询，确保覆盖 queued / in_progress / completed 等 */
const STATUSES = [
  'queued',
  'in_progress',
  'waiting',
  'pending',
  'requested',
  'failure',
  'cancelled',
  'skipped',
  'success',
  'completed',
  'neutral',
  'stale',
  'timed_out',
  'action_required',
];

const token = process.env.PAT || process.env.GITHUB_TOKEN;
if (!token) {
  console.error('[error] 请设置 PAT 或 GITHUB_TOKEN（需 repo 权限）');
  process.exit(1);
}

function log(msg) {
  console.log(`[delete-all] ${msg}`);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function api(path, method = 'GET', body) {
  const res = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (method === 'DELETE' && (res.status === 204 || res.status === 200)) {
    return null;
  }
  if (method === 'POST' && res.status === 202) {
    return null;
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${method} ${path} -> ${res.status}: ${text}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

async function listRuns(status) {
  const q = new URLSearchParams({ per_page: String(PER_PAGE), page: '1' });
  if (status) q.set('status', status);
  const data = await api(`/repos/${OWNER}/${REPO}/actions/runs?${q}`);
  return data.workflow_runs ?? [];
}

async function cancelRun(runId) {
  try {
    await api(`/repos/${OWNER}/${REPO}/actions/runs/${runId}/cancel`, 'POST');
  } catch {
    /* 已结束或无法取消则忽略 */
  }
}

async function deleteRun(runId) {
  await api(`/repos/${OWNER}/${REPO}/actions/runs/${runId}`, 'DELETE');
}

async function purgeStatus(status) {
  let deleted = 0;
  const label = status ?? 'all';
  while (true) {
    const runs = await listRuns(status);
    if (runs.length === 0) break;
    for (const run of runs) {
      try {
        if (['queued', 'in_progress', 'waiting', 'pending', 'requested'].includes(run.status)) {
          await cancelRun(run.id);
          await sleep(80);
        }
        await deleteRun(run.id);
        deleted += 1;
        log(`[${label}] #${run.run_number} ${run.name ?? run.display_title} id=${run.id}`);
        await sleep(DELAY_MS);
      } catch (err) {
        log(`跳过 id=${run.id}: ${err instanceof Error ? err.message : err}`);
      }
    }
  }
  return deleted;
}

async function main() {
  log(`开始删除 ${OWNER}/${REPO} 的全部 Actions 记录...`);
  let total = 0;

  total += await purgeStatus(undefined);

  for (const status of STATUSES) {
    total += await purgeStatus(status);
  }

  log(`完成，共删除 ${total} 条`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
