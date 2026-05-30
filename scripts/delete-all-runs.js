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

const token = process.env.PAT;
if (!token) {
  console.error(
    '[error] 必须设置环境变量 PAT（仓库所有者 Classic PAT：repo + workflow，或 Fine-grained：Actions Read/Write）',
  );
  console.error('[error] GITHUB_TOKEN 无法删除 Actions 运行记录，会返回 403');
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
        if (is403(err)) {
          console.error('[error] 再次出现 403，请检查 PAT 权限后重试');
          process.exit(1);
        }
        log(`跳过 id=${run.id}: ${err instanceof Error ? err.message : err}`);
      }
    }
  }
  return deleted;
}

function is403(err) {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes('403');
}

/** 先删一条探针，403 则立即失败，避免刷几百条无效日志 */
async function probeDeletePermission() {
  const runs = await listRuns(undefined);
  if (runs.length === 0) {
    return { empty: true, probeDeleted: 0 };
  }
  const run = runs[0];
  try {
    if (['queued', 'in_progress', 'waiting', 'pending', 'requested'].includes(run.status)) {
      await cancelRun(run.id);
      await sleep(80);
    }
    await deleteRun(run.id);
    log(`权限检查通过，已删除探针记录 #${run.run_number} id=${run.id}`);
    return { empty: false, probeDeleted: 1 };
  } catch (err) {
    if (is403(err)) {
      console.error(`
[error] 403 Forbidden — 当前 PAT 无权删除 Actions 记录。

请用【仓库所有者 agentai2026】账号重新生成 Classic PAT：
  - 勾选 repo（完整仓库权限）
  - 勾选 workflow
在 GitHub → openclaw-zh → Settings → Secrets → Actions → 更新 PAT 后重新 Run workflow。
`);
      process.exit(1);
    }
    throw err;
  }
}

async function main() {
  log(`开始删除 ${OWNER}/${REPO} 的全部 Actions 记录...`);
  const probe = await probeDeletePermission();
  if (probe.empty) {
    log('没有可删除的运行记录');
    return;
  }

  let total = probe.probeDeleted;

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
