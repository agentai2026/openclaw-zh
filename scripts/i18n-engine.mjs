/**
 * 翻译引擎：按 translations/config.json 将词典应用到上游指定源文件
 * 按 translations/config.json 将各模块词典应用到上游指定源文件
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { OVERLAY_ROOT } from './paths.mjs';
import { log, colors } from './i18n-log.mjs';

export const TRANSLATIONS_DIR = path.join(OVERLAY_ROOT, 'translations');

export async function loadMainConfig() {
  const configPath = path.join(TRANSLATIONS_DIR, 'config.json');
  const content = await fs.readFile(configPath, 'utf-8');
  return JSON.parse(content);
}

export async function loadAllTranslations(mainConfig, verbose = false) {
  const translations = [];

  for (const [category, files] of Object.entries(mainConfig.modules)) {
    for (const file of files) {
      const filePath = path.join(TRANSLATIONS_DIR, file);
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const config = JSON.parse(content);
        translations.push({ ...config, category, configFile: file });
        if (verbose) log.dim(`已加载: ${file}`);
      } catch (err) {
        log.warn(`无法加载 ${file}: ${err.message}`);
      }
    }
  }

  return translations;
}

export async function applyCopyFiles(copyConfig, targetDir, options = {}) {
  const { dryRun = false, verify = false, verbose = false } = options;

  const stats = {
    file: copyConfig.description || '文件复制',
    description: copyConfig.description || '',
    total: copyConfig.copyFiles?.length ?? 0,
    applied: 0,
    skipped: 0,
    notFound: 0,
  };

  for (const copyItem of copyConfig.copyFiles ?? []) {
    const sourcePath = path.join(TRANSLATIONS_DIR, copyItem.source);
    const targetPath = path.join(targetDir, copyItem.target);

    try {
      await fs.access(sourcePath);
    } catch {
      stats.notFound++;
      if (verbose) log.warn(`源文件不存在: ${copyItem.source}`);
      continue;
    }

    try {
      const existingContent = await fs.readFile(targetPath, 'utf-8');
      const sourceContent = await fs.readFile(sourcePath, 'utf-8');
      if (existingContent === sourceContent) {
        stats.skipped++;
        continue;
      }
    } catch {
      /* 目标不存在 */
    }

    if (!dryRun && !verify) {
      await fs.mkdir(path.dirname(targetPath), { recursive: true });
      await fs.copyFile(sourcePath, targetPath);
    }

    stats.applied++;
    if (verbose) log.dim(`复制: ${copyItem.source} → ${copyItem.target}`);
  }

  return stats;
}

export async function applyTranslation(translation, targetDir, options = {}) {
  const { dryRun = false, verify = false, verbose = false } = options;

  const targetPath = path.join(targetDir, translation.file);
  const stats = {
    file: translation.file,
    description: translation.description,
    total: Object.keys(translation.replacements ?? {}).filter((k) => !k.startsWith('__comment'))
      .length,
    applied: 0,
    skipped: 0,
    notFound: 0,
  };

  let content;
  try {
    content = await fs.readFile(targetPath, 'utf-8');
  } catch {
    log.error(`文件不存在: ${translation.file}`);
    stats.notFound = stats.total;
    return stats;
  }

  let modified = content;

  for (const [original, translated] of Object.entries(translation.replacements ?? {})) {
    if (original.startsWith('__comment')) continue;

    if (modified.includes(translated)) {
      stats.skipped++;
    } else if (modified.includes(original)) {
      modified = modified.replaceAll(original, translated);
      stats.applied++;
      if (verbose) log.dim(`替换: ${translation.file}`);
    } else {
      stats.notFound++;
    }
  }

  if (!dryRun && !verify && stats.applied > 0) {
    await fs.writeFile(targetPath, modified, 'utf-8');
  }

  return stats;
}

export function printStats(allStats, options = {}) {
  const { dryRun = false, verify = false } = options;

  let totalApplied = 0;
  let totalSkipped = 0;
  let totalNotFound = 0;

  for (const stats of allStats) {
    totalApplied += stats.applied;
    totalSkipped += stats.skipped;
    totalNotFound += stats.notFound;
    if (stats.notFound > 0) {
      log.warn(`${stats.file}: 未找到 ${stats.notFound}/${stats.total} 条`);
    }
  }

  log.info(
    `汉化统计: 应用 ${totalApplied} | 已存在 ${totalSkipped} | 未找到 ${totalNotFound}${dryRun || verify ? ' (预览)' : ''}`,
  );
  console.log(`##STATS##applied=${totalApplied}|existed=${totalSkipped}|failed=${totalNotFound}##`);

  return { totalApplied, totalSkipped, totalNotFound };
}
