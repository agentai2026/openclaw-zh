/* OpenClaw 汉化版 - 功能面板 (agentai2026/openclaw-zh) */

(function() {
  'use strict';

  // 面板数据（构建时会被替换为实际数据）
  const PANEL_DATA = /*__PANEL_DATA__*/ {};

  // 图标 SVG
  const ICONS = {
    gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg>',
    chevronDown: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>',
    refresh: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/></svg>',
    undo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>',
    wrench: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z"/></svg>',
    globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>',
    github: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>',
    package: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16.5 9.4 7.55 4.24"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.27 6.96 12 12.01l8.73-5.05"/><path d="M12 22.08V12"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>',
    lobster: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" fill="none"/><g fill="#3a0a0d"><rect x="1" y="5" width="1" height="3"/><rect x="2" y="4" width="1" height="1"/><rect x="2" y="8" width="1" height="1"/><rect x="3" y="3" width="1" height="1"/><rect x="3" y="9" width="1" height="1"/><rect x="4" y="2" width="1" height="1"/><rect x="4" y="10" width="1" height="1"/><rect x="5" y="2" width="6" height="1"/><rect x="11" y="2" width="1" height="1"/><rect x="12" y="3" width="1" height="1"/><rect x="12" y="9" width="1" height="1"/><rect x="13" y="4" width="1" height="1"/><rect x="13" y="8" width="1" height="1"/><rect x="14" y="5" width="1" height="3"/><rect x="5" y="11" width="6" height="1"/><rect x="4" y="12" width="1" height="1"/><rect x="11" y="12" width="1" height="1"/><rect x="3" y="13" width="1" height="1"/><rect x="12" y="13" width="1" height="1"/><rect x="5" y="14" width="6" height="1"/></g><g fill="#ff4f40"><rect x="5" y="3" width="6" height="1"/><rect x="4" y="4" width="8" height="1"/><rect x="3" y="5" width="10" height="1"/><rect x="3" y="6" width="10" height="1"/><rect x="3" y="7" width="10" height="1"/><rect x="4" y="8" width="8" height="1"/><rect x="5" y="9" width="6" height="1"/><rect x="5" y="12" width="6" height="1"/><rect x="6" y="13" width="4" height="1"/></g><g fill="#ff775f"><rect x="1" y="6" width="2" height="1"/><rect x="2" y="5" width="1" height="1"/><rect x="2" y="7" width="1" height="1"/><rect x="13" y="6" width="2" height="1"/><rect x="13" y="5" width="1" height="1"/><rect x="13" y="7" width="1" height="1"/></g><g fill="#081016"><rect x="6" y="5" width="1" height="1"/><rect x="9" y="5" width="1" height="1"/></g><g fill="#f5fbff"><rect x="6" y="4" width="1" height="1"/><rect x="9" y="4" width="1" height="1"/></g></svg>',
    gitCommit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 3v6"/><path d="M12 15v6"/></svg>',
    lightbulb: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>',
    warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
    message: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    terminal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"/><line x1="12" x2="20" y1="19" y2="19"/></svg>'
  };

  // API 配置
  
  const GITHUB_REPO = 'agentai2026/openclaw-zh';
  const apiCache = { changelog: { data: null, ts: 0 } };

  async function fetchChangelogFromAPI() {
    const now = Date.now();
    if (apiCache.changelog.data && now - apiCache.changelog.ts < 5 * 60 * 1000) {
      return apiCache.changelog.data;
    }
    try {
      const res = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/commits?per_page=20`,
        { headers: { Accept: 'application/vnd.github+json' } },
      );
      if (!res.ok) throw new Error(String(res.status));
      const commits = await res.json();
      const skipCommit = (msg) =>
        /^ci:\s*(release state|更新发布状态)\b/i.test((msg || '').split('\n')[0]);
      const data = {
        is_public: true,
        repo_url: `https://github.com/${GITHUB_REPO}`,
        commits: commits.filter((c) => !skipCommit(c.commit?.message)).map((c) => ({
          message: (c.commit?.message || '').split('\n')[0],
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

  // 当前激活的 Tab
  let activeTab = 'help';

  // 创建面板 HTML
  function createPanelHTML() {
    return `
      <div class="feature-panel-overlay" id="feature-panel-overlay">
        <div class="feature-panel">
          <header class="panel-header">
            <h2>🦞 功能面板</h2>
            <button class="panel-close" id="panel-close">&times;</button>
          </header>
          <nav class="panel-tabs">
<button class="panel-tab active" data-tab="help">帮助文档</button>
            <button class="panel-tab" data-tab="commands">快捷指令</button>
            <button class="panel-tab" data-tab="ai-studio"><span class="fire-icon">🔥</span>AI 创作<span class="hot-badge">HOT</span></button>
            <button class="panel-tab" data-tab="plugins">插件列表</button>
            <button class="panel-tab" data-tab="changelog">更新日志</button>
            <button class="panel-tab" data-tab="about">关于我们</button>
          </nav>
          <main class="panel-content" id="panel-content">
            ${renderTabContent('help')}
          </main>
        </div>
      </div>
    `;
  }

  // 渲染 Tab 内容
  function renderTabContent(tab) {
    switch (tab) {
      case 'help':
        return renderHelpTab();
      case 'commands':
        return renderCommandsTab();
      case 'ai-studio':
        return renderAiStudioTab();
      case 'plugins':
        return renderPluginsTab();
      case 'changelog':
        return renderChangelogTab();
      case 'about':
        return renderAboutTab();
      default:
        return '';
    }
  }

  // 渲染帮助文档 Tab
  function renderHelpTab() {
    const faqItems = PANEL_DATA.faq.map(item => `
      <div class="faq-item" data-id="${item.id}">
        <button class="faq-question">
          <span>${item.question}</span>
          ${ICONS.chevronDown}
        </button>
        <div class="faq-answer">
          <div class="faq-answer-inner">${formatAnswer(item.answer)}</div>
        </div>
      </div>
    `).join('');

    return `
      <div class="help-tab">
        ${faqItems || '<p style="color: var(--text-muted); text-align: center;">暂无 FAQ 内容</p>'}
      </div>
    `;
  }

  // 格式化答案（处理代码块和换行）
  function formatAnswer(text) {
    // 先处理多行代码块 ```code```
    let result = text.replace(/```\n?([\s\S]*?)\n?```/g, (match, code) => {
      // 去除代码首尾的换行
      const trimmedCode = code.trim();
      return `__CODE_BLOCK__${trimmedCode}__END_CODE__`;
    });
    
    // 处理行内代码 `code`
    result = result.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
    
    // 替换普通换行为 <br>
    result = result.replace(/\n/g, '<br>');
    
    // 清理代码块前后的 <br>
    result = result.replace(/<br>__CODE_BLOCK__/g, '<pre><code>');
    result = result.replace(/__CODE_BLOCK__/g, '<pre><code>');
    result = result.replace(/__END_CODE__<br>/g, '</code></pre>');
    result = result.replace(/__END_CODE__/g, '</code></pre>');
    
    // 清理连续的 <br>
    result = result.replace(/(<br>){3,}/g, '<br><br>');
    
    return result;
  }

  // 渲染快捷指令 Tab
  function renderCommandsTab() {
    return `
      <div class="commands-grid">
        <button class="command-btn" data-action="restart">
          ${ICONS.refresh}
          <span>重启网关</span>
          <span class="command-desc">重启 OpenClaw Gateway</span>
        </button>
        <button class="command-btn" data-action="clear-cache">
          ${ICONS.trash}
          <span>清理缓存</span>
          <span class="command-desc">清理临时文件和缓存</span>
        </button>
        <button class="command-btn" data-action="check-update">
          ${ICONS.download}
          <span>检测更新</span>
          <span class="command-desc">检查汉化版 npm 是否有新版本</span>
        </button>
        <button class="command-btn" data-action="restore-original">
          ${ICONS.undo}
          <span>恢复原版</span>
          <span class="command-desc">切换回官方 openclaw 包</span>
        </button>
        <button class="command-btn" data-action="fix-common" style="grid-column: span 2;">
          ${ICONS.wrench}
          <span>一键修复常见问题</span>
          <span class="command-desc">复制 doctor --fix 命令到剪贴板，粘贴到终端执行</span>
        </button>
      </div>
    `;
  }

  function renderAiStudioTab() {
    return `
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
    `;
  }

  function bindAiStudioEvents() {}

  function renderPluginItem(plugin, index) {
    const isAvailable = plugin.status === 'available';
    const iconHtml = plugin.icon 
      ? `<img src="${plugin.icon}" alt="" class="plugin-icon-img" onerror="this.parentElement.innerHTML='${ICONS.package}'">`
      : ICONS.package;
    
    return `
      <div class="plugin-item" data-plugin-id="${plugin.id || index}">
        <button class="plugin-header">
          <div class="plugin-icon">${iconHtml}</div>
          <div class="plugin-summary">
            <div class="plugin-name">
              ${plugin.name}
              ${plugin.version ? `<span class="plugin-version">v${plugin.version}</span>` : ''}
            </div>
            <div class="plugin-desc">${plugin.description}</div>
          </div>
          <span class="plugin-status ${plugin.status}">${isAvailable ? '可用' : '即将推出'}</span>
          <svg class="plugin-expand-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
        <div class="plugin-details">
          <div class="plugin-details-inner">
            <p class="plugin-full-desc">${plugin.description}</p>
            ${isAvailable && plugin.install ? `
              <div class="plugin-install-section">
                <div class="plugin-install-method">
                  <span class="method-label">${ICONS.message} 对 AI 说：</span>
                  <div class="ai-prompt-box">
                    <span class="ai-prompt-text">${plugin.aiPrompt || '请帮我安装 ' + plugin.name}</span>
                    <button class="copy-btn" data-copy="${plugin.aiPrompt || '请帮我安装 ' + plugin.name}" title="复制到剪贴板">复制</button>
                  </div>
                </div>
                <div class="plugin-install-method">
                  <span class="method-label">${ICONS.terminal} 或手动安装：</span>
                  <code class="plugin-install-cmd" data-copy="${plugin.install}" title="点击复制">
                    ${plugin.install}
                  </code>
                </div>
              </div>
            ` : `
              <p class="plugin-full-desc" style="opacity: 0.6;">此插件正在开发中，敬请期待...</p>
            `}
          </div>
        </div>
      </div>
    `;
  }

  // 渲染插件列表 Tab（带 loading 状态）
  function renderPluginsTab() {
    return `
      <div class="plugins-tab">
        <div class="plugins-header">
          <div class="plugins-header-top">
            <p class="plugins-intro">${ICONS.lightbulb} <strong>安装方式：</strong>复制下方提示语发送给 AI，AI 会帮你自动安装插件。</p>
            <button class="refresh-btn" id="refresh-plugins" title="刷新插件列表">
              ${ICONS.refresh}
            </button>
          </div>
          <p class="plugins-note">${ICONS.warning} 需要先配置 AI 模型（查看「帮助文档」中的配置教程）</p>
        </div>
        <div class="plugins-list" id="plugins-list">
          <div class="loading-container">
            <div class="loading-spinner"></div>
            <p>正在加载插件列表...</p>
          </div>
        </div>
      </div>
    `;
  }

  // 加载并渲染插件列表
  async function loadPluginsList() {
    const container = document.getElementById('plugins-list');
    if (!container) return;
    
    // 显示 loading
    container.innerHTML = `
      <div class="loading-container">
        <div class="loading-spinner"></div>
        <p>正在加载插件列表...</p>
      </div>
    `;
    
    // 尝试从 API 获取
    let plugins = await fetchPluginsFromAPI();
    
    // 如果 API 失败，使用本地数据
    if (!plugins || plugins.length === 0) {
      plugins = PANEL_DATA.plugins;
    }
    
    if (!plugins || plugins.length === 0) {
      container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">暂无插件</p>';
      return;
    }
    
    // 渲染插件列表
    container.innerHTML = plugins.map(renderPluginItem).join('');
    
    // 绑定事件
    bindPluginEvents();
  }

  // 绑定插件相关事件
  function bindPluginEvents() {
    // 折叠/展开插件详情
    document.querySelectorAll('.plugin-header').forEach(header => {
      header.addEventListener('click', (e) => {
        // 防止点击复制按钮时触发折叠
        if (e.target.closest('.copy-btn') || e.target.closest('.plugin-install-cmd')) {
          return;
        }
        const item = header.closest('.plugin-item');
        item.classList.toggle('expanded');
      });
    });
    
    // 复制安装命令
    document.querySelectorAll('.plugin-install-cmd').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        copyToClipboard(el.dataset.copy);
      });
    });
    
    // 复制 AI 提示语
    document.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        copyToClipboard(btn.dataset.copy);
      });
    });
  }

  // 渲染更新日志 Tab（带 loading 状态）
  function renderChangelogTab() {
    return `
      <div class="changelog-tab">
        <div class="changelog-header">
          <h3>项目更新日志</h3>
          <button class="refresh-btn" id="refresh-changelog" title="刷新更新日志">
            ${ICONS.refresh}
          </button>
        </div>
        <div class="changelog-list" id="changelog-list">
          <div class="loading-container">
            <div class="loading-spinner"></div>
            <p>正在加载更新日志...</p>
          </div>
        </div>
      </div>
    `;
  }

  // 格式化时间
  function formatDate(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    
    // 小于 1 小时
    if (diff < 60 * 60 * 1000) {
      const mins = Math.floor(diff / 60000);
      return `${mins} 分钟前`;
    }
    // 小于 24 小时
    if (diff < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours} 小时前`;
    }
    // 小于 7 天
    if (diff < 7 * 24 * 60 * 60 * 1000) {
      const days = Math.floor(diff / 86400000);
      return `${days} 天前`;
    }
    // 其他
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
  }

  // 加载并渲染更新日志
  async function loadChangelogList() {
    const container = document.getElementById('changelog-list');
    if (!container) return;
    
    // 显示 loading
    container.innerHTML = `
      <div class="loading-container">
        <div class="loading-spinner"></div>
        <p>正在加载更新日志...</p>
      </div>
    `;
    
    const data = await fetchChangelogFromAPI();
    
    if (!data || !data.commits || data.commits.length === 0) {
      container.innerHTML = `
        <div class="changelog-empty">
          <p>暂无更新日志</p>
          <p class="changelog-hint">请访问 <a href="https://github.com/${GITHUB_REPO}" target="_blank" rel="noreferrer">GitHub 仓库</a> 查看提交历史</p>
        </div>`;
      return;
    }
    
    // 渲染提交列表
    const commitsHtml = data.commits.map(commit => `
      <div class="commit-item">
        <div class="commit-icon">${ICONS.gitCommit}</div>
        <div class="commit-content">
          <div class="commit-message">${escapeHtml(commit.message)}</div>
          <div class="commit-meta">
            ${commit.avatar_url ? `<img src="${commit.avatar_url}" alt="" class="commit-avatar">` : ''}
            <span class="commit-author">${escapeHtml(commit.author)}</span>
            <span class="commit-date">${formatDate(commit.date)}</span>
            ${commit.url && data.is_public ? `<a href="${commit.url}" target="_blank" class="commit-sha">${commit.short_sha}</a>` : `<span class="commit-sha">${commit.short_sha}</span>`}
          </div>
        </div>
      </div>
    `).join('');
    
    container.innerHTML = `
      ${commitsHtml}
      ${data.repo_url ? `
        <div class="changelog-footer">
          <a href="${data.repo_url}" target="_blank" class="view-all-link">
            ${ICONS.github}
            <span>在 GitHub 查看完整历史</span>
          </a>
        </div>
      ` : ''}
    `;
  }

  // HTML 转义
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // 渲染关于我们 Tab
  function renderAboutTab() {
    const about = PANEL_DATA.about || {};
    const links = [
      { href: about.website, icon: 'globe', label: '汉化仓库' },
      { href: about.github, icon: 'github', label: 'GitHub' },
      { href: about.npm, icon: 'package', label: 'npm' },
      { href: about.docs, icon: 'globe', label: '官方文档' },
      { href: about.upstream, icon: 'github', label: '上游项目' },
    ].filter((l) => l.href);
    return `
      <div class="about-section">
        <div class="about-logo">${ICONS.lobster}</div>
        <h3 class="about-title">${about.project || 'OpenClaw 汉化版'}</h3>
        <p class="about-company">${about.tagline || about.company || ''}</p>
        <div class="about-links">
          ${links
            .map(
              (l) => `
            <a class="about-link" href="${l.href}" target="_blank" rel="noreferrer">
              ${ICONS[l.icon] || ICONS.globe}
              <span>${l.label}</span>
            </a>`,
            )
            .join('')}
        </div>
        <p class="about-copyright">© ${new Date().getFullYear()} ${about.license || 'MIT'}</p>
      </div>
    `;
  }

  // 显示 Toast 通知
  function showToast(message, type = 'info') {
    let toast = document.querySelector('.panel-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'panel-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = `panel-toast ${type}`;
    
    // 触发重排以重新播放动画
    toast.offsetHeight;
    toast.classList.add('show');
    
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }

  // 复制到剪贴板（支持 HTTP 环境的 fallback）
  async function copyToClipboard(text) {
    // 优先尝试现代 Clipboard API
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        showToast('已复制到剪贴板', 'success');
        return;
      } catch (err) {
        // 继续尝试 fallback
      }
    }
    
    // Fallback: 使用 execCommand（支持 HTTP 环境）
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0;';
      document.body.appendChild(textarea);
      textarea.select();
      textarea.setSelectionRange(0, 99999); // 移动端支持
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      
      if (success) {
        showToast('已复制到剪贴板', 'success');
      } else {
        throw new Error('execCommand failed');
      }
    } catch (err) {
      // 最后的 fallback：让用户手动复制
      showToast(`请手动复制: ${text}`, 'info');
    }
  }

  // 执行快捷指令
  async function executeCommand(action) {
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
  }

  // 打开面板
  function openPanel() {
    const overlay = document.getElementById('feature-panel-overlay');
    if (overlay) {
      overlay.classList.add('active');
    }
  }

  // 关闭面板
  function closePanel() {
    const overlay = document.getElementById('feature-panel-overlay');
    if (overlay) {
      overlay.classList.remove('active');
    }
  }

  // 切换 Tab
  function switchTab(tab) {
    activeTab = tab;
    
    // 更新 Tab 按钮状态
    document.querySelectorAll('.panel-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    
    // 更新内容
    const content = document.getElementById('panel-content');
    if (content) {
      content.innerHTML = renderTabContent(tab);
      bindContentEvents();
      
      // 动态加载数据
      if (tab === 'plugins') {
        loadPluginsList();
      } else if (tab === 'changelog') {
        loadChangelogList();
      }
    }
  }

  // 切换 FAQ 展开状态
  function toggleFaq(item) {
    item.classList.toggle('expanded');
  }

  // 绑定内容区事件
  function bindContentEvents() {
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
  }

  // 初始化面板
  function initPanel() {
    // 检查是否已经初始化
    if (document.getElementById('feature-panel-overlay')) {
      return;
    }

    // 查找入口按钮位置（TopBar 健康状态旁边）
    const topbarStatus = document.querySelector('.topbar-status');
    if (!topbarStatus) {
      // 如果找不到，稍后重试
      setTimeout(initPanel, 1000);
      return;
    }

    // 创建入口按钮
    const trigger = document.createElement('button');
    trigger.className = 'panel-trigger';
    trigger.title = '功能面板';
    trigger.setAttribute('aria-label', '打开功能面板');
    trigger.innerHTML = ICONS.gear;
    trigger.addEventListener('click', openPanel);

    // 插入到 topbar-status 开头
    topbarStatus.insertBefore(trigger, topbarStatus.firstChild);

    // 创建面板
    const panelContainer = document.createElement('div');
    panelContainer.innerHTML = createPanelHTML();
    document.body.appendChild(panelContainer.firstElementChild);

    // 绑定事件
    document.getElementById('panel-close').addEventListener('click', closePanel);
    
    // 点击遮罩关闭
    document.getElementById('feature-panel-overlay').addEventListener('click', (e) => {
      if (e.target.id === 'feature-panel-overlay') {
        closePanel();
      }
    });

    // ESC 键关闭
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closePanel();
      }
    });

    // Tab 切换
    document.querySelectorAll('.panel-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        switchTab(btn.dataset.tab);
      });
    });

    // 绑定内容区事件
    bindContentEvents();

    console.log('[openclaw-zh] 功能面板已加载');
  }

  // 全局标记，防止重复初始化
  let panelInitialized = false;
  let observer = null;

  // 带防抖的初始化包装器
  let initTimeout = null;
  function debouncedInit() {
    if (panelInitialized) return;
    if (initTimeout) clearTimeout(initTimeout);
    initTimeout = setTimeout(() => {
      if (!panelInitialized && !document.querySelector('.panel-trigger') && document.querySelector('.topbar-status')) {
        initPanel();
        panelInitialized = true;
        // 初始化成功后断开 observer
        if (observer) {
          observer.disconnect();
          observer = null;
        }
      }
    }, 100);
  }

  // 等待 DOM 加载完成
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', debouncedInit);
  } else {
    // DOM 已加载，但可能 Dashboard 还没渲染完成
    setTimeout(debouncedInit, 500);
  }

  // 如果 Dashboard 是 SPA，监听路由变化后重新初始化
  // 只在未初始化时创建 observer
  if (!panelInitialized && !observer) {
    observer = new MutationObserver((mutations) => {
      debouncedInit();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

})();
