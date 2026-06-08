#!/usr/bin/env node
/**
 * 将已构建的 openclaw 目录 + Node 运行时 打成便携目录（供 CI 再压缩为 zip/tar.gz）
 */
import { createHash } from 'node:crypto';
import {
  cpSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  chmodSync,
  existsSync,
  rmSync,
} from 'node:fs';
import { execSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const PLATFORM = process.env.RELEASE_PLATFORM || 'linux-x64';
const VARIANT = process.env.RELEASE_VARIANT || 'zh'; // zh | official
const OPENCLAW_DIR = process.env.OPENCLAW_DIR || join(ROOT, 'openclaw');
const STAGING_ROOT = process.env.STAGING_ROOT || join(ROOT, 'release-staging');
const NODE_MAJOR = process.env.NODE_MAJOR || '22.16.0';

const NODE_DIST = {
  'win-x64': { os: 'win', arch: 'x64', ext: 'zip', nodeDir: 'node-v{ver}-win-x64' },
  'linux-x64': { os: 'linux', arch: 'x64', ext: 'tar.xz', nodeDir: 'node-v{ver}-linux-x64' },
  'linux-arm64': { os: 'linux', arch: 'arm64', ext: 'tar.xz', nodeDir: 'node-v{ver}-linux-arm64' },
  'macos-x64': { os: 'darwin', arch: 'x64', ext: 'tar.xz', nodeDir: 'node-v{ver}-darwin-x64' },
  'macos-arm64': { os: 'darwin', arch: 'arm64', ext: 'tar.xz', nodeDir: 'node-v{ver}-darwin-arm64' },
};

function logStep(msg) {
  console.log(`[package] ${msg}`);
}

function run(cmd, opts = {}) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: 'inherit', ...opts });
}

function sha256File(path) {
  const h = createHash('sha256');
  h.update(readFileSync(path));
  return h.digest('hex');
}

async function downloadNode(distKey) {
  const spec = NODE_DIST[distKey];
  if (!spec) throw new Error(`未知平台 ${distKey}`);
  const base = `node-v${NODE_MAJOR}`;
  const folder = spec.nodeDir.replace('{ver}', NODE_MAJOR);
  const file = `${base}-${spec.os}-${spec.arch}.${spec.ext}`;
  const url = `https://nodejs.org/dist/v${NODE_MAJOR}/${file}`;
  const cache = join(STAGING_ROOT, '.node-cache');
  mkdirSync(cache, { recursive: true });
  const archive = join(cache, file);
  if (!existsSync(archive)) {
    logStep(`下载 Node：${url}`);
    run(`curl -fsSL -o "${archive}" "${url}"`);
    logStep('Node 下载完成');
  } else {
    logStep(`使用缓存 Node：${archive}`);
  }
  const extractDir = join(cache, folder);
  if (existsSync(extractDir)) rmSync(extractDir, { recursive: true, force: true });
  mkdirSync(extractDir, { recursive: true });
  logStep(`解压 Node（${file}）…`);
  if (spec.ext === 'zip') {
    if (process.platform === 'win32') {
      // Node 官方 zip 约 30MB；在 cache 目录内用相对路径，避免 tar 把 D: 当成远程主机
      console.log('[package] 解压 Node zip（Expand-Archive）…');
      run(
        `powershell -NoProfile -Command "Expand-Archive -LiteralPath '${file}' -DestinationPath '.' -Force"`,
        { cwd: cache },
      );
    } else {
      run(`unzip -q "${archive}" -d "${cache}"`);
    }
  } else {
    run(`tar -xJf "${archive}" -C "${cache}"`);
  }
  logStep('Node 解压完成');
  const nodeRoot = join(cache, folder);
  const nodeBin =
    process.platform === 'win32'
      ? join(nodeRoot, 'node.exe')
      : join(nodeRoot, 'bin', 'node');
  if (!existsSync(nodeBin)) {
    throw new Error(`Node 解压后缺少运行时: ${nodeBin}`);
  }
  console.log(`[package] Node 就绪: ${nodeRoot}`);
  return nodeRoot;
}

function pruneProd(openclawDir) {
  // CI 构建阶段已装全量依赖；prune 会重跑 postinstall/prepare 且极慢
  if (process.env.GITHUB_ACTIONS === 'true') {
    logStep('CI 跳过 pnpm prune');
    return;
  }
  try {
    run('pnpm prune --prod', { cwd: openclawDir });
  } catch {
    logStep('pnpm prune 跳过');
  }
}

async function main() {
  const pkg = JSON.parse(readFileSync(join(OPENCLAW_DIR, 'package.json'), 'utf8'));
  const version = pkg.version;
  const upstream = process.env.UPSTREAM_VERSION || version.replace(/-zh.*$/, '');

  const prefix = VARIANT === 'official' ? 'openclaw' : 'openclaw-zh';
  const bundleName = `${prefix}-${PLATFORM}-${version}`;
  const bundleDir = join(STAGING_ROOT, bundleName);

  if (existsSync(bundleDir)) rmSync(bundleDir, { recursive: true, force: true });
  mkdirSync(bundleDir, { recursive: true });

  logStep(`组装 ${bundleName}`);
  pruneProd(OPENCLAW_DIR);

  const nodeSrc = await downloadNode(PLATFORM);
  logStep('复制 Node 运行时到 bundle…');
  cpSync(nodeSrc, join(bundleDir, 'node'), { recursive: true });
  logStep('Node 复制完成');

  const appDir = join(bundleDir, 'app');
  mkdirSync(appDir, { recursive: true });
  logStep('复制 app（含 node_modules，可能需数分钟）…');
  cpSync(OPENCLAW_DIR, appDir, {
    recursive: true,
    filter: (src) => {
      const rel = src.replace(/\\/g, '/');
      if (rel.includes('/.git/')) return false;
      if (rel.includes('/node_modules/.cache')) return false;
      if (/\/\.(github|vscode)\//.test(rel)) return false;
      if (/\/test\//.test(rel) || /\/tests\//.test(rel)) return false;
      if (rel.endsWith('.map')) return false;
      return true;
    },
  });
  logStep('app 复制完成');

  const binDir = join(bundleDir, 'bin');
  mkdirSync(binDir, { recursive: true });
  const portable = join(ROOT, 'deploy', 'portable');
  cpSync(join(portable, 'README-portable.txt'), join(bundleDir, 'README.txt'));

  if (PLATFORM.startsWith('win')) {
    cpSync(join(portable, 'openclaw-gateway.cmd'), join(binDir, 'openclaw-gateway.cmd'));
    cpSync(join(portable, 'openclaw-gateway.ps1'), join(binDir, 'openclaw-gateway.ps1'));
  } else {
    cpSync(join(portable, 'openclaw-gateway.sh'), join(binDir, 'openclaw-gateway.sh'));
    chmodSync(join(binDir, 'openclaw-gateway.sh'), 0o755);
  }

  const manifest = {
    name: bundleName,
    version,
    upstream_version: upstream,
    variant: VARIANT,
    platform: PLATFORM,
    node: NODE_MAJOR,
  };
  writeFileSync(join(bundleDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

  // Windows：先打 .exe（Inno Setup），默认跳过极慢的 Compress-Archive zip
  const buildWinExe = PLATFORM.startsWith('win') && process.env.BUILD_WIN_EXE !== '0';
  const buildWinZip = PLATFORM.startsWith('win') && process.env.BUILD_WIN_ZIP === '1';

  if (buildWinExe) {
    console.log('[package] Windows：开始编译 .exe 安装包…');
    const { spawnSync } = await import('node:child_process');
    const r = spawnSync(process.execPath, ['scripts/build-win-installer.mjs'], {
      stdio: 'inherit',
      env: { ...process.env, BUNDLE_DIR: bundleDir, STAGING_ROOT, RELEASE_VARIANT: VARIANT },
    });
    if (r.status !== 0) process.exit(r.status || 1);
    console.log('[package] Windows：.exe 完成');
  }

  let archivePath = '';
  let sha256 = '';

  if (!PLATFORM.startsWith('win') || buildWinZip) {
    const outExt = PLATFORM.startsWith('win') ? 'zip' : 'tar.gz';
    archivePath = join(STAGING_ROOT, `${bundleName}.${outExt}`);
    if (existsSync(archivePath)) rmSync(archivePath, { force: true });

    console.log(`[package] 开始压缩 ${outExt}（目录较大，请耐心等待）…`);
    if (outExt === 'zip') {
      // 在 bundle 目录内用相对路径打 zip，避免 GNU tar 解析 D:\ 失败
      const zipName = `${bundleName}.zip`;
      run(`tar.exe -a -cf "../${zipName}" .`, { cwd: bundleDir });
    } else {
      run(`tar -czf "${archivePath}" -C "${STAGING_ROOT}" "${bundleName}"`);
    }

    sha256 = sha256File(archivePath);
    const meta = {
      ...manifest,
      file: `${bundleName}.${outExt}`,
      kind: 'archive',
      sha256,
      size: readFileSync(archivePath).length,
    };
    writeFileSync(join(STAGING_ROOT, `${bundleName}.meta.json`), `${JSON.stringify(meta, null, 2)}\n`);
    console.log(`[package] ${archivePath} (${meta.size} bytes, sha256=${sha256.slice(0, 16)}…)`);
  } else if (buildWinExe) {
    console.log('[package] Windows：已跳过 zip（仅发布 .exe；需要 zip 请设 BUILD_WIN_ZIP=1）');
  }

  if (process.env.GITHUB_OUTPUT && archivePath) {
    const { appendFileSync } = await import('node:fs');
    appendFileSync(process.env.GITHUB_OUTPUT, `archive_path=${archivePath}\n`);
    appendFileSync(process.env.GITHUB_OUTPUT, `bundle_name=${bundleName}\n`);
    appendFileSync(process.env.GITHUB_OUTPUT, `sha256=${sha256}\n`);
  }

  // 删除 bundle 中间目录，避免 CI 把 node_modules 内 .exe 一并当作 Release 资产
  logStep('清理 bundle 中间目录…');
  if (existsSync(bundleDir)) rmSync(bundleDir, { recursive: true, force: true });
  const nodeCache = join(STAGING_ROOT, '.node-cache');
  if (existsSync(nodeCache)) rmSync(nodeCache, { recursive: true, force: true });
  const issFile = join(STAGING_ROOT, `${bundleName}.iss`);
  if (existsSync(issFile)) rmSync(issFile, { force: true });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
