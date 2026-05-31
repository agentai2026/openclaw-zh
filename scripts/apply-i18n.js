#!/usr/bin/env node
/**
 * apply-i18n.js — 应用 translations/ 全量汉化词典
 * 安装依赖后请再运行 regenerate-schema-artifacts.mjs
 */
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import {
  loadMainConfig,
  loadAllTranslations,
  applyTranslation,
  applyCopyFiles,
  printStats,
} from './i18n-engine.mjs';
import { resolveOpenClawTarget, patchesDir } from './paths.mjs';

const TARGET = resolveOpenClawTarget();
const verbose = process.argv.includes('--verbose') || process.argv.includes('-v');
const dryRun = process.argv.includes('--dry-run');

async function applyBrandReplace() {
  const brandPath = join(patchesDir(), 'brand-replace.json');
  if (!existsSync(brandPath)) return;

  const dict = JSON.parse(await readFile(brandPath, 'utf8'));
  const readme = join(TARGET, 'README.md');
  if (existsSync(readme)) {
    let c = await readFile(readme, 'utf8');
    for (const [k, v] of Object.entries(dict)) {
      if (k === '_meta' || typeof v !== 'string') continue;
      if (c.includes(k)) c = c.replaceAll(k, v);
    }
    if (!dryRun) await writeFile(readme, c, 'utf8');
  }
}

async function main() {
  console.log(`[apply-i18n] target=${TARGET}`);

  const mainConfig = await loadMainConfig();
  const translations = await loadAllTranslations(mainConfig, verbose);
  console.log(`[apply-i18n] 已加载 ${translations.length} 个翻译模块`);

  const allStats = [];
  for (const translation of translations) {
    if (translation.copyFiles && Array.isArray(translation.copyFiles)) {
      allStats.push(
        await applyCopyFiles(translation, TARGET, { dryRun, verify: false, verbose }),
      );
    } else if (translation.replacements && translation.file) {
      allStats.push(
        await applyTranslation(translation, TARGET, { dryRun, verify: false, verbose }),
      );
    }
  }

  printStats(allStats, { dryRun, verify: false });
  if (!dryRun) {
    await applyBrandReplace();
    const { applyFeaturePanel } = await import('./apply-feature-panel.mjs');
    await applyFeaturePanel(TARGET, { dryRun: false, verbose });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
