# Release Notes — v0.1.2

> 复制本文件内容到 GitHub Release 发布说明框（支持 Markdown）。

<p align="left">
  <a href="./RELEASE-NOTES-v0.1.2.md">English</a> ·
  <a href="./RELEASE-NOTES-v0.1.2.zh.md">中文</a>
</p>

---

## 🐛 v0.1.2 — 修复：一键环境安装命令被 ACL 拦截

v0.1.1 新增的安装向导被应用的 ACL 权限拦住了：`env_detect` / `install_node` / `install_dsh` 三个命令没有加入白名单，点击 **一键安装** 时报 `Command install_node not allowed by ACL`。本版本补上缺失的权限。

其余与 v0.1.1 完全一致（完整功能见 [RELEASE-NOTES-v0.1.1.zh.md](./RELEASE-NOTES-v0.1.1.zh.md)：一键装 Node + dsh、国内镜像退避、macOS 排障等）。

### 📥 下载

| 平台 | 安装包 |
|------|--------|
| Windows | `DSH_0.1.2_x64-setup.exe`（NSIS 安装器）/ `DSH_0.1.2_x64_en-US.msi` |
| macOS | `DSH_0.1.2_aarch64.dmg`（Apple Silicon）/ `DSH_0.1.2_x64.dmg`（Intel）|
| Linux | `DSH_0.1.2_amd64.deb` / `DSH_0.1.2_amd64.AppImage` / `DSH-0.1.2-1.x86_64.rpm` |

> macOS / Linux 产物由 CI 构建，未经签名（macOS 首次打开需右键 → 打开；提示"已损坏"时执行 `xattr -dr com.apple.quarantine /Applications/DSH.app`）。

### 🙏 关于

- 源码：[github.com/zneoxlab/deepseek-harness-app](https://github.com/zneoxlab/deepseek-harness-app)
- 本项目**不是** DeepSeek 官方产品
- License: MIT
