#!/usr/bin/env node
/**
 * openclaw-zh-cli — 本地对克隆的上游目录应用汉化
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const scriptsDir = join(ROOT, 'scripts');

function run(script, extraArgs = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [join(scriptsDir, script), ...extraArgs],
      {
        cwd: ROOT,
        stdio: 'inherit',
        env: { ...process.env, OVERLAY_ROOT: ROOT },
      },
    );
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`exit ${code}`))));
  });
}

const [cmd, ...rest] = process.argv.slice(2);
const targetIdx = rest.findIndex((a) => a === '--target');
const targetArgs =
  targetIdx >= 0
    ? ['--target', rest[targetIdx + 1]]
    : rest.filter((a) => a.startsWith('--target='));

async function main() {
  switch (cmd) {
    case 'apply':
      await run('apply-package-zh.js', targetArgs);
      await run('apply-i18n.js', targetArgs);
      break;
    case 'status':
      console.log('OpenClaw 汉化 overlay 仓库');
      console.log(`  根目录: ${ROOT}`);
      console.log('  用法: openclaw-zh-cli apply --target=../openclaw');
      break;
    default:
      console.log(`
OpenClaw 汉化 CLI

  openclaw-zh-cli apply [--target=PATH]  应用汉化到上游目录
  openclaw-zh-cli status                 显示说明
`);
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
