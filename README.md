<div align="center">

# OpenClaw 汉化版

<img src="./docs/assets/openclaw-mascot.png" alt="OpenClaw 吉祥物" width="280" />

[![npm](https://img.shields.io/npm/v/@agentai2027/openclaw-zh?label=npm)](https://www.npmjs.com/package/@agentai2027/openclaw-zh)
[![Docker](https://img.shields.io/badge/docker-agentai2027%2Fopenclaw--zh-2496ED?logo=docker&logoColor=white)](https://hub.docker.com/r/agentai2027/openclaw-zh)
[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D22-339933?logo=node.js&logoColor=white)](https://nodejs.org/)

<p><strong>OpenClaw 中文界面 · 一键安装 · 自动跟进官方更新</strong></p>

[功能特性](#-功能特性) ·
[安装](#-安装) ·
[快速开始](#-快速开始) ·
[功能面板](#-可视化功能面板) ·
[常见问题](#-常见问题) ·
[参与开发](#-参与开发) ·
[维护指南](./SETUP_GUIDE.md)

</div>

---

## 📖 简介

本项目把开源 AI 助手 **[OpenClaw](https://github.com/openclaw/openclaw)** 做成**中文界面**的安装包，终端和网页控制台都能用中文。

- **普通用户**：`npm install` 装完就能用，不用自己编译。  
- **维护者**：本仓库只放「翻译 + 脚本」，真正的官方代码在打包时自动下载。  

> ⚠️ **说明**：这是社区汉化发行版，**不是** OpenClaw 官方出品。使用问题请在本仓库提 [Issue](https://github.com/agentai2026/openclaw-zh/issues)。

| | 链接 |
|---|------|
| 汉化仓库（本仓库） | https://github.com/agentai2026/openclaw-zh |
| 可视化功能面板 | https://github.com/agentai2026/OpenClaw-Panel |
| 官方上游 | https://github.com/openclaw/openclaw |
| 官方文档 | https://docs.openclaw.ai |

---

## ✨ 功能特性

| | 说明 |
|---|------|
| 🇨🇳 **全中文界面** | 控制台、设置、向导、CLI 等大量文案已汉化 |
| 📦 **npm 一键安装** | 包名 `@agentai2027/openclaw-zh`，和装普通软件一样 |
| 🔄 **自动跟官方** | 定时检测官方新版本，有更新就自动打包（见 Actions） |
| 🧩 **功能面板** | 控制台顶部齿轮：帮助、快捷指令、插件、更新日志（源码另见 [OpenClaw-Panel](https://github.com/agentai2026/OpenClaw-Panel)） |
| 🐳 **Docker 镜像** | `agentai2027/openclaw-zh`，不想装 Node 也能跑 |
| 🛠️ **可自己改翻译** | 改 `translations/` 里的 JSON，再执行脚本刷进源码 |

---

## 📥 安装

**环境要求：Node.js 22 或以上**

### npm（推荐）

```bash
# 跟踪最新构建（约每小时更新）
npm install -g @agentai2027/openclaw-zh@nightly

# 稳定标签（发布成功时与 nightly 一致）
npm install -g @agentai2027/openclaw-zh@latest
```

```bash
# 更新到最新汉化版
npm update -g @agentai2027/openclaw-zh
```

```bash
# 若装过官方 openclaw，建议先卸再装汉化版
npm uninstall -g openclaw
npm install -g @agentai2027/openclaw-zh@latest
```

### Docker

```bash
docker pull agentai2027/openclaw-zh:nightly
docker run -d --name openclaw-zh -p 18789:18789 agentai2027/openclaw-zh:nightly
```

### Windows 一键脚本

```powershell
irm https://raw.githubusercontent.com/agentai2026/openclaw-zh/main/deploy/install.ps1 | iex
```

Linux / macOS 见仓库 [`deploy/install.sh`](./deploy/install.sh)。

---

## 🚀 快速开始

```bash
# 1. 第一次：跑初始化向导（配模型、密钥等）
openclaw onboard

# 2. 启动服务
openclaw gateway run
```

浏览器打开：**http://127.0.0.1:18789**

控制台右上角 **⚙️ 齿轮** → 打开 **功能面板**（帮助、快捷指令、关于等）。

功能面板的说明与独立仓库：[**agentai2026/OpenClaw-Panel**](https://github.com/agentai2026/OpenClaw-Panel)（OpenClaw 可视化面板）。汉化安装包里已内置，无需单独安装。

---

## 🧩 可视化功能面板

控制台里的 **「功能面板」**（点齿轮打开）是本汉化版自带的能力，包含：

- 帮助文档（FAQ）
- 快捷指令（重启网关、检测更新等）
- 插件说明、更新日志、关于

| | |
|---|---|
| **面板独立仓库** | https://github.com/agentai2026/OpenClaw-Panel |
| **在本项目中的位置** | `overlay/panel/`（构建时自动打进汉化包） |

想单独改面板样式或文案：可改 [OpenClaw-Panel](https://github.com/agentai2026/OpenClaw-Panel) 或本仓库 `overlay/panel/`，再重新 `apply` 并 `ui:build`。

---

## 📌 版本号对照

汉化版在官方版本后面加 `-zh`，一眼能看出对应关系：

| 官方 openclaw | 汉化版 npm |
|---------------|------------|
| `5.2.0` | `5.2.0-zh` |
| `2026.5.30` | `2026.5.30-zh` |

查当前线上版本：

```bash
npm view @agentai2027/openclaw-zh version
```

---

## ⌨️ 常用命令

| 命令 | 干什么 |
|------|--------|
| `openclaw onboard` | 第一次配置向导 |
| `openclaw gateway run` | 启动网关（控制台要用） |
| `openclaw dashboard --print-url` | 打印带 token 的控制台地址 |
| `openclaw doctor` | 检查配置有没有问题 |
| `openclaw doctor --fix --non-interactive --yes` | 尝试自动修复常见问题 |
| `openclaw status` | 看运行状态 |

---

## 📁 仓库结构（给开发者）

本仓库**没有**完整 OpenClaw 源码，只有汉化层：

```
openclaw-zh/
├── translations/      # 中文翻译（按模块分 JSON）
├── overlay/panel/     # 控制台「功能面板」
├── patches/           # 包名、品牌等补丁
├── scripts/           # 应用汉化、发布脚本
├── cli/               # 本地命令行工具
└── .github/workflows/ # 自动打包发布
```

打包时临时生成 `openclaw/` 目录（从官方克隆），**不会提交到 Git**。

| 目录 / 文件 | 说明 |
|-------------|------|
| `translations/config.json` | 翻译文件索引 |
| `overlay/panel/panel-data.json` | 功能面板文案（FAQ、快捷指令等） |
| `scripts/apply-i18n.js` | 把翻译写入官方源码 |
| `scripts/apply-feature-panel.mjs` | 注入功能面板 |
| [OpenClaw-Panel](https://github.com/agentai2026/OpenClaw-Panel) | 可视化面板相关独立仓库 |

---

## 🤖 自动发布（维护者简略）

在 GitHub **Actions** 里可手动运行：

| 工作流 | 干什么 |
|--------|--------|
| **定时发布** | 每小时看官方有没有新版本，有就构建并发 npm / Docker |
| **指定版本汉化** | 手动填官方版本号（如 `2026.5.28`），打指定版汉化包 |
| **删除已发布包** | ⚠️ 危险：删 npm/Docker，删后约 24h 不能同名再发 |

详细配置（NPM_TOKEN、密钥、报错处理）见 **[SETUP_GUIDE.md](./SETUP_GUIDE.md)**。

### 每次更新写清楚「改了什么」

npm 发布成功后，CI 会自动：

1. 往仓库根目录 **[CHANGELOG.md](./CHANGELOG.md)** 追加一条记录  
2. 用规范的 **Git 提交说明** 推送到本仓库（控制台「功能面板 → 更新日志」会读这些提交）

| 场景 | 自动生成的提交示例 |
|------|-------------------|
| 官方出新版本 | `feat: 适配上游 v2026.5.28，发布汉化版 2026.5.28-zh` |
| 同版本只改翻译/面板 | `chore: 重发汉化 2026.5.28-zh.20260531（翻译/面板/脚本更新）` |

手动跑 **指定版本汉化** 时，可在「补充更新说明」里写一句，例如：`修复 111 处失效锚点`、`同步 mediaInput schema`。  
本地改翻译后想发同版本新版：勾选 **同版本重发**，或等定时任务自动加日期后缀。

---

## ❓ 常见问题

<details>
<summary><b>npm 安装报 404 / ETARGET / Unpublished？</b></summary>

多半是 npm 上**还没发布成功**，或**刚删过整包**（要等约 24 小时才能再发同名包）。  
到 [npm 包页面](https://www.npmjs.com/package/@agentai2027/openclaw-zh) 看有没有版本；或等 CI 跑完「定时发布」且日志出现 `[npm] 发布成功`。

</details>

<details>
<summary><b>装上了但界面还是英文？</b></summary>

可能官方刚改了大版本，部分新文案还没翻译。欢迎提 Issue 说明页面位置；维护者补 `translations/` 后发新版。

</details>

<details>
<summary><b>和官方 openclaw 能同时装吗？</b></summary>

不建议。先 `npm uninstall -g openclaw`，再装 `@agentai2027/openclaw-zh`。

</details>

<details>
<summary><b>功能面板（齿轮）没有？</b></summary>

需要带功能面板的构建。用最新汉化包，或从 Actions 下载最近成功的 **Artifacts** 解压运行，并执行过 `pnpm ui:build`。

</details>

<details>
<summary><b>远程打不开控制台？</b></summary>

一般需要设置网关令牌，并允许局域网访问。功能面板「帮助文档」里有说明；也可查官方文档 gateway 相关章节。

</details>

---

## 🧑‍💻 参与开发

```bash
git clone https://github.com/agentai2026/openclaw-zh.git
cd openclaw-zh
git clone https://github.com/openclaw/openclaw.git openclaw

# 应用汉化 + 功能面板
node cli/index.mjs apply --target=./openclaw

# 编译（需 pnpm、Node 22+）
cd openclaw && corepack enable && pnpm install --no-frozen-lockfile
cd .. && set OPENCLAW_TARGET=openclaw && node scripts/regenerate-schema-artifacts.mjs
cd openclaw && pnpm run build && pnpm ui:build

# 本地运行
node openclaw.mjs gateway run
```

改翻译后重复 `apply`，改网页相关要再 `pnpm ui:build`。

---

## 📄 许可证

- 本仓库脚本与翻译配置：[MIT](./LICENSE)  
- OpenClaw 本体：遵循 [官方仓库](https://github.com/openclaw/openclaw) 许可证  

---

<div align="center">

**如果觉得有用，欢迎 Star ⭐**

---

**npm 汉化包**

[@agentai2027/openclaw-zh](https://www.npmjs.com/package/@agentai2027/openclaw-zh)

https://www.npmjs.com/package/@agentai2027/openclaw-zh

```bash
npm install -g @agentai2027/openclaw-zh@latest
```

**可视化功能面板仓库**

[agentai2026/OpenClaw-Panel](https://github.com/agentai2026/OpenClaw-Panel)

https://github.com/agentai2026/OpenClaw-Panel

---

[提交 Issue](https://github.com/agentai2026/openclaw-zh/issues) ·
[npm 包](https://www.npmjs.com/package/@agentai2027/openclaw-zh) ·
[可视化面板](https://github.com/agentai2026/OpenClaw-Panel) ·
[维护者配置](./SETUP_GUIDE.md) ·
[OpenClaw 官方](https://github.com/openclaw/openclaw)

</div>
