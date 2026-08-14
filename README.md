<p align="center">
  <img src="src-tauri/icons/icon.png" alt="DeepSeek Harness App" width="128" height="128" style="border-radius: 18px;" />
</p>

<h1 align="center">DeepSeek Harness App</h1>

<p align="center"><strong>Cross-platform desktop client for DeepSeek Harness</strong></p>
<p align="center"><em>A native shell around the official dsh web UI — fused title bar, tray residency, and a settings page with update management (short: <code>dsh-app</code>)</em></p>

<p align="center">
  <a href="./README.md">English</a> ·
  <a href="./README.zh.md">中文</a>
</p>

<p align="center">
  <a href="https://github.com/zneoxlab/deepseek-harness-app"><img src="https://img.shields.io/badge/source-GitHub-4d7cfe" alt="GitHub" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License" /></a>
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey" alt="Platforms" />
  <img src="https://img.shields.io/badge/Tauri-2-orange" alt="Tauri 2" />
  <img src="https://img.shields.io/badge/note-unofficial-yellow" alt="Unofficial" />
</p>

---

> [!NOTE]
> **DeepSeek Harness App (dsh-app) is not an official DeepSeek product.** It wraps the local [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (`dsh`) CLI into a desktop app: it detects your `dsh` installation, starts a plugin-enabled `dsh web` when needed, and gives the official web UI the desktop experience it deserves — a fused title bar, tray residency, and (planned) notifications, autostart, global shortcuts and connect modes.

---

## Why not a full rewrite?

The official `dsh` ships a **complete web UI** (sessions, projects, permissions, skills, plugins, media — everything lives there). The official ACP server (`@deepseek-ai/dsh-acp`) is automation-only: it creates fresh sessions but cannot load / list / resume / fork existing ones, so it cannot power a full desktop console.

That is why **DeepSeek Harness App builds on the official web UI instead of reinventing it**: we add only what a browser cannot — a native shell, tray residency, and desktop integrations.

## Contents

1. [Features](#features)
2. [Screenshots](#screenshots)
3. [How it connects](#how-it-connects)
4. [Install](#install)
5. [First run & troubleshooting](#first-run--troubleshooting)
6. [Develop & build](#develop--build)
7. [Testing failure scenarios](#testing-failure-scenarios)
8. [Project structure](#project-structure)
9. [Roadmap](#roadmap)
10. [License](#license)

---

## Features

| Area | What you get |
|------|----------------|
| **Smart connect** | Detects `dsh` CLI (DSH_BIN → npm global → PATH); reuses a running **bridge-enabled** instance on `127.0.0.1:3080`, otherwise starts its own `dsh --profile dsh-app --port 0` on a free random port (a plain `dsh web` you started manually is left alone) |
| **dsh CLI detection** | Startup wizard when the CLI is missing — copy the install command, re-check with one click |
| **Fused title bar** | A borderless window with a title bar fused into the system frame, per-platform window buttons: **macOS** uses the native title bar entirely (real system traffic lights, native rounded corners and shadow); **Windows** draws Win11-style square caption buttons at the top-right; **Linux** draws neutral circle buttons at the top-left. Windows 11 rounds the whole window automatically (undecorated + shadow). The strip is the drag region; double-click maximizes. Title bar colors follow the **in-app theme** (dark / light / system) on every platform |
| **Sidebar status row** | A status capsule (**colored dot + 已连接 / 未连接**) with the app version right-aligned on the same row, at the very bottom of the sidebar **below the settings button** (registered through the official `sidebar.footer.action` slot; the settings row moves up one slot) |
| **DSH App settings page** | A page registered into the official settings panel: app info (version, source-code link) + **update management against GitHub Releases**; dsh CLI info (version / source / service URL) + **CLI update management** (latest check against the npm registry, one-click update, copy update command) |
| **Model Presets** | Fused into the **original model configuration**, no separate page: on the first boot the bridge server pre-writes mainstream channels (DeepSeek / OpenAI / Anthropic / Google Gemini / OpenRouter / xAI / Moonshot / MiniMax / Zhipu GLM / Mistral / Groq / Together) into the official `llm-pi-ai` namespace — they show up under Settings → Models as already-configured routes with their built-in model catalogs enabled; you only fill the API key there. Once any provider is configured the presets never run again, so removed channels never come back |
| **System tray** | Close-to-tray; left-click shows the window; Quit cleans up the whole dsh process tree (no orphans) |
| **Single instance** | A second launch focuses the existing window instead of spawning another server |
| **Windows ready** | Falls back to `DSH_PERMISSION_MODE=danger-full-access` when unset (no confinement backend on Windows) |
| **i18n** | UI follows the system language (Simplified Chinese / English), including the DSH App settings page |
| **Native icons** | Official dsh favicon (the whale) as the app icon across platforms |

**Desktop layer (P1):** desktop notifications · autostart (silent tray via `--hidden`) · global shortcut (default `CmdOrCtrl+Shift+Space`) · connect modes (smart / explicit remote, container or self-hosted web UI — http/https only, reachability-checked) — the switches live in the official Web UI's "Desktop" settings section (injected via the `settings.section` slot)

The desktop pieces are injected through the official **DSH plugin mechanism** (`dsh-app-bridge`, the `oh-dsh` route): the app owns a dedicated `dsh-app` profile that loads the bridge bundle — your own `web` profile is never touched.

---

## Screenshots

> From the current Windows development build.

| Startup — detecting CLI | dsh CLI missing — install wizard |
|:---:|:---:|
| ![Detecting CLI](assets/screenshots/detecting-cli.png) | ![CLI missing](assets/screenshots/cli-missing.png) |

| Home — official dsh web UI inside the shell |
|:---:|
| ![Home](assets/screenshots/home.png) |

---

## How it connects

```
App starts
  │
  ├─ Frontend checks for the dsh CLI (dsh_detect)
  │     ├─ found  → calls dsh_connect
  │     └─ missing → shows the install wizard (stable, never hijacked)
  │
  ├─ dsh_connect: does 127.0.0.1:3080 carry the desktop bridge?
  │     (GET /dsh-app/status → {"ok":true})
  │     ├─ yes → reuse it (browser & desktop share one dsh process)
  │     └─ no  → spawn `dsh --profile dsh-app --port 0`
  │              (app-owned profile, hidden console window, random port),
  │              parse the ready line, navigate the window
  │
  └─ Quit from the tray → taskkill the whole process tree
```

The frontend drives the connection (instead of the Rust side auto-connecting), so the install wizard is never skipped by a fast race. Only bridge-enabled instances are reused — a plain `dsh web` you started for browser development is left untouched, and the app starts its own plugin-enabled instance.

---

## Install

### 1. Get the app

Download the installer for your platform from [Releases](https://github.com/zneoxlab/deepseek-harness-app/releases) (Windows NSIS, macOS DMG, Linux AppImage/deb — coming as builds are published).

### 2. Install the dsh CLI

DeepSeek Harness App does **not** bundle `dsh` — it detects it on your machine:

```bash
npm install -g @deepseek-ai/dsh
```

Alternatively set `DSH_BIN` to point at a dsh executable (e.g. a local build's `lib/bin.js`).

That's it — launch the app and it connects automatically.

---

## First run & troubleshooting

**"dsh CLI required" wizard shows even though I installed it** — the app probes at launch; click **"I've installed it — re-check"** to rescan.

**Windows permission warning** — when `DSH_PERMISSION_MODE` is unset, the app falls back to `danger-full-access` (Windows has no confinement backend) and logs a warning. Set it explicitly if you want a different mode.

**Nothing found on PATH but `dsh` works in your terminal** — check `npm root -g`; if the global dir is not on PATH, set `DSH_BIN` to `%APPDATA%\npm\node_modules\@deepseek-ai\dsh\lib\bin.js` (Windows) or the equivalent.

---

## Develop & build

Requirements: Node 20+, Rust stable, `@deepseek-ai/dsh` installed (or `DSH_BIN` set).

```sh
npm install
npm run tauri dev        # dev run with hot reload
npm run tauri build      # release build (NSIS on Windows by default)
```

Only build NSIS (skip MSI/WiX):

```sh
npm run tauri build -- --bundles nsis
```

Rebuild the bridge plugin bundle alone (the app ships it as an external file):

```sh
cd dsh-app-bridge && npm run build
```

---

## Testing failure scenarios

Set the `DSH_APP_MOCK` environment variable to simulate startup states:

| Value | Effect |
|---|---|
| *(unset)* | Normal flow |
| `missing-cli` | Simulates a missing dsh CLI → install wizard |
| `no-server` | Simulates 3080 free + spawn failure → connection error |

PowerShell:

```powershell
$env:DSH_APP_MOCK = "missing-cli"; .\src-tauri\target\release\dsh-app.exe
```

---

## Project structure

```
dsh-app/
├─ src/                 # React + TS frontend (light splash / connection status)
│  ├─ App.tsx           # detection-driven connect flow
│  ├─ WindowControls.tsx # splash-phase fused title bar (native macOS strip / Linux circles / Windows caption buttons + drag)
│  └─ i18n.ts           # system-language UI (zh/en) + error-code l10n
├─ dsh-app-bridge/      # cordis plugin injected into the official Web UI
│  ├─ src/server.ts     #   /dsh-app/status marker endpoint (bridge detection)
│  │                    #   + first-run model presets: pre-writes mainstream
│  │                    #   channels into the official llm-pi-ai model config
│  │                    #   (virgin config only; no separate UI)
│  ├─ src/client/index.tsx
│  │                    #   fused title bar (per-platform buttons + status dot)
│  │                    #   + theme sync, "DSH App" settings page
│  │                    #   (app + dsh CLI update management)
│  ├─ scripts/build.mjs #   client bundle (factory-wrapped) + server bundle
│  └─ cordis.patch.yml  #   bundle layer (insert row for the loader)
├─ src-tauri/
│  ├─ src/lib.rs        # Rust shell: tray, single instance, smart connect, tree-kill,
│  │                    #   dsh-app profile bootstrap, window-control + app_info commands
│  ├─ src/connect.rs    # (P1) connect modes & settings storage
│  ├─ src/notify.rs     # (P1) desktop notifications
│  ├─ src/desktop.rs    # (P1) autostart & global shortcut
│  ├─ capabilities/     # IPC ACL: app commands + remote 127.0.0.1 access
│  └─ tauri.conf.json   # window / bundle config
├─ assets/screenshots/  # screenshots used in this README
└─ docs/                # design docs & fix records
```

---

## Roadmap

- **P0 (done)** — minimal usable shell: smart connect, single instance, tray, tree-kill, CLI detection wizard, i18n
- **P2 (done, core)** — desktop fusion via the DSH plugin mechanism (`dsh-app-bridge`): fused title bar with connection status, "DSH App" settings page (app update management + dsh CLI update management), **model presets fused into the official model configuration (first-run server-side pre-write of mainstream channels into `llm-pi-ai`, no separate UI)**, app-owned `dsh-app` profile
- **P1 (done)** — Desktop enhancement layer: notifications (`tauri-plugin-notification`), autostart (`tauri-plugin-autostart` + `--hidden`), global shortcut (`tauri-plugin-global-shortcut`), connect modes (smart/explicit; `connect.rs` stores settings in `~/.dsh-app/settings.json`); the settings UI is injected into the official settings page ("Desktop" section). Design & integration record: `docs/P1-design.md` / `docs/P1-integration-checklist.md`
- **P2 (next)** — more workbench surfaces via the plugin route: PTY terminal, Git Review, plugin marketplace

---

## License

[MIT](LICENSE) © dsh-app contributors
