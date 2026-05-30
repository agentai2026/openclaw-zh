#!/usr/bin/env node
/**
 * 删除 npm 上 @agentai2026/openclaw-zh 的全部已发布版本
 */
import { execSync } from 'node:child_process';
import { writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const PKG = '@agentai2026/openclaw-zh';
const token = (process.env.NPM_TOKEN || '').trim();

if (!token) {
  console.error('::error::未配置 NPM_TOKEN Secret');
  process.exit(1);
}

const npmrc = join(tmpdir(), `.npmrc-unpublish-${Date.now()}`);
writeFileSync(npmrc, `//registry.npmjs.org/:_authToken=${token}\n`, 'utf8');

const env = {
  ...process.env,
  NPM_CONFIG_USERCONFIG: npmrc,
  NPM_TOKEN: token,
  NODE_AUTH_TOKEN: token,
};

function run(cmd) {
  console.log(`[npm] ${cmd}`);
  try {
    execSync(cmd, { stdio: 'inherit', env });
    return true;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('403') || msg.includes('401')) {
      console.error('::error::npm 拒绝删除：请在 npm 令牌中开启 Delete 权限，或使用 Classic Automation 令牌');
    }
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
    console.log('[npm] 包已不存在');
    return;
  }

  console.log(`[npm] 删除 ${PKG} 共 ${versions.length} 个版本`);

  let ok = 0;
  for (const ver of [...versions].reverse()) {
    if (run(`npm unpublish ${PKG}@${ver} --force`)) ok += 1;
  }
  run(`npm unpublish ${PKG} --force`);

  try {
    const left = listVersions();
    console.error(`::error::仍有 ${left.length} 个版本未删掉: ${left.join(', ')}`);
    console.error('请到 https://www.npmjs.com/package/@agentai2026/openclaw-zh 手动下架，或更新 NPM_TOKEN 的 Delete 权限');
    process.exit(1);
  } catch {
    console.log(`[npm] 已全部删除（成功操作 ${ok} 次）`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    try {
      unlinkSync(npmrc);
    } catch {}
  });
