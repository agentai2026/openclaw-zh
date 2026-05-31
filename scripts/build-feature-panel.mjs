#!/usr/bin/env node
/**
 * 本地维护用：从 git 历史里的旧版 feature-panel.js 重新生成 overlay/panel/feature-panel.js
 * CI / apply 直接使用仓库里已提交的 overlay/panel/feature-panel.js，不跑本脚本。
 */
import { execSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PANEL_DIR = join(ROOT, 'overlay', 'panel');

const GITHUB_API = `
  const GITHUB_REPO = 'agentai2026/openclaw-zh';
  const apiCache = { changelog: { data: null, ts: 0 } };

  async function fetchChangelogFromAPI() {
    const now = Date.now();
    if (apiCache.changelog.data && now - apiCache.changelog.ts < 5 * 60 * 1000) {
      return apiCache.changelog.data;
    }
    try {
      const res = await fetch(
        \`https://api.github.com/repos/\${GITHUB_REPO}/commits?per_page=20\`,
        { headers: { Accept: 'application/vnd.github+json' } },
      );
      if (!res.ok) throw new Error(String(res.status));
      const commits = await res.json();
      const skipCommit = (msg) =>
        /^ci:\\s*(release state|更新发布状态)\\b/i.test((msg || '').split('\\n')[0]);
      const data = {
        is_public: true,
        repo_url: \`https://github.com/\${GITHUB_REPO}\`,
        commits: commits.filter((c) => !skipCommit(c.commit?.message)).map((c) => ({
          message: (c.commit?.message || '').split('\\n')[0],
          author: c.commit?.author?.name || c.author?.login || 'unknown',
          date: c.commit?.author?.date || c.commit?.committer?.date,
          avatar_url: c.author?.avatar_url,
          url: c.html_url,
          short_sha: (c.sha || '').slice(0, 7),
        })),
      };
      apiCache.changelog = { data, ts: now };
      return data;
    } catch (e) {
      console.warn('[功能面板] GitHub 更新日志获取失败', e.message);
      return null;
    }
  }

  async function fetchPluginsFromAPI() {
    return null;
  }
`;

const RENDER_COMMANDS_TAB = `function renderCommandsTab() {
    return \`
      <div class="commands-grid">
        <button class="command-btn" data-action="restart">
          \${ICONS.refresh}
          <span>重启网关</span>
          <span class="command-desc">重启 OpenClaw Gateway</span>
        </button>
        <button class="command-btn" data-action="clear-cache">
          \${ICONS.trash}
          <span>清理缓存</span>
          <span class="command-desc">清理临时文件和缓存</span>
        </button>
        <button class="command-btn" data-action="check-update">
          \${ICONS.download}
          <span>检测更新</span>
          <span class="command-desc">检查汉化版 npm 是否有新版本</span>
        </button>
        <button class="command-btn" data-action="restore-original">
          \${ICONS.undo}
          <span>恢复原版</span>
          <span class="command-desc">切换回官方 openclaw 包</span>
        </button>
        <button class="command-btn" data-action="fix-common" style="grid-column: span 2;">
          \${ICONS.wrench}
          <span>一键修复常见问题</span>
          <span class="command-desc">复制 doctor --fix 命令到剪贴板，粘贴到终端执行</span>
        </button>
      </div>
    \`;
  }`;

const RENDER_AI_STUDIO_TAB = `function renderAiStudioTab() {
    return \`
      <div class="ai-studio-tab">
        <div class="ssy-header">
          <div class="ssy-brand">
            <span class="ssy-logo">✨</span>
            <div>
              <h3>AI 创作</h3>
              <p class="ssy-subtitle">在 OpenClaw 中配置模型后即可使用官方 Agent 能力</p>
            </div>
          </div>
        </div>
        <p class="ssy-promo-note">本页为汉化版功能入口。多模态生成请通过已配置的模型提供商或官方插件实现，详见「帮助文档」与 <a href="https://docs.openclaw.ai" target="_blank" rel="noreferrer">docs.openclaw.ai</a>。</p>
        <div class="ssy-tools">
          <div class="ssy-tool-card ssy-tool-disabled" data-tool="text2img">
            <div class="ssy-tool-icon">🎨</div>
            <div class="ssy-tool-info">
              <h4>图像生成 <span class="ssy-coming-soon">敬请期待</span></h4>
              <p>文生图、图生图、图像编辑等多种图像生成能力</p>
            </div>
          </div>
          <div class="ssy-tool-card ssy-tool-disabled" data-tool="text2vid">
            <div class="ssy-tool-icon">🎬</div>
            <div class="ssy-tool-info">
              <h4>视频生成 <span class="ssy-coming-soon">敬请期待</span></h4>
              <p>文生视频、图生视频等多种视频生成能力</p>
            </div>
          </div>
          <div class="ssy-tool-card ssy-tool-disabled" data-tool="tts">
            <div class="ssy-tool-icon">🎵</div>
            <div class="ssy-tool-info">
              <h4>音频生成 <span class="ssy-coming-soon">敬请期待</span></h4>
              <p>语音合成、音效生成等多种音频生成能力</p>
            </div>
          </div>
        </div>
      </div>
    \`;
  }

  function bindAiStudioEvents() {}`;

const RENDER_ABOUT_TAB = `function renderAboutTab() {
    const about = PANEL_DATA.about || {};
    const links = [
      { href: about.website, icon: 'globe', label: '汉化仓库' },
      { href: about.github, icon: 'github', label: 'GitHub' },
      { href: about.npm, icon: 'package', label: 'npm' },
      { href: about.docs, icon: 'globe', label: '官方文档' },
      { href: about.upstream, icon: 'github', label: '上游项目' },
    ].filter((l) => l.href);
    return \`
      <div class="about-section">
        <div class="about-logo">\${ICONS.lobster}</div>
        <h3 class="about-title">\${about.project || 'OpenClaw 汉化版'}</h3>
        <p class="about-company">\${about.tagline || about.company || ''}</p>
        <div class="about-links">
          \${links
            .map(
              (l) => \`
            <a class="about-link" href="\${l.href}" target="_blank" rel="noreferrer">
              \${ICONS[l.icon] || ICONS.globe}
              <span>\${l.label}</span>
            </a>\`,
            )
            .join('')}
        </div>
        <p class="about-copyright">© \${new Date().getFullYear()} \${about.license || 'MIT'}</p>
      </div>
    \`;
  }`;

const EXECUTE_COMMAND = `async function executeCommand(action) {
    showToast('正在处理...', 'info');

    switch (action) {
      case 'restart':
        copyToClipboard('openclaw gateway restart');
        showToast('已复制：openclaw gateway restart', 'success');
        break;
      case 'clear-cache':
        showToast('请在终端执行: openclaw doctor（或删除 ~/.openclaw/cache）', 'info');
        break;
      case 'check-update':
        copyToClipboard('npm view @agentai2026/openclaw-zh version');
        showToast('已复制检测命令，请在终端执行', 'success');
        break;
      case 'restore-original':
        copyToClipboard('npm uninstall -g @agentai2026/openclaw-zh && npm install -g openclaw');
        showToast('已复制切换原版命令，请在终端执行', 'success');
        break;
      case 'fix-common':
        copyToClipboard('openclaw doctor --fix --non-interactive --yes');
        showToast('已复制修复命令！请粘贴到终端执行', 'success');
        break;
      default:
        showToast('未知操作', 'error');
    }
  }`;

const BIND_CONTENT = `function bindContentEvents() {
    document.querySelectorAll('.faq-question').forEach((btn) => {
      btn.addEventListener('click', () => {
        toggleFaq(btn.closest('.faq-item'));
      });
    });

    document.querySelectorAll('.command-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        executeCommand(btn.dataset.action);
      });
    });

    const refreshPluginsBtn = document.getElementById('refresh-plugins');
    if (refreshPluginsBtn) {
      refreshPluginsBtn.addEventListener('click', () => {
        loadPluginsList();
        showToast('正在刷新插件列表...', 'info');
      });
    }

    const refreshChangelogBtn = document.getElementById('refresh-changelog');
    if (refreshChangelogBtn) {
      refreshChangelogBtn.addEventListener('click', () => {
        apiCache.changelog.ts = 0;
        loadChangelogList();
        showToast('正在刷新更新日志...', 'info');
      });
    }
  }`;

function patchSource(src) {
  let code = src;

  code = code.replace(
    /\/\* =+[\s\S]*?武汉晴辰[\s\S]*?=+ \*\//,
    '/* OpenClaw 汉化版 - 功能面板 (agentai2026/openclaw-zh) */',
  );

  code = code.replace(
    /const PANEL_DATA = \/\*PANEL_DATA_PLACEHOLDER\*\/[\s\S]*?\/\*END_PANEL_DATA\*\/;/,
    'const PANEL_DATA = /*__PANEL_DATA__*/ {};',
  );

  code = code.replace(
    /const API_BASE[\s\S]*?async function fetchChangelogFromAPI\(\) \{[\s\S]*?\n  \}\n\n/,
    GITHUB_API + '\n',
  );

  code = code.replace(/function renderCommandsTab\(\) \{[\s\S]*?\n  \}\n\n/, `${RENDER_COMMANDS_TAB}\n\n`);

  code = code.replace(
    /function bindQtcoolSetupEvents\(\) \{[\s\S]*?function renderPluginItem/,
    `${RENDER_AI_STUDIO_TAB}\n\n  function renderPluginItem`,
  );

  code = code.replace(
    /\/\/ =+\n  \/\/ 晴辰云[\s\S]*?async function testQtcoolModel\(\) \{[\s\S]*?\n  \}\n\n  function renderAiStudioTab/,
    'function renderAiStudioTab',
  );

  code = code.replace(/function renderAboutTab\(\) \{[\s\S]*?\n  \}\n\n  \/\/ 显示 Toast/, `${RENDER_ABOUT_TAB}\n\n  // 显示 Toast`);

  code = code.replace(/async function executeCommand\(action\) \{[\s\S]*?\n  \}\n\n  \/\/ 打开面板/, `${EXECUTE_COMMAND}\n\n  // 打开面板`);

  code = code.replace(/function bindContentEvents\(\) \{[\s\S]*?\n  \}\n\n  \/\/ 初始化面板/, `${BIND_CONTENT}\n\n  // 初始化面板`);

  code = code.replace(
    /container\.innerHTML = `\s*<div class="changelog-empty">[\s\S]*?1186258278\/OpenClawChineseTranslation[\s\S]*?`;/,
    `container.innerHTML = \`
        <div class="changelog-empty">
          <p>暂无更新日志</p>
          <p class="changelog-hint">请访问 <a href="https://github.com/\${GITHUB_REPO}" target="_blank" rel="noreferrer">GitHub 仓库</a> 查看提交历史</p>
        </div>\`;`,
  );

  code = code.replace(/\[OpenClaw 汉化版\] 功能面板已加载/, '[openclaw-zh] 功能面板已加载');

  code = code.replace(/apiCache\.plugins\.timestamp = 0;\s*\n\s*loadPluginsList\(\);/, 'loadPluginsList();');

  return code;
}

export async function buildFeaturePanelJs() {
  const src = execSync('git show 9e8d5a7656:translations/panel/feature-panel.js', {
    encoding: 'utf8',
    cwd: ROOT,
  });
  return patchSource(src);
}

if (process.argv[1]?.includes('build-feature-panel')) {
  buildFeaturePanelJs()
    .then((js) => writeFile(join(PANEL_DIR, 'feature-panel.js'), js, 'utf8'))
    .then(() => console.log('[build-feature-panel] wrote overlay/panel/feature-panel.js'))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
