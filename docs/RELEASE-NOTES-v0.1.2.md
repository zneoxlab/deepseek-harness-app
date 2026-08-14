# Release Notes — v0.1.2

> Copy this file's content into the GitHub Release description box (Markdown supported).

<p align="left">
  <a href="./RELEASE-NOTES-v0.1.2.md">English</a> ·
  <a href="./RELEASE-NOTES-v0.1.2.zh.md">中文</a>
</p>

---

## 🐛 v0.1.2 — fix: enable the one-click environment setup commands

v0.1.1's new install wizard was blocked by the app's ACL: the `env_detect` / `install_node` / `install_dsh` commands were not whitelisted, so clicking **一键安装 / Install** failed with `Command install_node not allowed by ACL`. This release adds the missing permissions.

Everything else is identical to v0.1.1 (see [RELEASE-NOTES-v0.1.1.md](./RELEASE-NOTES-v0.1.1.md) for the full feature list: one-click Node + dsh install with China mirror fallback, macOS troubleshooting, etc.).

### 📥 Downloads

| Platform | Package |
|----------|---------|
| Windows | `DSH_0.1.2_x64-setup.exe` (NSIS) / `DSH_0.1.2_x64_en-US.msi` |
| macOS | `DSH_0.1.2_aarch64.dmg` (Apple Silicon) / `DSH_0.1.2_x64.dmg` (Intel) |
| Linux | `DSH_0.1.2_amd64.deb` / `DSH_0.1.2_amd64.AppImage` / `DSH-0.1.2-1.x86_64.rpm` |

> macOS / Linux artifacts are built by CI and are unsigned (macOS first launch: right-click → Open, then `xattr -dr com.apple.quarantine /Applications/DSH.app` if "damaged").

### 🙏 About

- Source: [github.com/zneoxlab/deepseek-harness-app](https://github.com/zneoxlab/deepseek-harness-app)
- This project is **not** an official DeepSeek product
- License: MIT
