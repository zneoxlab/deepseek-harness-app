# Release Notes — v0.1.1

> Copy this file's content into the GitHub Release description box (Markdown supported).

<p align="left">
  <a href="./RELEASE-NOTES-v0.1.1.md">English</a> ·
  <a href="./RELEASE-NOTES-v0.1.1.zh.md">中文</a>
</p>

---

## 🚀 DeepSeek Harness App v0.1.1 — one-click environment setup

DeepSeek Harness App (dsh-app) is an **unofficial** cross-platform desktop client for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness): a native shell around the official `dsh` Web UI that adds only what a browser cannot — a fused title bar, tray residency, and a settings page with update management.

### ✨ New in v0.1.1 — install the whole environment from inside the app

- 🪜 **Step-by-step detection**: on startup the app checks `node` → `npm` → `dsh` and shows the status of each
- 🖱️ **One-click Node install**: if Node.js is missing, one click downloads an official prebuilt Node into `~/.dsh-app/node` — no admin rights, no system changes
- 🖱️ **One-click dsh install**: `npm install -g @deepseek-ai/dsh` with one click (uses your system npm if present, otherwise the app-managed one, installed into `~/.dsh-app/npm-global`)
- ⛓️ **Auto chain**: Node → dsh installs run one after another, then the app connects automatically — after downloading the app you can be up and running with almost no manual steps
- 🌏 **China mirror fallback**: when the system language is Chinese **and** the timezone is China, downloads prefer the npmmirror domestic mirror and automatically fall back to the official source if the mirror fails
- 📺 Live install log in the wizard, with per-step status chips

Everything else from v0.1.0 is unchanged (smart connect, tray, fused title bar, settings page, bilingual UI).

### 🔧 Fixed in this release

- 🔓 **One-click install commands were blocked by the ACL**: `env_detect` / `install_node` / `install_dsh` were missing from the permission set and capability whitelist (clicking Install failed with `Command install_node not allowed by ACL`)
- 🪟 **Wrong Node archive layout on Windows**: switched to the built-in tar (bsdtar) with `--strip-components=1` for extraction (PowerShell `Expand-Archive` kept the zip's top-level folder, so Node verification failed after "installing")
- 🌏 **Timezone detection on Windows**: added a registry check for China Standard Time, so Chinese-language Windows machines on China time now correctly use the domestic mirror
- 🪟 **Windows `.cmd` execution**: npm/dsh `.cmd` shims now run through `cmd /C` (previously failed with "not a valid Win32 application", os error 193)
- 🔗 **Windows bridge link**: quoted mklink arguments (junctions now work when the app is installed under paths with spaces such as `Program Files`), and failures are reported instead of ignored
- 🩺 **No more blind timeouts**: connect timeouts now surface the real dsh web error (stderr tail + exit status), shown directly on the error page
- ➕ **PATH option**: an opt-in "add to user PATH" checkbox makes node / npm / dsh available in new terminals after install (user-level, no admin, idempotent, on by default)

> Node is installed to `~/.dsh-app/node` and dsh to `~/.dsh-app/npm-global`, **app-local only — the system PATH is never modified** (by design: no admin rights, and your existing Node environment is untouched). To also use this Node in your terminal, add that directory to PATH manually.

### 📦 Install

1. Download the installer for your platform (see Assets below)
2. Launch the app — it checks your environment and, if anything is missing, guides you through a one-click install (Node.js → dsh CLI)
3. Connect happens automatically once the environment is ready

> Already have Node.js? Then only dsh is installed in-app. Prefer the terminal? `npm install -g @deepseek-ai/dsh` still works, or point `DSH_BIN` at a dsh executable.

### 📥 Downloads

| Platform | Package |
|----------|---------|
| Windows | `DSH_0.1.1_x64-setup.exe` (NSIS) / `DSH_0.1.1_x64_en-US.msi` |
| macOS | `DSH_0.1.1_aarch64.dmg` (Apple Silicon) / `DSH_0.1.1_x64.dmg` (Intel) |
| Linux | `DSH_0.1.1_amd64.deb` / `DSH_0.1.1_amd64.AppImage` / `DSH-0.1.1-1.x86_64.rpm` |

> macOS / Linux artifacts are built by CI and are unsigned (macOS first launch: right-click → Open, see the troubleshooting section below).

### 🍎 macOS says "unidentified developer" / "app is damaged"?

The app is unsigned and not notarized, so Gatekeeper may block first launch. Try in order:

**1. "cannot be opened because the developer cannot be verified" (unidentified developer)**

- In **Finder**, **right-click** (or Control-click) the `DSH` icon → choose **Open** → click **Open** again to confirm
- Or: **System Settings → Privacy & Security**, scroll down to the "Security" section → click **Open Anyway**

**2. "app is damaged and can't be opened"**

It is not actually damaged — macOS attached a quarantine attribute when you downloaded it, which blocks unsigned apps. Open **Terminal** and run:

```bash
xattr -dr com.apple.quarantine /Applications/DSH.app
```

(Prefix with `sudo` if you get a permission error.) Then open the app again.

> These steps only allow first launch on your machine; the app itself is unchanged and opens normally afterwards.

### ⚠️ Known limitations

- macOS/Linux artifacts are unsigned and not notarized
- The one-click environment setup is new in this release — if an install step fails, the log shows which source/mirror was used; please report failures with the log content
- Desktop notifications, autostart, global shortcuts and remote connect modes are planned for P1 (see the README roadmap)

### 🙏 About

- Source: [github.com/zneoxlab/deepseek-harness-app](https://github.com/zneoxlab/deepseek-harness-app)
- This project is **not** an official DeepSeek product — do not report issues about this app to the official channels
- License: MIT
