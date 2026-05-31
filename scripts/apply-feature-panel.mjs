#!/usr/bin/env node
/**
 * 将汉化版「功能面板」复制到上游 ui/public，并注入 index.html
 */
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolveOpenClawTarget, OVERLAY_ROOT } from './paths.mjs';
import { buildFeaturePanelJs } from './build-feature-panel.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PANEL_SRC = join(OVERLAY_ROOT, 'overlay', 'panel');
const PANEL_PUBLIC = 'openclaw-zh';
const MARKER = 'data-openclaw-zh-panel';

export async function applyFeaturePanel(targetDir = resolveOpenClawTarget(), options = {}) {
  const { dryRun = false, verbose = false } = options;
  const publicDir = join(targetDir, 'ui', 'public', PANEL_PUBLIC);
  const indexPath = join(targetDir, 'ui', 'index.html');

  if (!existsSync(join(PANEL_SRC, 'panel-data.json'))) {
    console.warn('[feature-panel] 缺少 overlay/panel/panel-data.json，跳过');
    return;
  }

  const data = await readFile(join(PANEL_SRC, 'panel-data.json'), 'utf8');
  let js = await buildFeaturePanelJs();
  js = js.replace('/*__PANEL_DATA__*/ {};', data.trim());

  if (!dryRun) {
    await mkdir(publicDir, { recursive: true });
    await writeFile(join(publicDir, 'feature-panel.js'), js, 'utf8');
    await copyFile(join(PANEL_SRC, 'feature-panel.css'), join(publicDir, 'feature-panel.css'));
  }

  if (!existsSync(indexPath)) {
    console.warn('[feature-panel] 未找到 ui/index.html，跳过注入');
    return;
  }

  let html = await readFile(indexPath, 'utf8');
  const injectBlock = `
    <link rel="stylesheet" href="/${PANEL_PUBLIC}/feature-panel.css" ${MARKER} />
    <script defer src="/${PANEL_PUBLIC}/feature-panel.js" ${MARKER}></script>`;

  if (!html.includes(MARKER)) {
    if (html.includes('</body>')) {
      html = html.replace('</body>', `${injectBlock}\n  </body>`);
    } else {
      html += injectBlock;
    }
    if (!dryRun) await writeFile(indexPath, html, 'utf8');
    if (verbose) console.log('[feature-panel] 已注入 ui/index.html');
  } else if (verbose) {
    console.log('[feature-panel] index.html 已包含面板脚本');
  }

  console.log(`[feature-panel] 已${dryRun ? '预览' : '应用'} → ui/public/${PANEL_PUBLIC}/`);
}

if (process.argv[1] && process.argv[1].includes('apply-feature-panel')) {
  const dryRun = process.argv.includes('--dry-run');
  applyFeaturePanel(resolveOpenClawTarget(), { dryRun, verbose: true }).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
