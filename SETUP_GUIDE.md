# OpenClaw 汉化版 — 配置指南

## GitHub Secrets

| 名称 | 说明 |
|------|------|
| `NPM_TOKEN` | npm **Classic → Automation** 令牌（见下） |
| `DOCKER_PASSWORD` | Docker Hub 密码（账号 **agentai2027**） |
| `PAT` | Classic：`repo` + `workflow`（删 Actions 记录、推送 last-build） |

---

## 修复 npm 发布 E403（必做）

日志里若出现：

```text
403 Forbidden - bypass 2fa enabled is required to publish packages
```

说明 **NPM_TOKEN 类型不对**，请严格按下面做（不要用 Publish、不要用只读 token）。

### 第 1 步：确认 npm 账号能发 `@agentai2026`

1. 浏览器打开 https://www.npmjs.com/settings/agentai2026/packages  
   （或你的用户名 → Organizations → `agentai2026`）
2. 必须能登录**拥有该组织/scope 的账号**；若没有组织，先在 npm 创建 org 名 `agentai2026`，或把包名改成你账号下的 scope。

### 第 2 步：生成 Classic **Automation** 令牌

1. https://www.npmjs.com/settings/~/tokens  
2. **Generate New Token** → **Classic Token**（不要选 Granular，除非你很熟悉）
3. Token type 一定选 **Automation**（图标/说明里写 For CI/CD）
4. 复制以 `npm_` 开头的整串（只显示一次）

| 类型 | CI 能否发布 |
|------|-------------|
| **Automation** | 可以（推荐） |
| Publish | 不行（要 2FA，会 E403） |
| Read only | 不行 |

### 第 3 步：写入 GitHub Secret

1. https://github.com/agentai2026/openclaw-zh/settings/secrets/actions  
2. 编辑 **NPM_TOKEN** → 粘贴新 token → **Update**  
3. 不要有多余空格或换行

### 第 4 步：重新运行

Actions → **定时发布** → **Run workflow** → 勾选 **force_build**（可选）→ Run  

在 **检查 npm 登录身份** 步骤应看到：`[npm] whoami: 你的npm用户名`  
若 whoami 失败，说明 Secret 没配对。

---

## 工作流

| 工作流 | 作用 |
|--------|------|
| 定时发布 | 每小时，上游有变则构建并发布 npm + Docker |
| 删除失败记录 | 手动清理失败/取消的运行 |
| 一键清空记录 | 手动清空全部 Actions 历史（需 PAT） |

## 本地汉化

```bash
git clone https://github.com/openclaw/openclaw.git openclaw
node cli/index.mjs apply --target=./openclaw
```

## 安装

```bash
npm install -g @agentai2026/openclaw-zh@nightly
docker pull agentai2027/openclaw-zh:nightly
```
