#!/usr/bin/env node
/**
 * CI：按官方版本号检出 openclaw 上游（优先 git tag v{version}，与 npm 版本对齐）
 */
import { execSync } from 'node:child_process';
import { readFileSync, existsSync, rmSync } from 'node:fs';
import { appendFileSync } from 'node:fs';

const version = (process.env.UPSTREAM_VERSION || '').trim();
const target = process.env.OPENCLAW_TARGET || 'openclaw';
const repo = process.env.UPSTREAM_REPO || 'openclaw/openclaw';
const remote = `https://github.com/${repo}.git`;

function run(cmd, opts = {}) {
  console.log(`> ${cmd}`);
  return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], ...opts }).trim();
}

function tryFetchTag(tag) {
  try {
    run(`git fetch --depth 1 origin tag "${tag}"`, { cwd: target });
    run('git checkout FETCH_HEAD', { cwd: target });
    return true;
  } catch {
    return false;
  }
}

function out(k, v) {
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `${k}=${v}\n`);
  }
  console.log(`[clone] ${k}=${v}`);
}

async function main() {
  if (!version) {
    console.error('::error::请设置 UPSTREAM_VERSION（例如 2026.5.28）');
    process.exit(1);
  }

  let npmVer;
  try {
    npmVer = run(`npm view openclaw@${version} version`);
  } catch (e) {
    const msg = `${e.stderr || ''}${e.stdout || ''}${e.message}`;
    console.error(`::error::npm 上不存在 openclaw@${version}\n${msg}`);
    process.exit(1);
  }
  if (npmVer !== version) {
    console.log(`[clone] npm 解析版本 ${npmVer}（请求 ${version}）`);
  }

  if (existsSync(target)) {
    rmSync(target, { recursive: true, force: true });
  }

  run(`git init ${target}`);
  run(`git remote add origin ${remote}`, { cwd: target });

  const tagCandidates = [`v${version}`, version, `v${npmVer}`];
  let ok = false;
  for (const tag of [...new Set(tagCandidates)]) {
    console.log(`[clone] 尝试 tag ${tag}`);
    if (tryFetchTag(tag)) {
      ok = true;
      console.log(`[clone] 已检出 tag ${tag}`);
      break;
    }
  }

  if (!ok) {
    console.error(
      `::error::GitHub 上未找到对应 tag（已尝试 ${tagCandidates.join(', ')}）。请确认该版本已在 ${repo} 打 tag。`,
    );
    process.exit(1);
  }

  const pkgPath = `${target}/package.json`;
  if (!existsSync(pkgPath)) {
    console.error('::error::检出后缺少 package.json');
    process.exit(1);
  }

  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  const sha = run('git rev-parse --short HEAD', { cwd: target });
  out('upstream_sha', sha);

  if (pkg.version !== version && pkg.version !== npmVer) {
    console.log(
      `::warning::检出后 package.json 版本为 ${pkg.version}，与输入 ${version} 不一致（继续按输入版本 bump）`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
