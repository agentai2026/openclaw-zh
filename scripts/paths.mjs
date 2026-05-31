/**
 * 汉化 overlay 仓库路径：overlay 根目录 + 上游 openclaw 目录
 */
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

export const OVERLAY_ROOT = resolve(
  process.env.OVERLAY_ROOT || process.cwd(),
);

function parseTargetArg(argv) {
  const eq = argv.find((a) => a.startsWith('--target='));
  if (eq) return resolve(eq.split('=').slice(1).join('='));
  const idx = argv.indexOf('--target');
  if (idx >= 0 && argv[idx + 1]) return resolve(argv[idx + 1]);
  return null;
}

export function resolveOpenClawTarget(argv = process.argv) {
  const fromArg = parseTargetArg(argv);
  if (fromArg) return fromArg;
  if (process.env.OPENCLAW_TARGET) {
    return resolve(process.env.OPENCLAW_TARGET);
  }
  const candidate = join(OVERLAY_ROOT, 'openclaw');
  if (existsSync(join(candidate, 'package.json'))) {
    return candidate;
  }
  return OVERLAY_ROOT;
}

export function translationsDir() {
  const root = join(OVERLAY_ROOT, 'translations');
  if (existsSync(join(root, 'config.json'))) return root;
  const legacy = join(OVERLAY_ROOT, 'translations', 'zh-CN');
  if (existsSync(legacy)) return legacy;
  return join(OVERLAY_ROOT, 'i18n', 'zh-CN');
}

export function patchesDir() {
  return join(OVERLAY_ROOT, 'patches');
}
