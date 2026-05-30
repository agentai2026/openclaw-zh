# OpenClaw 汉化版 — 配置指南

## 仓库架构（参考 OpenClawChineseTranslation）

本仓库 **不提交** 上游 `openclaw/openclaw` 源码。GitHub Actions 在 runner 内克隆官方仓库 → 应用 `translations/` → 构建 → 发布。

## GitHub Secrets

| 名称 | 说明 |
|------|------|
| `NPM_TOKEN` | npm **Automation** 令牌（见下方，不能用普通 Publish 令牌） |
| `DOCKER_PASSWORD` | Docker Hub 密码（账号 **agentai2027**） |
| `PAT` | **必填**（Classic：`repo` + `workflow`）。用于推送 `last-build.json`、**删除 Actions 记录**（`GITHUB_TOKEN` 删记录会 403） |

## 配置 NPM_TOKEN（解决 E403 / 2FA）

若 Actions 里 `发布 npm` 报：

> `403 Forbidden - Two-factor authentication or granular access token with bypass 2fa enabled is required to publish packages`

说明当前 Secret 里的 token **不能用于 CI 发布**，请按下面重做：

### 方式 A：Classic Automation（推荐）

1. 登录 https://www.npmjs.com/ （发布账号需拥有 `@agentai2026` 组织或 scope）
2. 头像 → **Access Tokens** → **Generate New Token** → **Classic Token**
3. 类型选 **Automation**（专为 CI/CD，可在开启 2FA 时发布）
4. 复制 token → GitHub 仓库 **Settings → Secrets → Actions** → 更新 **NPM_TOKEN**

### 方式 B：Granular Access Token

1. **Generate New Token** → **Granular Access Token**
2. Packages：选择 `@agentai2026/openclaw-zh` 或整个 `@agentai2026` scope，权限 **Read and write**
3. 勾选 **Bypass two-factor authentication (2FA)**（或同等「自动化发布」选项）
4. 写入仓库 Secret **NPM_TOKEN**

### 验证

本地（可选）：

```bash
npm whoami --registry=https://registry.npmjs.org/
# 使用 Automation token 作为 NPM_TOKEN 时不应再 E403
```

更新 Secret 后重新运行 **定时发布** workflow。

## 工作流

| 文件 | 作用 |
|------|------|
| `nightly.yml` | **定时发布**（每小时，上游有变才构建） |
| `cleanup-failed.yml` | **删除失败记录**（手动） |
| `cleanup-all.yml` | **一键清空**全部 Actions 记录（手动，需 PAT） |

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
