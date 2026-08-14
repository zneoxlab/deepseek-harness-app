# Release Notes — v0.1.1

> 复制本文件内容到 GitHub Release 发布说明框（支持 Markdown）。

<p align="left">
  <a href="./RELEASE-NOTES-v0.1.1.md">English</a> ·
  <a href="./RELEASE-NOTES-v0.1.1.zh.md">中文</a>
</p>

---

## 🚀 DeepSeek Harness App v0.1.1 — 应用内一键配好环境

DeepSeek Harness App（dsh-app）是 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的**非官方**跨平台桌面客户端：以官方 `dsh` Web UI 为底座的原生外壳，只补浏览器给不了的东西 —— 融合标题栏、托盘常驻、带更新管理的设置页。

### ✨ v0.1.1 新增 — 装完 App，环境在应用内一键装好

- 🪜 **分步检测**：启动后依次检测 `node` → `npm` → `dsh`，每项显示状态（版本/路径）
- 🖱️ **一键安装 Node**：Node 缺失时一键下载官方预编译版到 `~/.dsh-app/node` —— **免管理员、不改系统**
- 🖱️ **一键安装 dsh**：`npm install -g @deepseek-ai/dsh`（有系统 npm 用系统的，否则用应用托管的 npm，装到 `~/.dsh-app/npm-global`）
- ⛓️ **自动衔接**：Node → dsh 依次装完 → 自动连接。下载 App 后几乎不用手动操作即可用起来
- 🌏 **国内镜像退避**：系统语言为中文 **且** 时区为中国时，下载优先走 npmmirror 国内镜像，镜像不可用自动退到官方源
- 📺 向导内置实时安装日志与分步状态

其余能力与 v0.1.0 一致（智能连接、系统托盘、融合标题栏、设置页、中英双语）。

### 🔧 本版修复

- 🔓 **一键安装命令被 ACL 拦截**：`env_detect` / `install_node` / `install_dsh` 补入权限清单与 capability 白名单（此前点击安装会报 `Command install_node not allowed by ACL`）
- 🪟 **Windows 上 Node 解压布局错误**：改用系统自带 tar（bsdtar）解压并拍平顶层目录（此前 `Expand-Archive` 会保留 zip 顶层文件夹，导致 Node 安装后验证失败）
- 🌏 **Windows 时区识别**：新增注册表时区检测（中国标准时间），中文 + 中国时区的 Windows 机器现在会正确走国内镜像
- 🪟 **Windows `.cmd` 执行**：npm/dsh 的 `.cmd` shim 改为经 `cmd /C` 执行（此前报"不是有效的 Win32 应用程序"，os error 193）
- 🔗 **Windows bridge 链接**：mklink 参数加引号（安装到 `Program Files` 等含空格路径时 junction 才能建成），失败即报错
- 🩺 **启动失败不再盲超时**：连接超时会带出 dsh web 子进程的真实报错（stderr 尾部 + 退出码），错误页直接显示
- ➕ **PATH 注册选项**：向导可勾选"加入用户 PATH"，装完后终端新窗口可直接用 node / npm / dsh（用户级、免管理员、幂等，默认开启）

> Node 安装到 `~/.dsh-app/node`、dsh 装到 `~/.dsh-app/npm-global`，**仅应用内使用，不改系统 PATH**——这是有意的：免管理员、不影响你原有的 Node 环境。想在终端里用这个 Node，可手动把对应目录加入 PATH。

### 📦 安装

1. 下载对应平台的安装包（见下方 Assets）
2. 启动应用 —— 自动检测环境，缺什么就引导一键装什么（Node.js → dsh CLI）
3. 环境就绪后自动连接

> 已有 Node.js？那就只装 dsh 即可。习惯命令行？`npm install -g @deepseek-ai/dsh` 依然可用，或用 `DSH_BIN` 指定 dsh 路径。

### 📥 下载

| 平台 | 安装包 |
|------|--------|
| Windows | `DSH_0.1.1_x64-setup.exe`（NSIS 安装器）/ `DSH_0.1.1_x64_en-US.msi` |
| macOS | `DSH_0.1.1_aarch64.dmg`（Apple Silicon）/ `DSH_0.1.1_x64.dmg`（Intel）|
| Linux | `DSH_0.1.1_amd64.deb` / `DSH_0.1.1_amd64.AppImage` / `DSH-0.1.1-1.x86_64.rpm` |

> macOS / Linux 产物由 CI 构建，未经签名（macOS 首次打开需右键 → 打开，详见下方排障）。

### 🍎 macOS 提示"未知开发者" / "已损坏"？

应用未签名、未公证，首次打开可能被 Gatekeeper 拦截。按顺序尝试：

**1. 提示"无法打开，因为无法验证开发者"（未知开发者）**

- 在「访达」中**右键**（或按住 Control 点击）`DSH` 图标 → 选择 **打开** → 再次点击 **打开** 确认
- 或：**系统设置 → 隐私与安全性**，向下滚动到"安全性"区域 → 点击 **仍要打开**

**2. 提示"应用已损坏，无法打开"**

不是文件损坏——是下载时 macOS 给应用加的隔离属性（quarantine）在拦截未签名应用。打开「终端」执行：

```bash
xattr -dr com.apple.quarantine /Applications/DSH.app
```

（若提示权限不足，在命令前加 `sudo`。）然后重新打开应用即可。

> 两条命令只影响本机首次启动的放行，不改动应用本身；后续正常打开。

### ⚠️ 已知限制

- macOS/Linux 构建产物未经签名/公证
- 一键环境安装是本版新增能力：若某一步失败，日志会标明用了哪个源/镜像，反馈问题请附上日志内容
- 桌面通知、开机自启、全局快捷键、远程连接模式规划在 P1（详见 README 路线图）

### 🙏 关于

- 源码：[github.com/zneoxlab/deepseek-harness-app](https://github.com/zneoxlab/deepseek-harness-app)
- 本项目**不是** DeepSeek 官方产品，请勿就本应用向官方反馈问题
- License: MIT
