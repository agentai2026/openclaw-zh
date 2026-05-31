#!/usr/bin/env node
/**
 * 汉化 schema.labels / schema.help 后重新生成 Dashboard 依赖的 generated 文件
 */
import { writeFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { resolveOpenClawTarget } from './paths.mjs';

const targetDir = resolveOpenClawTarget();
const runnerPath = join(targetDir, '.openclaw-zh-regen-runner.mjs');

const runnerSource = `
const base = await import("./scripts/generate-base-config-schema.ts");
const bundled = await import("./scripts/generate-bundled-channel-config-metadata.ts");
if (typeof base.writeBaseConfigSchemaModule === "function") {
  const r1 = base.writeBaseConfigSchemaModule();
  console.log("base:" + (r1?.changed ?? "?"));
} else if (typeof base.checkBaseConfigSchema === "function") {
  base.checkBaseConfigSchema();
  console.log("base:runtime");
} else {
  console.log("base:skip");
}
const r2 = await bundled.writeBundledChannelConfigMetadataModule();
console.log("bundled:" + (r2?.changed ?? "?"));
`;

async function main() {
  await writeFile(runnerPath, runnerSource, 'utf8');
  try {
    const out = execSync('node --import tsx ".openclaw-zh-regen-runner.mjs"', {
      cwd: targetDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    for (const line of out.split('\n')) {
      const m = line.match(/^(base|bundled):(.+)$/);
      if (m) console.log(`[schema] ${m[1]} → ${m[2].trim()}`);
    }
  } catch (e) {
    console.warn(`[schema] 重新生成跳过或失败: ${e.message?.split('\n')[0] ?? e}`);
  } finally {
    await unlink(runnerPath).catch(() => {});
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
