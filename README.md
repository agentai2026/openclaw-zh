# OpenClaw 汉化版 (openclaw-zh)

[![npm](https://img.shields.io/npm/v/@agentai2026/openclaw-zh)](https://www.npmjs.com/package/@agentai2026/openclaw-zh)
[![Docker](https://img.shields.io/docker/v/agentai2027/openclaw-zh/latest)](https://hub.docker.com/r/agentai2027/openclaw-zh)

**OpenClaw 第三方中文发行版** — 全中文界面，**每小时自动同步** [openclaw/openclaw](https://github.com/openclaw/openclaw) 官方更新。

| 项目 | 链接 |
|------|------|
| 本仓库 | https://github.com/agentai2026/openclaw-zh |
| 官方仓库 | https://github.com/openclaw/openclaw |

---

## 特性

- 每小时整点自动检测并合并上游 `main` 分支
- 基于词条库自动替换 `src` / `packages` 中的 UI 字符串
- 版本号跟随官方（如 `2026.5.30-zh`）
- 自动发布 **npm** 与 **Docker Hub**
- Linux / macOS / Windows 一键安装脚本

---

## 快速安装

### npm（推荐）

```bash
npm install -g @agentai2026/openclaw-zh@latest
```

### 一键脚本

```bash
# Linux / macOS
curl -fsSL https://raw.githubusercontent.com/agentai2026/openclaw-zh/main/deploy/install.sh | bash

# Windows PowerShell
irm https://raw.githubusercontent.com/agentai2026/openclaw-zh/main/deploy/install.ps1 | iex
```

### Docker

```bash
docker pull agentai2027/openclaw-zh:latest
docker run -d --name openclaw-zh -p 18789:18789 agentai2027/openclaw-zh:latest
```

或使用 Compose：

```bash
docker compose -f docker/docker-compose.yml up -d
```

---

## 版本规则

| 场景 | 版本示例 |
|------|----------|
| 跟随官方 | `2026.5.30-zh` |
| 官方未变、汉化有更新 | `2026.5.30-zh.20260530` |

---

## 仓库结构

```
openclaw-zh/
├── .github/workflows/release.yml   # 每小时同步 + 发行
├── scripts/
│   ├── sync-upstream.js            # 同步上游并保护汉化文件
│   ├── apply-i18n.js               # 应用翻译替换
│   └── bump-version.js             # 版本号计算
├── i18n/zh-CN/                     # 翻译词条
├── patches/                          # 品牌等补丁
├── docker/                           # Docker 构建
├── deploy/                           # 安装脚本
├── package.json                      # npm 包配置（受保护）
└── SETUP_GUIDE.md                    # 详细配置指南
```

---

## 本地开发

```bash
# 同步上游（需已配置 git remote upstream）
node scripts/sync-upstream.js

# 应用汉化
node scripts/apply-i18n.js

# 更新版本号
node scripts/bump-version.js

# 或一条命令
npm run release:local
```

**要求：** Node.js >= 22

---

## 贡献翻译

编辑 `i18n/zh-CN/*.json` 与 `patches/brand-replace.json`，提交 PR 即可；CI 会在下次整点自动合并与发布。

---

## 许可证

MIT — 上游 OpenClaw 版权归 [openclaw](https://github.com/openclaw/openclaw) 项目所有。

---

## 相关账号

| 平台 | 账号 |
|------|------|
| GitHub | agentai2026 |
| npm | @agentai2026/openclaw-zh |
| Docker Hub | agentai2027/openclaw-zh |

详细 Secrets 与首次部署步骤见 [SETUP_GUIDE.md](./SETUP_GUIDE.md)。
