#!/usr/bin/env node
/**
 * 批量删除 GitHub Actions 失败/取消/跳过的运行记录
 * 用法: PAT=ghp_xxx node scripts/delete-failed-runs.js
 */

const OWNER = 'agentai2026';
const REPO = 'openclaw-zh';
const STATUSES = ['failure', 'cancelled', 'skipped'];
/** 额外清空这些工作流下的失败记录（含 Dependabot 内置工作流） */
const EXTRA_WORKFLOW_NAMES = ['Dependabot Updates'];
const PER_PAGE = 100;
const DELAY_MS = 150;

const token = (process.env.PAT || '').trim();
const CURRENT_RUN_ID = process.env.GITHUB_RUN_ID
  ? Number(process.env.GITHUB_RUN_ID)
  : null;
if (!token) {
  console.error('[error] 请设置环境变量 PAT（Classic：repo + workflow）');
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
  if (method === 'DELETE' && (res.status === 204 || res.status === 200)) {
    return null;
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${method} ${path} -> ${res.status}: ${text}`);
  }
  return res.json();
}

async function listRunsByStatus(status) {
  const q = new URLSearchParams({ status, per_page: String(PER_PAGE), page: '1' });
  const data = await api(`/repos/${OWNER}/${REPO}/actions/runs?${q}`);
  return data.workflow_runs ?? [];
}

async function listWorkflowRuns(workflowId, status) {
  const q = new URLSearchParams({ status, per_page: String(PER_PAGE), page: '1' });
  const data = await api(
    `/repos/${OWNER}/${REPO}/actions/workflows/${workflowId}/runs?${q}`,
  );
  return data.workflow_runs ?? [];
}

async function deleteRun(runId) {
  await api(`/repos/${OWNER}/${REPO}/actions/runs/${runId}`, 'DELETE');
}

/** 始终只拉第 1 页，删完一条后面会顶上来，直到为空 */
async function purgeByFetcher(fetcher, label) {
  let deleted = 0;
  while (true) {
    const runs = await fetcher();
    if (runs.length === 0) {
      break;
    }
    for (const run of runs) {
      if (CURRENT_RUN_ID && run.id === CURRENT_RUN_ID) continue;
      try {
        await deleteRun(run.id);
        deleted += 1;
        log(`已删除 [${label}] #${run.run_number} ${run.display_title ?? run.name} id=${run.id}`);
        await sleep(DELAY_MS);
      } catch (err) {
        log(`跳过 id=${run.id}: ${err instanceof Error ? err.message : err}`);
      }
    }
  }
  return deleted;
}

async function purgeGlobalStatus(status) {
  return purgeByFetcher(() => listRunsByStatus(status), `global:${status}`);
}

async function listAllWorkflows() {
  const data = await api(`/repos/${OWNER}/${REPO}/actions/workflows?per_page=100`);
  return data.workflows ?? [];
}

async function purgeNamedWorkflows() {
  const workflows = await listAllWorkflows();
  let deleted = 0;
  for (const name of EXTRA_WORKFLOW_NAMES) {
    const wf = workflows.find((w) => w.name === name || w.path.includes('dependabot'));
    if (!wf) {
      log(`未找到工作流: ${name}`);
      continue;
    }
    log(`清理工作流「${wf.name}」id=${wf.id}`);
    for (const status of STATUSES) {
      deleted += await purgeByFetcher(
        () => listWorkflowRuns(wf.id, status),
        `${wf.name}:${status}`,
      );
    }
  }
  return deleted;
}

async function main() {
  log(`开始清理 ${OWNER}/${REPO} ...`);
  let total = 0;
  for (const status of STATUSES) {
    log(`全仓库 status=${status}`);
    total += await purgeGlobalStatus(status);
  }
  total += await purgeNamedWorkflows();
  log(`完成，共删除 ${total} 条记录`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
