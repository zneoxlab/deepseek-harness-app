# 打包与发布指南（三端）

本应用用 Tauri 2 打包，产物为：

| 平台 | 安装包 | 构建环境 |
|------|--------|----------|
| Windows | `.exe`（NSIS 安装器）| Windows 或 CI |
| macOS | `.dmg`（含 Intel + Apple Silicon）| macOS 或 CI |
| Linux | `.deb` / `.AppImage` | Linux 或 CI |

## 方式 A：Windows 本机手动打包（最快）

在你的 Windows 机器上（当前环境即可）：

```powershell
cd F:\dsh-work\工作区1\dsh-app
npm install
npm run tauri build            # 打全部目标（NSIS + MSI）
npm run tauri build -- --bundles nsis   # 只打 NSIS（推荐，跳过 MSI/WiX 更快）
```

产物位置：`src-tauri\target\release\bundle\nsis\DSH-App_0.1.0_x64-setup.exe`

> 注意：先确认没有正在运行的 `dsh-app.exe`（占锁会导致构建失败）。

## 方式 B：GitHub Actions 三端一次打包（推荐发布用）

仓库里已配好 `.github/workflows/build.yml`（tauri-action 三平台矩阵）。

**步骤：**

1. 提交并推送 workflow 文件（若还没推）：

```powershell
git add .github docs
git commit -m "build: add three-platform release workflow + v0.1.0 notes"
git push
```

2. 触发构建（二选一）：
   - 打一个新 tag（自动触发）：`git tag v0.1.0` 已存在 —— 可改用
     `git push origin :refs/tags/v0.1.0` 删旧 tag 后重新 `git tag v0.1.0 && git push origin v0.1.0`；
     或直接到 GitHub 仓库 **Actions → build → Run workflow**（workflow_dispatch 手动触发，无需 tag）
3. 等待 Actions 完成（约 10-20 分钟），三端产物会挂在一个自动创建的 **Draft Release** 上
4. 编辑该 Release：粘贴 `docs/RELEASE-NOTES-v0.1.0.md` 的内容 → **Publish release**

> macOS 产物未签名（无 Apple 证书）：用户首次打开需右键 → 打开。
> 更新检查走 GitHub Releases，Release 发布后 App 内"检查更新"即可生效。

## 发布流程（每次发新版）

1. 改三处版本号：`src-tauri/Cargo.toml`、`src-tauri/tauri.conf.json`、`package.json`（保持一致，如 `0.1.1`）
2. `git commit` + `git tag v0.1.1` + `git push --tags`
3. Actions 自动三端构建 → Draft Release
4. 更新 `docs/RELEASE-NOTES-v0.1.1.md`（或复用模板），粘贴到 Release → Publish
5. App 内"检查更新"会提示用户有新版本
