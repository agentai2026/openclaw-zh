#!/usr/bin/env node
/**
 * 检查 PAT 是否具备删除 Actions 记录的权限
 */
const OWNER = 'agentai2026';
const REPO = 'openclaw-zh';
const token = process.env.PAT;

if (!token) {
  console.error('::error::未设置 PAT');
  process.exit(1);
}

async function main() {
  const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/actions/runs?per_page=1`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  const scopes = res.headers.get('x-oauth-scopes') ?? '(fine-grained 无此头)';
  const loginRes = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const user = loginRes.ok ? await loginRes.json() : { login: 'unknown' };

  console.log(`[verify] 当前 Token 用户: ${user.login}`);
  console.log(`[verify] OAuth scopes: ${scopes}`);

  if (!res.ok) {
    console.error(`::error::无法读取 Actions: ${res.status}`);
    process.exit(1);
  }

  const data = await res.json();
  const run = data.workflow_runs?.[0];
  if (!run) {
    console.log('[verify] 没有运行记录，无需删除权限检查');
    return;
  }

  const del = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/actions/runs/${run.id}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    },
  );

  if (del.status === 204) {
    console.log(`[verify] 删除权限 OK（已删除探针记录 #${run.run_number}）`);
    return;
  }

  const body = await del.text();
  console.error(`::error::删除探针失败 HTTP ${del.status}: ${body}`);
  console.error('');
  console.error('请用仓库所有者 agentai2026 重新生成 Classic PAT：');
  console.error('  https://github.com/settings/tokens/new');
  console.error('  勾选: repo（完整仓库权限）');
  console.error('  勾选: workflow');
  console.error('  然后在 openclaw-zh → Settings → Secrets → Actions 更新 PAT');
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
