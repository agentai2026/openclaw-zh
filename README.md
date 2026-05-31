# OpenClaw 汉化版 (openclaw-zh)

[![npm](https://img.shields.io/npm/v/@agentai2026/openclaw-zh)](https://www.npmjs.com/package/@agentai2026/openclaw-zh)
[![Docker](https://img.shields.io/docker/v/agentai2027/openclaw-zh/latest)](https://hub.docker.com/r/agentai2027/openclaw-zh)

**轻量汉化 overlay 仓库** — 参考 [OpenClawChineseTranslation](https://github.com/1186258278/OpenClawChineseTranslation) 架构：`main` 只保留翻译与脚本，**CI 内克隆** [openclaw/openclaw](https://github.com/openclaw/openclaw) 再构建发布。

| 项目 | 链接 |
|------|------|
| 本仓库 | https://github.com/agentai2026/openclaw-zh |
| 官方仓库 | https://github.com/openclaw/openclaw |

---

## 架构说明

```
openclaw-zh/          ← 本仓库（轻量）
├── translations/     ← 全量汉化词典（源自 OpenClawChineseTranslation，见 ATTRIBUTION.md）
├── patches/          ← package 元数据、品牌替换
├── scripts/          ← apply / bump / publish
├── cli/              ← openclaw-zh-cli
└── .github/workflows/
    ├── nightly.yml         ← 定时发布
    ├── cleanup-failed.yml  ← 删除失败记录
    └── cleanup-all.yml     ← 一键清空全部记录

CI 临时目录 openclaw/  ← 不入库，每次从官方克隆
```

- **上游无变更时跳过构建**（对比 `.github/last-build.json`）
- **npm 发布失败**（如整包删除后 24h 冷却）：写入 `.github/publish-pending.json`，**每小时自动重试**，冷却期内跳过完整构建
- **npm**：`@agentai2026/openclaw-zh`，标签 `@nightly` / `@latest`
- **Docker**：`agentai2027/openclaw-zh`

---

## 快速安装

```bash
# 最新追踪版（每小时构建）
npm install -g @agentai2026/openclaw-zh@nightly

# 稳定版（与 nightly 同步推送 latest 标签时）
npm install -g @agentai2026/openclaw-zh@latest
```

```bash
docker pull agentai2027/openclaw-zh:nightly
docker run -d --name openclaw-zh -p 18789:18789 agentai2027/openclaw-zh:nightly
```

一键脚本见 `deploy/install.sh`、`deploy/install.ps1`。

---

## 版本号规则

| 官方 openclaw | 汉化版 npm |
|---------------|------------|
| `5.2.0` | `5.2.0-zh` |
| `2026.5.30` | `2026.5.30-zh` |

与官方主版本一一对应，只在后面加 **`-zh`**。  
同一官方版本若只改了翻译要重发，可在手动 Run workflow 时设置环境变量 `FORCE_REVISION=1`（会得到 `5.2.0-zh.20260531` 这类后缀）。

---

## 本地开发

```bash
git clone https://github.com/openclaw/openclaw.git openclaw
node cli/index.mjs apply --target=./openclaw
cd openclaw && pnpm install
cd .. && OPENCLAW_TARGET=./openclaw node scripts/regenerate-schema-artifacts.mjs
cd openclaw && pnpm run build
```

---

## 目录结构

| 路径 | 说明 |
|------|------|
| `translations/` | 全量汉化模块（`config.json` 索引 ~194 个 JSON） |
| `translations/ATTRIBUTION.md` | 翻译来源与许可证说明 |
| `patches/package-zh-overlay.json` | npm 描述、仓库链接等 |
| `patches/brand-replace.json` | 品牌文案 |
| `scripts/apply-i18n.js` | 应用词典替换 |
| `scripts/prune-to-overlay.mjs` | 从 git 移除误提交的上游大仓 |

---

## GitHub Secrets

| Secret | 用途 |
|--------|------|
| `NPM_TOKEN` | 发布 npm |
| `DOCKER_PASSWORD` | Docker Hub（用户 **agentai2027**） |
| `PAT` | 可选，用于推送 `last-build.json` |

详细配置见 [SETUP_GUIDE.md](./SETUP_GUIDE.md)。
