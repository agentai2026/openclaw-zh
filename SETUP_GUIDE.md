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
- 日历每 **75 天** 提醒：换新 Token → 更新 Secret → 跑一次「定时发布」  
- **Bypass 2FA**：勾选（CI 必须）  
- 包权限二选一（不要只选「所有包」却把组织设成禁止）：  
  - **Only select packages** → 选 `@agentai2026/openclaw-zh` → Read and write  
  - 或 **Organizations** → `agentai2026` → **Read and write**（用 `agentai2027` 登录时尤其需要）  
- 贴到 GitHub：`Settings → Secrets → Actions → NPM_TOKEN`（**不要写进仓库代码**）

### 确认有权发包

- 包在组织下：https://www.npmjs.com/settings/agentai2026/packages  
- 登录账号设置：https://www.npmjs.com/settings/agentai2027/tokens（若你用 agentai2027 账号建 token）

### 验证是否生效

跑 **定时发布**，步骤 **检查 npm 登录身份** 应显示：  
`[npm] whoami: 你的用户名`

---

## 🤖 GitHub 自动任务

| 工作流 | 何时 | 作用 |
|--------|------|------|
| 定时发布 | 每小时 | 官方有更新 → 构建 → npm + Docker |
| 指定版本汉化 | 手动 | 填版本号如 `2026.5.28` |
| 删除失败记录 | 手动 | 清理失败 Actions |
| 一键清空记录 | 手动 | 清空全部历史（要 PAT） |
| 删除已发布包 | 手动 | ⚠️ 删 npm/Docker |

### 指定版本汉化 · 参数

| 参数 | 说明 |
|------|------|
| `upstream_version` | 官方版本号，如 `2026.5.28` |
| `force_revision` | 同版本只改翻译再发（加日期后缀） |
| `release_note` | （可选）补充一句，写入 Git 提交与 `CHANGELOG.md` |
| `publish_npm` | 是否发 npm |
| `publish_docker` | npm 成功后才推 Docker |

发布成功后会自动生成类似 `feat: 适配上游 v2026.5.28，发布汉化版 …` 的提交说明，并更新根目录 `CHANGELOG.md`；用户可在控制台功能面板的「更新日志」里看到。

### 怎样算发布成功？

1. publish 日志有 **`[npm] 发布成功`**  
2. 本机：`npm view @agentai2026/openclaw-zh version` 有结果  

只有 build 绿、publish 写冷却 → 用户仍装不上。

---

## 📦 npm 包会不会过期？

| | 会过期吗 |
|---|----------|
| 已发布的 `@agentai2026/openclaw-zh` | **一般不会**，可长期 install |
| `NPM_TOKEN` | **会**（Granular 约 90 天） |
| Actions 的 Artifacts zip | 约 90 天，和 npm 无关 |

---

## ⚠️ 删包注意

- 整包删除后约 **24 小时** 不能同名再发  
- 用户会看到 `404 Unpublished`  
- 没事别用 **删除已发布包**；确认框要输入 `DELETE`

手动删：  
https://www.npmjs.com/package/@agentai2026/openclaw-zh → Package settings → Delete package

---

## ✅ 维护清单

**每 1～2 周**

- [ ] Actions「定时发布」是否成功  
- [ ] publish 有 `[npm] 发布成功`  
- [ ] `npm view @agentai2026/openclaw-zh version` 正常  

**每 2～3 个月（Granular Token）**

- [ ] 换新 `NPM_TOKEN`  

**官方大版本后**

- [ ] 跑「指定版本汉化」  
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

**npm 包** · [@agentai2026/openclaw-zh](https://www.npmjs.com/package/@agentai2026/openclaw-zh)

https://www.npmjs.com/package/@agentai2026/openclaw-zh

**可视化面板** · [OpenClaw-Panel](https://github.com/agentai2026/OpenClaw-Panel)

https://github.com/agentai2026/OpenClaw-Panel

---

[返回 README](./README.md)

</div>
