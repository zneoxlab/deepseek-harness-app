<p align="center">
  <img src="assets/screenshots/home.png" alt="DeepSeek Harness App" width="128" height="128" style="border-radius: 18px;" />
</p>

<h1 align="center">DeepSeek Harness App</h1>

<p align="center"><strong>DeepSeek Harness 跨平台桌面客户端</strong></p>
<p align="center"><em>以官方 dsh Web UI 为底座的原生外壳 —— 融合标题栏、托盘常驻、带更新管理的设置页（简称 <code>dsh-app</code>）</em></p>

<p align="center">
  <a href="./README.md">English</a> ·
  <a href="./README.zh.md">中文</a>
</p>

<p align="center">
  <a href="https://github.com/zneoxlab/deepseek-harness-app"><img src="https://img.shields.io/badge/源码-GitHub-4d7cfe" alt="GitHub" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License" /></a>
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey" alt="Platforms" />
  <img src="https://img.shields.io/badge/Tauri-2-orange" alt="Tauri 2" />
  <img src="https://img.shields.io/badge/note-unofficial-yellow" alt="Unofficial" />
</p>

---

> [!NOTE]
> **DeepSeek Harness App（dsh-app）不是 DeepSeek 官方产品。** 它把本地的 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（`dsh`）CLI 封装成桌面应用：自动检测本机的 dsh 安装，必要时启动带插件的 `dsh web`，并给官方 Web UI 补上它应有的桌面体验 —— 融合标题栏、托盘常驻，以及（规划中的）通知、开机自启、全局快捷键和连接模式。

---

## 为什么不全量重写？

官方 `dsh` 自带**功能完整的 Web UI**（会话、项目、权限、技能、插件、媒体全在里面）。而官方 ACP 服务（`@deepseek-ai/dsh-acp`）是 automation-only：只能创建全新会话，无法加载/列出/恢复/分叉已有会话，撑不起一个完整的桌面指挥台。

所以 **DeepSeek Harness App 选择在官方 Web UI 之上做增强，而不是重造前端**：我们只补浏览器给不了的东西 —— 原生外壳、托盘常驻、桌面集成。

## 目录

1. [功能特性](#功能特性)
2. [截图](#截图)
3. [连接原理](#连接原理)
4. [安装](#安装)
5. [首次运行与排障](#首次运行与排障)
6. [开发与构建](#开发与构建)
7. [测试失败场景](#测试失败场景)
8. [项目结构](#项目结构)
9. [路线图](#路线图)
10. [许可](#许可)

---

## 功能特性

| 领域 | 你会得到 |
|------|----------|
| **智能连接** | 自动检测 dsh CLI（DSH_BIN → npm 全局 → PATH）；`127.0.0.1:3080` 上已有**带桌面桥**的实例则复用，否则自启 `dsh --profile dsh-app --port 0` 随机端口（你手动起的普通 `dsh web` 不受影响） |
| **dsh CLI 检测** | 缺少 CLI 时显示安装向导 —— 复制安装命令，一键重新检测 |
| **融合标题栏** | 无边框窗口（`decorations: false`）；最小化 / 最大化 / 关闭、拖拽区和实时**已连接 / 未连接**状态点都在 WebUI 内。颜色跟随官方主题（深色 / 浅色 / 跟随系统） |
| **DSH App 设置页** | 注册进官方设置面板的页面：关于信息（应用版本、dsh CLI 版本/来源、服务地址、开源地址）+ 基于 **GitHub Releases 的更新管理** |
| **系统托盘** | 关窗隐藏到托盘；左键单击唤出窗口；Quit 时整树清理 dsh 进程（不留孤儿） |
| **单实例** | 重复启动只聚焦已有窗口，不再起新服务 |
| **Windows 就绪** | `DSH_PERMISSION_MODE` 未设置时自动回退 `danger-full-access`（Windows 无 confinement 后端） |
| **多语言** | UI 跟随系统语言（简体中文 / English），包括 DSH App 设置页 |
| **原生图标** | 官方 dsh 鲸鱼图标，全平台统一 |

**规划中（P1）：** 桌面通知 · 开机自启 · 全局快捷键 · 连接模式（远程/容器 Web UI）

桌面增强全部通过官方 **DSH 插件机制**（`dsh-app-bridge`，oh-dsh 路线）注入：应用独占一个 `dsh-app` profile 加载桥插件 —— 你自己的 `web` profile 完全不被改动。

---

## 截图

> 来自当前 Windows 开发构建。

| 启动 —— 检测 CLI | dsh CLI 缺失 —— 安装向导 |
|:---:|:---:|
| ![检测 CLI](assets/screenshots/detecting-cli.png) | ![CLI 缺失](assets/screenshots/cli-missing.png) |

| 首页 —— 外壳内的官方 dsh Web UI |
|:---:|
| ![首页](assets/screenshots/home.png) |

---

## 连接原理

```
应用启动
  │
  ├─ 前端检测 dsh CLI（dsh_detect）
  │     ├─ 找到   → 调用 dsh_connect
  │     └─ 缺失   → 显示安装向导（稳定停留，不会被抢跑）
  │
  ├─ dsh_connect：127.0.0.1:3080 带桌面桥吗？
  │     （GET /dsh-app/status → {"ok":true}）
  │     ├─ 有 → 直接复用（浏览器与桌面共享同一个 dsh 进程）
  │     └─ 无 → 自启 `dsh --profile dsh-app --port 0`
  │              （应用独占 profile，控制台窗口隐藏，随机端口不冲突），
  │              解析就绪行后窗口自动跳转
  │
  └─ 托盘 Quit → taskkill 整树清理
```

连接由**前端检测结果驱动**（而非 Rust 启动时自动连接），所以安装向导永远不会被快速竞态跳过。只有**带桌面桥**的实例才会被复用 —— 你为浏览器开发手动起的普通 `dsh web` 会被忽略，应用另起自己的带插件实例。

---

## 安装

### 1. 获取应用

从 [Releases](https://github.com/zneoxlab/deepseek-harness-app/releases) 下载对应平台安装包（Windows NSIS、macOS DMG、Linux AppImage/deb —— 随构建发布逐步提供）。

### 2. 安装 dsh CLI

DeepSeek Harness App **不自带** `dsh`，它检测你机器上的安装：

```bash
npm install -g @deepseek-ai/dsh
```

也可以设置 `DSH_BIN` 指向 dsh 可执行文件（例如本地构建的 `lib/bin.js`）。

装完直接启动应用，它会自动连接。

---

## 首次运行与排障

**明明装了 dsh，还显示"需要安装 dsh CLI"** —— 应用在启动时探测一次，点击 **"我已安装，重新检测"** 即可重新扫描。

**Windows 权限警告** —— `DSH_PERMISSION_MODE` 未设置时，应用会回退到 `danger-full-access`（Windows 没有 confinement 后端）并打一条警告日志。想用其他模式请显式设置。

**终端里 `dsh` 能用但应用找不到** —— 检查 `npm root -g`；如果全局目录不在 PATH 上，把 `DSH_BIN` 设为 `%APPDATA%\npm\node_modules\@deepseek-ai\dsh\lib\bin.js`（Windows）或对应路径。

---

## 开发与构建

要求：Node 20+、Rust stable、本机已安装 `@deepseek-ai/dsh`（或设置 `DSH_BIN`）。

```sh
npm install
npm run tauri dev        # 开发运行（热更新）
npm run tauri build      # 发布构建（Windows 默认 NSIS）
```

只打 NSIS（跳过 MSI/WiX）：

```sh
npm run tauri build -- --bundles nsis
```

单独重建桥插件 bundle（应用以外部文件形式携带它）：

```sh
cd dsh-app-bridge && npm run build
```

---

## 测试失败场景

设置环境变量 `DSH_APP_MOCK` 可模拟不同启动状态：

| 值 | 效果 |
|---|---|
| （不设置） | 正常流程 |
| `missing-cli` | 模拟未安装 dsh CLI → 安装向导 |
| `no-server` | 模拟 3080 无实例且自启失败 → 连接错误 |

PowerShell：

```powershell
$env:DSH_APP_MOCK = "missing-cli"; .\src-tauri\target\release\dsh-app.exe
```

---

## 项目结构

```
dsh-app/
├─ src/                 # React + TS 前端（浅色 splash / 连接状态）
│  ├─ App.tsx           # 检测驱动的连接流程
│  ├─ TitleBar.tsx      # splash 阶段融合标题栏（最小化/最大化/关闭 + 拖拽）
│  └─ i18n.ts           # 系统语言 UI（中/英）+ 错误码本地化
├─ dsh-app-bridge/      # 注入官方 Web UI 的 cordis 插件
│  ├─ src/server.ts     #   /dsh-app/status 标记端点（桌面桥探测）
│  ├─ src/client/index.tsx
│  │                    #   融合标题栏 + 连接状态点 + 主题同步，
│  │                    #   "DSH App" 设置页（关于 + GitHub 更新检查）
│  ├─ scripts/build.mjs #   client bundle（factory 包装）+ server bundle
│  └─ cordis.patch.yml  #   bundle 层（loader insert 行）
├─ src-tauri/
│  ├─ src/lib.rs        # Rust 外壳：托盘、单实例、智能连接、整树清理、
│  │                    #   dsh-app profile 引导、窗口控制与 app_info 命令
│  ├─ src/connect.rs    #（P1）连接模式与设置存储
│  ├─ src/notify.rs     #（P1）桌面通知
│  ├─ src/desktop.rs    #（P1）开机自启与全局快捷键
│  ├─ capabilities/     # IPC ACL：应用命令 + 远程 127.0.0.1 访问授权
│  └─ tauri.conf.json   # 窗口 / 打包配置
├─ assets/screenshots/  # 本 README 使用的截图
└─ docs/                # 设计文档与修复记录
```

---

## 路线图

- **P0（已完成）** — 最小可用壳：智能连接、单实例、托盘、整树清理、CLI 检测向导、多语言
- **P2（核心已完成）** — 通过 DSH 插件机制（`dsh-app-bridge`）实现桌面融合：融合标题栏（含连接状态）、"DSH App" 设置页（关于 + GitHub Releases 更新管理）、应用独占 `dsh-app` profile
- **P1** — 桌面通知、开机自启、全局快捷键、连接模式（设计与代码骨架在 `docs/P1-design.md`，合入清单在 `docs/P1-integration-checklist.md`）
- **P2（后续）** — 插件路线上的更多工作台：PTY 终端、Git Review、插件市场

---

## 许可

[MIT](LICENSE) © dsh-app contributors
