#!/usr/bin/env node
/**
 * 检查 PAT 是否具备删除 Actions 记录的权限
 * 注意：不能删除「当前正在跑的这条」或排队中的记录，否则会 401/403
 */
const OWNER = 'agentai2026';
const REPO = 'openclaw-zh';
const token = (process.env.PAT || '').trim();

const CURRENT_RUN_ID = process.env.GITHUB_RUN_ID
  ? Number(process.env.GITHUB_RUN_ID)
  : null;
const ACTIVE = new Set(['queued', 'in_progress', 'waiting', 'pending', 'requested']);

if (!token) {
  console.error('::error::未设置 PAT');
  process.exit(1);
}

function headers() {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

async function main() {
  const loginRes = await fetch('https://api.github.com/user', { headers: headers() });
  const user = loginRes.ok ? await loginRes.json() : { login: 'unknown' };
  console.log(`[verify] 当前 Token 用户: ${user.login}`);
  if (!loginRes.ok) {
    console.error(`::error::Token 无效 (${loginRes.status})，请更新 Secret PAT`);
    process.exit(1);
  }

  const res = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/actions/runs?per_page=30`,
    { headers: headers() },
  );
  console.log(`[verify] OAuth scopes: ${res.headers.get('x-oauth-scopes') ?? '(fine-grained)'}`);

  if (!res.ok) {
    console.error(`::error::无法读取 Actions: ${res.status}`);
    process.exit(1);
  }

  const runs = (await res.json()).workflow_runs ?? [];
  if (runs.length === 0) {
    console.log('[verify] 没有运行记录');
    return;
  }

  const toTry = runs.filter((r) => {
    if (CURRENT_RUN_ID && r.id === CURRENT_RUN_ID) return false;
    if (ACTIVE.has(r.status)) return false;
    return true;
  });

  if (toTry.length === 0) {
    console.log('[verify] 仅有当前/进行中运行，跳过删探针；读取权限正常');
    return;
  }

  for (const run of toTry.slice(0, 5)) {
    const del = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/actions/runs/${run.id}`,
      { method: 'DELETE', headers: headers() },
    );
    if (del.status === 204) {
      console.log(`[verify] 删除权限 OK（探针 #${run.run_number} id=${run.id}）`);
      return;
    }
    const body = await del.text();
    console.log(`[verify] 探针 #${run.run_number} 删除失败 ${del.status}，尝试下一条…`);
    if (del.status === 403) {
      console.error(`::error::403 无权删除: ${body}`);
      process.exit(1);
    }
  }

  console.log('[verify] 暂无可删探针记录，但 PAT 可读取 Actions，继续批量删除');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
