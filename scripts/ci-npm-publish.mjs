#!/usr/bin/env node
/**
 * CI：发布 npm（预检删包冷却、版本已存在、409 冲突）
 * 退出码 0=成功或可下小时重试；1=需人工处理的硬错误
 */
import { readFileSync, writeFileSync, existsSync, appendFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const NPM_PACKAGE = process.env.NPM_PACKAGE || '@agentai2026/openclaw-zh';
const OPENCLAW_DIR = process.env.OPENCLAW_DIR || join(ROOT, 'openclaw');
const NPM_COOLDOWN_MS = Number(process.env.NPM_COOLDOWN_MS || 24 * 60 * 60 * 1000);
const PENDING_PATH = join(ROOT, '.github/publish-pending.json');

function setOutput(k, v) {
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `${k}=${v}\n`);
  }
}

function npmView(args) {
  try {
    return execSync(`npm view ${args} --registry=https://registry.npmjs.org/`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch (e) {
    return { error: true, message: `${e.stderr || ''}${e.stdout || ''}${e.message}` };
  }
}

function npmWhoami() {
  try {
    return execSync('npm whoami --registry=https://registry.npmjs.org/', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
    }).trim();
  } catch (e) {
    return { error: true, message: `${e.stderr || ''}${e.stdout || ''}${e.message}` };
  }
}

function printPublishFailureSummary(reason, detail = '') {
  console.error(`::error::npm 发布未成功 (${reason})`);
  if (detail) console.error(`::error::${detail}`);
}

function writePending(data) {
  writeFileSync(PENDING_PATH, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  console.log('[npm] 已写入 publish-pending.json，下小时定时任务将重试');
}

function clearPending() {
  if (existsSync(PENDING_PATH)) {
    writeFileSync(PENDING_PATH, '{}\n');
  }
}

function parseUnpublished(msg) {
  const m = String(msg).match(/Unpublished on ([0-9TZ.:+-]+)/i);
  return m ? new Date(m[1]) : null;
}

function cooldownInfo(unpublishedAt) {
  const retryAfter = new Date(unpublishedAt.getTime() + NPM_COOLDOWN_MS);
  return { retryAfter, inCooldown: Date.now() < retryAfter.getTime() };
}

async function main() {
  if (!process.env.NODE_AUTH_TOKEN) {
    console.error('::error::未配置 NPM_TOKEN');
    process.exit(1);
  }

  const whoami = npmWhoami();
  if (whoami && typeof whoami === 'object' && whoami.error) {
    printPublishFailureSummary(
      'token_invalid',
      'NPM_TOKEN 无法通过 whoami 校验，请检查 GitHub Secret 是否完整、未过期',
    );
    process.exit(1);
  }
  console.log(`[npm] whoami: ${whoami}`);
  console.log(
    `[npm] 提示: 发布 ${NPM_PACKAGE} 需要 token 对该作用域有 Read and write（Granular 令牌请在 Organizations 授权 agentai2026，或改用 Classic Automation）`,
  );

  const pkgPath = join(OPENCLAW_DIR, 'package.json');
  if (!existsSync(pkgPath)) {
    console.error('::error::缺少 openclaw/package.json');
    process.exit(1);
  }

  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  const VER = pkg.version;
  const upstream_version = process.env.UPSTREAM_VERSION || '';
  const upstream_sha = process.env.UPSTREAM_SHA || '';

  console.log(`[npm] 目标 ${NPM_PACKAGE}@${VER}`);

  // 1) 整包是否存在 / 是否处于删包冷却
  const pkgMeta = npmView(NPM_PACKAGE);
  if (pkgMeta && typeof pkgMeta === 'object' && pkgMeta.error) {
    const unpublishedAt = parseUnpublished(pkgMeta.message);
    if (unpublishedAt) {
      const cd = cooldownInfo(unpublishedAt);
      writePending({
        status: 'pending',
        reason: 'npm_unpublished_cooldown',
        version: VER,
        upstream_version,
        upstream_sha,
        unpublished_at: unpublishedAt.toISOString(),
        retry_after: cd.retryAfter.toISOString(),
        last_attempt_at: new Date().toISOString(),
      });
      if (cd.inCooldown) {
        console.log(
          `::warning::npm 整包已下架，冷却至 ${cd.retryAfter.toISOString()} 后再发布；下小时自动重试`,
        );
        setOutput('npm_published', 'false');
        process.exit(0);
      }
      console.log('[npm] 冷却期已过，尝试重新创建包并发布');
    }
  }

  // 2) 版本是否已存在
  const verMeta = npmView(`${NPM_PACKAGE}@${VER}`);
  if (typeof verMeta === 'string' && verMeta) {
    console.log(`[npm] 版本 ${VER} 已存在，跳过发布`);
    clearPending();
    setOutput('npm_published', 'true');
    process.exit(0);
  }

  // 3) 发布
  let log = '';
  try {
    execSync('npm publish --access public --ignore-scripts --tag nightly', {
      cwd: OPENCLAW_DIR,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
    });
    console.log(`[npm] 发布成功 ${NPM_PACKAGE}@${VER}`);
    clearPending();
    setOutput('npm_published', 'true');
    process.exit(0);
  } catch (e) {
    log = `${e.stderr || ''}${e.stdout || ''}`;
    const tail = log.length > 4000 ? `…\n${log.slice(-4000)}` : log;
    console.log('--- npm publish 输出（末尾）---');
    console.log(tail);
    console.log('--- 结束 ---');
  }

  const lower = log.toLowerCase();
  if (/403|forbidden|not authorized|e403/.test(lower)) {
    printPublishFailureSummary(
      'permission_denied',
      '当前 NPM_TOKEN 可能无权发布 @agentai2026/openclaw-zh：Granular 令牌需对 Organizations「agentai2026」选 Read and write，或登录 agentai2026 账号用 Classic Automation',
    );
    writePending({
      status: 'pending',
      reason: 'npm_permission_denied',
      version: VER,
      upstream_version,
      upstream_sha,
      last_attempt_at: new Date().toISOString(),
      last_error: log.slice(0, 800),
    });
    setOutput('npm_published', 'false');
    process.exit(1);
  }

  if (/epublishconflict|already exists|409|conflict/.test(lower)) {
    const unpublishedAt = parseUnpublished(log) || parseUnpublished(String(npmView(NPM_PACKAGE)?.message || ''));
    if (unpublishedAt || /fully processed|save packument/.test(lower)) {
      const cd = cooldownInfo(unpublishedAt || new Date());
      writePending({
        status: 'pending',
        reason: 'npm_409_after_unpublish',
        version: VER,
        upstream_version,
        upstream_sha,
        unpublished_at: unpublishedAt?.toISOString() || null,
        retry_after: cd.retryAfter.toISOString(),
        last_attempt_at: new Date().toISOString(),
      });
      printPublishFailureSummary(
        'npm_409_after_unpublish',
        `删包后 registry 冲突，约 ${cd.retryAfter.toISOString()} 后再试；或 Actions「指定版本汉化」勾选 force_revision 换新版本号`,
      );
      setOutput('npm_published', 'false');
      process.exit(0);
    }
    console.log(`[npm] 409/冲突但包已存在，视为成功`);
    clearPending();
    setOutput('npm_published', 'true');
    process.exit(0);
  }

  if (/bypass 2fa|two-factor authentication/.test(lower)) {
    console.error('::error::NPM_TOKEN 无效：请使用 Automation 或 Granular + Bypass 2FA');
    process.exit(1);
  }

  writePending({
    status: 'pending',
    reason: 'npm_publish_failed',
    version: VER,
    upstream_version,
    upstream_sha,
    retry_after: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    last_attempt_at: new Date().toISOString(),
    last_error: log.slice(0, 800),
  });
  printPublishFailureSummary('npm_publish_failed', '已写入 publish-pending.json，下小时自动重试');
  setOutput('npm_published', 'false');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
