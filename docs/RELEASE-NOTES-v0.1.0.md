# Release Notes — v0.1.0

> 复制本文件内容到 GitHub Release 发布说明框（支持 Markdown）。

---

## 🚀 DeepSeek Harness App v0.1.0 — 首个正式版本

DeepSeek Harness App（dsh-app）是 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的**非官方**跨平台桌面客户端：以官方 `dsh` Web UI 为底座的原生外壳，只补浏览器给不了的东西 —— 融合标题栏、托盘常驻、带更新管理的设置页。

### ✨ 本版本亮点

**桌面外壳（P0）**
- 🔌 智能连接：自动检测 dsh CLI（`DSH_BIN` → npm 全局 → PATH）；复用带桌面桥的实例，否则静默拉起独立的 `dsh-app` profile 实例（随机端口、隐藏控制台窗口）
- 📦 未安装 dsh CLI 时显示安装向导（复制命令 + 一键重新检测）
- 🗔 系统托盘：关窗隐藏到托盘，Quit 时整树清理 dsh 进程（不留孤儿）
- 🔁 单实例锁：重复启动只聚焦已有窗口
- 🪟 Windows 就绪：未设置 `DSH_PERMISSION_MODE` 时自动回退 `danger-full-access`
- 🌐 多语言界面（简体中文 / English，跟随系统）

**桌面融合（P2 核心，通过官方插件机制 dsh-app-bridge）**
- 🪟 **融合标题栏**：无边框窗口；最小化 / 最大化 / 关闭、拖拽区与实时**已连接 / 未连接**状态点全部内嵌在 WebUI 中，颜色跟随官方主题（深色 / 浅色 / 跟随系统）
- ⚙️ **"DSH App" 设置页**：注册进官方设置面板 —— 应用版本、dsh CLI 版本/来源、服务地址、**开源地址**，以及基于 **GitHub Releases 的更新管理**（检查更新 → 发现新版本 → 一键前往下载）
- 🔒 应用独占 `dsh-app` profile，**从不改动**你自己的 `web` profile

### 📦 安装

1. 下载对应平台的安装包（见下方 Assets）
2. 安装 dsh CLI：`npm install -g @deepseek-ai/dsh`（应用不自带 dsh，检测本机安装；也可用 `DSH_BIN` 指定路径）
3. 启动应用，自动连接

### 📥 下载

| 平台 | 安装包 |
|------|--------|
| Windows | `dsh-app_0.1.0_x64-setup.exe`（NSIS 安装器）|
| macOS | `dsh-app_0.1.0_x64.dmg`（Apple Silicon）|
| Linux | `dsh-app_0.1.0_amd64.deb` / `.AppImage` |

> macOS / Linux 产物由 CI 构建，未经签名（macOS 首次打开需右键 → 打开）。

### ⚠️ 已知限制

- macOS/Linux 构建产物未经签名/公证
- 桌面通知、开机自启、全局快捷键、远程连接模式规划在 P1（详见 README 路线图）
- 更新检查针对本应用（dsh-app）的 GitHub Releases；dsh CLI 自身的更新请用 `npm update -g @deepseek-ai/dsh`

### 🙏 关于

- 源码：[github.com/zneoxlab/deepseek-harness-app](https://github.com/zneoxlab/deepseek-harness-app)
- 本项目**不是** DeepSeek 官方产品，请勿就本应用向官方反馈问题
- License: MIT
