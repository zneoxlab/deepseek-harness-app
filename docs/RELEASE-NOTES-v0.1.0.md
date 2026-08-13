# Release Notes — v0.1.0

> Copy this file's content into the GitHub Release description box (Markdown supported).

<p align="left">
  <a href="./RELEASE-NOTES-v0.1.0.md">English</a> ·
  <a href="./RELEASE-NOTES-v0.1.0.zh.md">中文</a>
</p>

---

## 🚀 DeepSeek Harness App v0.1.0 — First stable release

DeepSeek Harness App (dsh-app) is an **unofficial** cross-platform desktop client for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness): a native shell around the official `dsh` Web UI that adds only what a browser cannot — a fused title bar, tray residency, and a settings page with update management.

### ✨ Highlights

**Desktop shell (P0)**
- 🔌 Smart connect: detects the dsh CLI (`DSH_BIN` → npm global → PATH); reuses a bridge-enabled instance or silently starts its own `dsh-app` profile instance (random port, hidden console window)
- 📦 Install wizard when the dsh CLI is missing (copy the command, one-click re-check)
- 🗔 System tray: close-to-tray; Quit cleans up the whole dsh process tree (no orphans)
- 🔁 Single instance: a second launch focuses the existing window
- 🪟 Windows ready: falls back to `DSH_PERMISSION_MODE=danger-full-access` when unset
- 🌐 Bilingual UI (Simplified Chinese / English, follows the system)

**Desktop fusion (P2 core, via the official plugin mechanism `dsh-app-bridge`)**
- 🪟 **Fused title bar**: borderless window; minimize / maximize / close, the drag area and a live **connected / disconnected** status dot all live inside the Web UI, with colors following the official theme (dark / light / system)
- ⚙️ **"DSH App" settings page**: registered into the official settings panel — app version, dsh CLI version/source, service URL, **source-code link**, and **update management against GitHub Releases** (check for updates → new version found → one-click download)
- 🔒 The app owns a dedicated `dsh-app` profile and **never touches** your own `web` profile

### 📦 Install

1. Download the installer for your platform (see Assets below)
2. Install the dsh CLI: `npm install -g @deepseek-ai/dsh` (the app does not bundle dsh; it detects your local install — or point `DSH_BIN` at a dsh executable)
3. Launch the app — it connects automatically

### 📥 Downloads

| Platform | Package |
|----------|---------|
| Windows | `DSH-App_0.1.0_x64-setup.exe` (NSIS) / `DSH-App_0.1.0_x64_en-US.msi` |
| macOS | `DSH-App_0.1.0_aarch64.dmg` (Apple Silicon) / `DSH-App_0.1.0_x64.dmg` (Intel) |
| Linux | `dsh-app_0.1.0_amd64.deb` / `DSH-App_0.1.0_amd64.AppImage` |

> macOS / Linux artifacts are built by CI and are unsigned (macOS first launch: right-click → Open).

### ⚠️ Known limitations

- macOS/Linux artifacts are unsigned and not notarized
- Desktop notifications, autostart, global shortcuts and remote connect modes are planned for P1 (see the README roadmap)
- Update checks target this app's GitHub Releases; update the dsh CLI itself with `npm update -g @deepseek-ai/dsh`

### 🙏 About

- Source: [github.com/zneoxlab/deepseek-harness-app](https://github.com/zneoxlab/deepseek-harness-app)
- This project is **not** an official DeepSeek product — do not report issues about this app to the official channels
- License: MIT
