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

const token = (process.env.PAT || '').trim();
const CURRENT_RUN_ID = process.env.GITHUB_RUN_ID
  ? Number(process.env.GITHUB_RUN_ID)
  : null;
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

/** 无法删除的记录 id（避免死循环 + 不中断整批） */
const skipIds = new Set();

function isDenied(err) {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes('403') || msg.includes('401');
}

async function purgeStatus(status) {
  let deleted = 0;
  const label = status ?? 'all';
  while (true) {
    const runs = await listRuns(status);
    if (runs.length === 0) break;

    let deletedThisRound = 0;
    for (const run of runs) {
      if (CURRENT_RUN_ID && run.id === CURRENT_RUN_ID) {
        log(`跳过当前运行 id=${run.id}`);
        continue;
      }
      if (skipIds.has(run.id)) continue;

      try {
        if (['queued', 'in_progress', 'waiting', 'pending', 'requested'].includes(run.status)) {
          await cancelRun(run.id);
          await sleep(80);
        }
        await deleteRun(run.id);
        deleted += 1;
        deletedThisRound += 1;
        log(`[${label}] #${run.run_number} ${run.name ?? run.display_title} id=${run.id}`);
        await sleep(DELAY_MS);
      } catch (err) {
        if (isDenied(err)) {
          skipIds.add(run.id);
          log(
            `[${label}] 无法删除 #${run.run_number} id=${run.id}（GitHub 拒绝，已跳过继续）`,
          );
        } else {
          log(`跳过 id=${run.id}: ${err instanceof Error ? err.message : err}`);
        }
      }
    }

    if (deletedThisRound === 0) break;
  }
  return deleted;
}

/** 先删一条探针，403 则立即失败，避免刷几百条无效日志 */
async function probeDeletePermission() {
  const runs = await listRuns(undefined);
  if (runs.length === 0) {
    return { empty: true, probeDeleted: 0 };
  }
  const run = runs.find(
    (r) =>
      !(CURRENT_RUN_ID && r.id === CURRENT_RUN_ID) &&
      !['queued', 'in_progress', 'waiting', 'pending', 'requested'].includes(r.status),
  );
  if (!run) {
    log('仅有当前/进行中运行，跳过探针删除');
    return { empty: false, probeDeleted: 0 };
  }
  try {
    await deleteRun(run.id);
    log(`权限检查通过，已删除探针记录 #${run.run_number} id=${run.id}`);
    return { empty: false, probeDeleted: 1 };
  } catch (err) {
    if (isDenied(err)) skipIds.add(run.id);
    log(`探针删除失败，继续批量删除: ${err instanceof Error ? err.message : err}`);
    return { empty: false, probeDeleted: 0 };
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

  if (skipIds.size > 0) {
    log(`完成：已删除 ${total} 条，GitHub 不允许删除的已跳过 ${skipIds.size} 条（可忽略）`);
  } else {
    log(`完成，共删除 ${total} 条`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
