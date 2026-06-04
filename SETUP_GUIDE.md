<div align="center">

<img src="./docs/assets/openclaw-mascot.png" alt="OpenClaw 吉祥物" width="192" />

# 维护者配置指南

**发 npm、配 GitHub 自动打包 — 大白话版**

[返回 README](./README.md)

</div>

---

## 📋 目录

- [要准备什么](#-要准备什么)
- [NPM_TOKEN 怎么弄](#-npm_token-怎么弄)
- [GitHub 自动任务](#-github-自动任务)
- [npm 包会不会过期](#-npm-包会不会过期)
- [删包注意](#-删包注意)
- [维护清单](#-维护清单)
- [常见报错](#-常见报错)

---

## 🔑 要准备什么

打开仓库密钥页：  
https://github.com/agentai2026/openclaw-zh/settings/secrets/actions  

| Secret 名称 | 填什么 | 干什么 |
|-------------|--------|--------|
| `NPM_TOKEN` | npm 发布令牌 | CI 自动 `npm publish` |
| `DOCKER_PASSWORD` | Docker Hub 密码（用户 **agentai2027**） | 推镜像 |
| `PAT` | GitHub 个人令牌（可选） | 写回 `last-build.json`、清 Actions 记录 |

---

## 🔐 NPM_TOKEN 怎么弄

### 选哪种 Token？

| 类型 | 能发包吗 | 建议 |
|------|----------|------|
| Classic → **Automation** | ✅ | **首选** |
| Classic → Publish | ❌ | 容易 403 要 2FA |
| Granular 细粒度 | ✅ | 需选对包、注意过期 |
| Read only | ❌ | 只能读 |

### Classic Automation（推荐步骤）

1. https://www.npmjs.com/settings/~/tokens  
2. **Generate New Token** → **Classic Token**  
3. 类型选 **Automation**  
4. 复制 `npm_` 开头整串（只显示一次）  
5. 贴到 GitHub `NPM_TOKEN`，不要空格换行  

### Granular 只有 90 天怎么办？

- 选 **90 days**（或 Custom 能选多远选多远）  
- **不是包 3 个月就没了**，只是发布密码过期  
- 日历每 **75 天** 提醒：换新 Token → 更新 Secret → 跑一次「定时检查最新版」  
- **Bypass 2FA**：勾选（CI 必须）  
- 包权限二选一（不要只选「所有包」却把组织设成禁止）：  
  - **Only select packages** → 选 `@agentai2027/openclaw-zh` → Read and write  
  - 或 **All packages**（账号 `agentai2027` 下全部包）→ Read and write  
- 贴到 GitHub：`Settings → Secrets → Actions → NPM_TOKEN`（**不要写进仓库代码**）

### 确认有权发包

- 包页面：https://www.npmjs.com/package/@agentai2027/openclaw-zh（首次发布成功后出现）  
- Token 管理：https://www.npmjs.com/settings/agentai2027/tokens

### 验证是否生效

跑 **定时检查最新版**，步骤 **检查 npm 登录身份** 应显示：  
`[npm] whoami: 你的用户名`

---

## 🤖 GitHub 自动任务

| 工作流 | 何时 | 作用 |
|--------|------|------|
| **定时检查最新版** | 每小时整点 (UTC) | 官方有新版本 → 汉化 → npm + Docker |
| **多平台 Release** | 上一流程成功且该版本尚未有 Release 时 | 5 平台汉化便携包 + 3 平台官方对照包 → [GitHub Releases](https://github.com/agentai2026/openclaw-zh/releases) |

**多平台 Release** 可在 Actions 里 **手动 Run workflow**（用于补打某一版的安装包）。

Windows 汉化版/官方版会额外生成 **`.exe` 安装程序**（Inno Setup，与 zip 便携包一并上传）。

发布成功后会更新 `CHANGELOG.md`；Release 页附带 `latest.json`（各包 SHA256）。

### 怎样算发布成功？

1. publish 日志有 **`[npm] 发布成功`**  
2. 本机：`npm view @agentai2027/openclaw-zh version` 有结果  

只有 build 绿、publish 写冷却 → 用户仍装不上。

---

## 📦 npm 包会不会过期？

| | 会过期吗 |
|---|----------|
| 已发布的 `@agentai2027/openclaw-zh` | **一般不会**，可长期 install |
| `NPM_TOKEN` | **会**（Granular 约 90 天） |
| Actions 的 Artifacts zip | 约 90 天，和 npm 无关 |

---

## ⚠️ 删包注意

- 整包删除后约 **24 小时** 不能同名再发  
- 用户会看到 `404 Unpublished`  
手动删 npm 包：  
https://www.npmjs.com/package/@agentai2027/openclaw-zh → Package settings → Delete package

---

## 📝 改仓库文件时注意

- 文本文件请用 **UTF-8 无 BOM**（根目录有 `.editorconfig`；CI 会跑 `scripts/check-no-bom.mjs`）
- **不要**用 PowerShell `Set-Content -Encoding UTF8` 批量改 JSON（会写入 BOM，导致 `pnpm/action-setup` 失败）

---

## ✅ 维护清单

**每 1～2 周**

- [ ] Actions「定时检查最新版」是否成功  
- [ ] publish 有 `[npm] 发布成功`  
- [ ] `npm view @agentai2027/openclaw-zh version` 正常  

**每 2～3 个月（Granular Token）**

- [ ] 换新 `NPM_TOKEN`  

**官方大版本后**

- [ ] 等「定时检查最新版」跑完，或 Actions 手动触发  
- [ ] 自己装一遍看控制台  
- [ ] 补 `translations/` 漏翻  

---

## 🩹 常见报错

| 现象 | 处理 |
|------|------|
| `403 bypass 2fa` | 换 Classic **Automation** Token |
| `404 Unpublished` | 删包冷却中，等 24h 或别删包 |
| CI 全绿装不上 | 看 publish 是否真发出 |
| `whoami` 失败 | Token 错/过期/多空格 |

---

<div align="center">

**npm 包** · [@agentai2027/openclaw-zh](https://www.npmjs.com/package/@agentai2027/openclaw-zh)

https://www.npmjs.com/package/@agentai2027/openclaw-zh

**可视化面板** · [OpenClaw-Panel](https://github.com/agentai2026/OpenClaw-Panel)

https://github.com/agentai2026/OpenClaw-Panel

---

[返回 README](./README.md)

</div>
