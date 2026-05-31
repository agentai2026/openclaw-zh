# npm 首发 20 版（明天执行清单）

目标：让 [@agentai2026/openclaw-zh](https://www.npmjs.com/package/@agentai2026/openclaw-zh) 上**至少有 20 个可见版本**，之后**不再**每小时自动跟官方全部更新。

## 选哪 20 个？

不是官方最早的 20 个（那太旧、用户用不上），而是 **npm 上官方 `openclaw` 最近 20 个稳定版**（见 `.github/bootstrap-versions.json`），从 `2026.4.23` 到 `2026.5.28`。

## 明天你怎么做（推荐，约 10 分钟人工 + 数小时 CI）

### 前提

- 仓库已推到 GitHub，且 **Actions** 已启用  
- Secrets 里已配置 **`NPM_TOKEN`**（发布用）  
- 若 npm 曾整包 `unpublish`，需等满 **24 小时** 再跑（见 README 常见问题）

### 步骤

1. 打开 GitHub → 本仓库 → **Actions**  
2. 左侧选 **「批量首发（20 版）」**  
3. 点 **Run workflow**  
   - `publish_npm`：保持 **true**  
   - `publish_docker`：建议 **false**（20 个镜像太慢；需要的话之后只对 `2026.5.28-zh` 手动跑一次「指定版本汉化」并开 Docker）  
   - `skip_policy_lock`：保持 **false**（跑完会自动关掉定时跟官方）  
4. 等 workflow 跑完（**顺序**触发 20 次「指定版本汉化」，单次约 30–90 分钟，总计可能 **10–20+ 小时**）  
5. 完成后检查：  
   - [npm 包页面](https://www.npmjs.com/package/@agentai2026/openclaw-zh) 应能看到多个 `x.x.x-zh`  
   - `.github/release-policy.json` 里 `follow_upstream` 应为 **`false`**  
   - **「定时发布」** 之后每小时只会检查，**不会再**因官方新版本自动全量构建  

### 若只想先打 1 个包试水

Actions → **「指定版本汉化」** → 填 `2026.5.28` → Run。

## 给 Cursor / 代理的「明天任务」提示词

新开对话，粘贴：

```text
请按仓库 docs/BOOTSTRAP_20.md 协助我：
1. 确认 NPM_TOKEN 与 npm 未处于 unpublish 冷却；
2. 说明如何在 GitHub Actions 运行「批量首发（20 版）」；
3. 跑完后帮我核对 npm 上是否已有约 20 个 *-zh 版本，以及 release-policy.json 是否已 follow_upstream=false。
不要继续跟官方后续新版本，除非我明确要求。
```

## 之后还想发新版怎么办？

- **手动**：Actions →「指定版本汉化」→ 填官方版本号  
- **恢复自动跟官方**：把 `.github/release-policy.json` 里 `follow_upstream` 改回 `true` 并提交（不推荐，除非你又要长期同步）

## 说明

- 批量任务**不能**在本机 Cursor 里“睡到明天自动跑”，必须靠 **GitHub Actions**（或你明天手动点 Run）。  
- 我（代理）无法在对话里跨天自动执行；上面工作流和本文档是为明天准备的**一键方案**。
