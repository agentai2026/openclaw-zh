#!/usr/bin/env node
/**
 * 删除 npm 上 @agentai2026/openclaw-zh 的全部已发布版本
 * 需要: NPM_TOKEN（Granular 需 Delete 权限，或 Classic Automation）
 * 用法: NPM_TOKEN=npm_xxx node scripts/unpublish-npm-all.js
 */
import { execSync } from 'node:child_process';

const PKG = '@agentai2026/openclaw-zh';
const token = (process.env.NPM_TOKEN || '').trim();

if (!token) {
  console.error('[error] 请设置 NPM_TOKEN');
  process.exit(1);
}

const env = {
  ...process.env,
  NPM_TOKEN: token,
  NODE_AUTH_TOKEN: token,
};

function run(cmd) {
  console.log(`[npm] ${cmd}`);
  try {
    execSync(cmd, { stdio: 'inherit', env });
    return true;
  } catch {
    return false;
  }
}

function listVersions() {
  const raw = execSync(`npm view ${PKG} versions --json`, {
    encoding: 'utf8',
    env,
  });
  const parsed = JSON.parse(raw.trim());
  return Array.isArray(parsed) ? parsed : [parsed];
}

async function main() {
  let versions;
  try {
    versions = listVersions();
  } catch {
    console.log('[npm] 包不存在或已无版本');
    return;
  }

  console.log(`[npm] 将删除 ${PKG} 共 ${versions.length} 个版本:`, versions.join(', '));

  for (const ver of [...versions].reverse()) {
    run(`npm unpublish ${PKG}@${ver} --force`);
  }

  run(`npm unpublish ${PKG} --force`);

  try {
    listVersions();
    console.log('[npm] 仍有残留版本，请登录 npm 网站手动处理或检查 token 删除权限');
    process.exit(1);
  } catch {
    console.log('[npm] 已全部删除');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
