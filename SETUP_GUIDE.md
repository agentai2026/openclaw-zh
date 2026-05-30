# OpenClaw 汉化版 — 配置指南

## 仓库架构（参考 OpenClawChineseTranslation）

本仓库 **不提交** 上游 `openclaw/openclaw` 源码。GitHub Actions 在 runner 内克隆官方仓库 → 应用 `translations/` → 构建 → 发布。

## GitHub Secrets

| 名称 | 说明 |
|------|------|
| `NPM_TOKEN` | npm 发布令牌（Automation） |
| `DOCKER_PASSWORD` | Docker Hub 密码（账号 **agentai2027**） |
| `PAT` | 可选，用于推送 `.github/last-build.json` |

## 工作流

| 文件 | 作用 |
|------|------|
| `build-core.yml` | 可复用：克隆 + 汉化 + 构建 + 产物 |
| `nightly.yml` | 每小时检测上游变更 → 调用 build-core → npm + Docker |
| `cleanup-runs.yml` | 清理失败的工作流运行 |

## 本地维护

```bash
# 仅保留 overlay 的 git 索引（误提交大仓后）
node scripts/reset-overlay-git.mjs

# 对本地克隆的上游应用汉化
git clone https://github.com/openclaw/openclaw.git openclaw
node cli/index.mjs apply --target=./openclaw
```

## 安装验证

```bash
npm install -g @agentai2026/openclaw-zh@nightly
openclaw --version
```

```bash
docker pull agentai2027/openclaw-zh:nightly
```
