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
    console.log(`[package] 下载 Node ${url}`);
    run(`curl -fsSL -o "${archive}" "${url}"`);
  }
  const extractDir = join(cache, folder);
  if (existsSync(extractDir)) rmSync(extractDir, { recursive: true, force: true });
  mkdirSync(extractDir, { recursive: true });
  if (spec.ext === 'zip') {
    if (process.platform === 'win32') {
      run(
        `powershell -NoProfile -Command "Expand-Archive -LiteralPath '${archive.replace(/'/g, "''")}' -DestinationPath '${cache.replace(/'/g, "''")}' -Force"`,
      );
    } else {
      run(`unzip -q "${archive}" -d "${cache}"`);
    }
  } else {
    run(`tar -xJf "${archive}" -C "${cache}"`);
  }
  return join(cache, folder);
}

function pruneProd(openclawDir) {
  try {
    run('pnpm prune --prod', { cwd: openclawDir });
  } catch {
    console.log('[package] pnpm prune 跳过');
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

  console.log(`[package] 组装 ${bundleName}`);
  pruneProd(OPENCLAW_DIR);

  const nodeSrc = await downloadNode(PLATFORM);
  cpSync(nodeSrc, join(bundleDir, 'node'), { recursive: true });

  const appDir = join(bundleDir, 'app');
  mkdirSync(appDir, { recursive: true });
  cpSync(OPENCLAW_DIR, appDir, {
    recursive: true,
    filter: (src) => {
      const rel = src.replace(/\\/g, '/');
      if (rel.includes('/.git/')) return false;
      if (rel.includes('/node_modules/.cache')) return false;
      return true;
    },
  });

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

  const outExt = PLATFORM.startsWith('win') ? 'zip' : 'tar.gz';
  const archivePath = join(STAGING_ROOT, `${bundleName}.${outExt}`);
  if (existsSync(archivePath)) rmSync(archivePath, { force: true });

  if (outExt === 'zip') {
    if (process.platform === 'win32') {
      run(
        `powershell -NoProfile -Command "Compress-Archive -Path '${bundleDir}\\*' -DestinationPath '${archivePath}' -Force"`,
      );
    } else {
      run(`cd "${bundleDir}" && zip -rq "${archivePath}" .`);
    }
  } else {
    run(`tar -czf "${archivePath}" -C "${STAGING_ROOT}" "${bundleName}"`);
  }

  const sha256 = sha256File(archivePath);
  const meta = { ...manifest, file: `${bundleName}.${outExt}`, sha256, size: readFileSync(archivePath).length };
  writeFileSync(join(STAGING_ROOT, `${bundleName}.meta.json`), `${JSON.stringify(meta, null, 2)}\n`);
  console.log(`[package] ${archivePath} (${meta.size} bytes, sha256=${sha256.slice(0, 16)}…)`);

  if (process.env.GITHUB_OUTPUT) {
    const { appendFileSync } = await import('node:fs');
    appendFileSync(process.env.GITHUB_OUTPUT, `archive_path=${archivePath}\n`);
    appendFileSync(process.env.GITHUB_OUTPUT, `bundle_name=${bundleName}\n`);
    appendFileSync(process.env.GITHUB_OUTPUT, `sha256=${sha256}\n`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
