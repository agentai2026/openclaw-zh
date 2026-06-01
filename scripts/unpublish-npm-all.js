#!/usr/bin/env node
/**
 * 删除 npm 上 @agentai2027/openclaw-zh 的全部已发布版本
 */
import { execSync } from 'node:child_process';
import { writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const PKG = '@agentai2027/openclaw-zh';
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

function run(cmd, { allowFail = false } = {}) {
  console.log(`[npm] ${cmd}`);
  try {
    execSync(cmd, { stdio: 'inherit', env });
    return true;
  } catch (e) {
    if (!allowFail) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('403') || msg.includes('401') || msg.includes('405')) {
        console.log('[npm] 本条被拒绝（可能超过 72 小时或 npm 策略限制）');
      }
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

function packageExists() {
  try {
    listVersions();
    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (!packageExists()) {
    console.log('[npm] 包已不存在 ✓');
    return;
  }

  let versions = listVersions();
  console.log(`[npm] 当前版本: ${versions.join(', ')}`);

  // 优先整包删除（最快，适合只剩少量旧版）
  if (run(`npm unpublish ${PKG} --force`, { allowFail: true })) {
    if (!packageExists()) {
      console.log('[npm] 整包已删除 ✓');
      return;
    }
  }

  // 逐版本删除
  for (const ver of [...versions].reverse()) {
    run(`npm unpublish ${PKG}@${ver} --force`, { allowFail: true });
    await new Promise((r) => setTimeout(r, 1500));
  }

  run(`npm unpublish ${PKG} --force`, { allowFail: true });

  if (!packageExists()) {
    console.log('[npm] 已全部删除 ✓');
    return;
  }

  versions = listVersions();
  console.log(`[npm] 无法自动删除的版本: ${versions.join(', ')}`);
  console.log('[npm] 尝试标记为废弃…');

  for (const ver of versions) {
    run(
      `npm deprecate ${PKG}@${ver} "此版本已废弃，包即将移除。This package is deprecated."`,
      { allowFail: true },
    );
  }

  if (!packageExists()) {
    console.log('[npm] 已删除 ✓');
    return;
  }

  console.log('');
  console.log('::warning::npm 不允许 API 删除剩余版本（常见于发布超过 72 小时的 1.0.0）');
  console.log('请浏览器登录 npm，手动删除整包：');
  console.log(`  https://www.npmjs.com/package/${PKG.replace('/', '%2F')}`);
  console.log('  → Package settings → Delete package（或 Unpublish）');
  console.log('');

  // 不标红失败：大部分已删，只剩需手动的最后一步
  process.exit(0);
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
