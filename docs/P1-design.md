# P1 设计：桌面增强层

> 目标：在 P0（官方 Web UI 底座 + 托盘壳）之上，补齐 oh-dsh 等项目已验证的
> **桌面侧**能力。原则：只做"浏览器给不了的东西"，不重造官方 UI。

## 功能清单与优先级

| # | 功能 | 吸收自 | 优先级 | 依赖 |
|---|---|---|---|---|
| 1 | 桌面通知（回合完成 / 权限请求 / 服务事件） | Cetus、dsh-notification | P0 后第一 | tauri-plugin-notification |
| 2 | 开机自启（静默，登录后拉起） | dsh-launcher | 高 | tauri-plugin-autostart |
| 3 | 全局快捷键唤起（任意界面呼出主窗口） | Cetus Quick Launcher | 中 | tauri-plugin-global-shortcut |
| 4 | 连接模式（远程 / 容器 Web UI） | bruc3van 连接模式 | 高 | 自研（Rust 侧） |
| 5 | 会话完成时"窗口标题/托盘徽标"提示 | oh-dsh | 低 | 自研 |

---

## 1. 桌面通知

### 触发点
- Agent 回合完成（Web UI 无法在后台标签页可靠通知，桌面壳补上）
- 权限请求需要人工批准
- dsh web 服务意外退出 / 重启

### 实现
- `tauri-plugin-notification`（跨平台：Windows Toast / macOS Notification Center / Linux 通知）
- 通过 DSH Web UI 的 WebSocket 事件（`events.mux` / `events.host`）感知回合状态
  - P1 简化：先由**前端**在 Web UI 里监听（官方 UI 已暴露回合事件时），通过 `window.__TAURI__` 调 Rust 发通知
  - 更稳的路径：Rust 侧不解析 Web UI 内部事件（官方协议未公开承诺），P1 先做"手动/托盘触发 + 错误事件通知"

### 配置
- 设置面板开关：`notifications.enabled`（默认开）、`notifications.onTurnComplete`（默认关，避免打扰）

---

## 2. 开机自启

### 行为
- 登录后**静默**启动 dsh-app（不弹窗口，驻留托盘）
- 启动参数：`dsh-app --hidden`（P1 在 Rust 侧解析，隐藏主窗口只留托盘）

### 实现
- `tauri-plugin-autostart`（Windows 注册表 Run 键 / macOS LaunchAgents / Linux XDG autostart）
- 设置面板开关：`autostart.enabled`

### Windows 细节
- 不要求管理员权限（HKCU\...\Run）
- 提供"启动后最小化到托盘"选项，默认开启

---

## 3. 全局快捷键

### 行为
- 默认 `CmdOrCtrl+Shift+Space`（可配置）：任意界面呼出/隐藏主窗口
- 后续（P2）：截图问 AI 的第二快捷键（Cetus 的差异化能力）

### 实现
- `tauri-plugin-global-shortcut`
- 注册失败（快捷键被占用）时降级为仅托盘，不崩溃

---

## 4. 连接模式

### 动机
- 桌面端不应只能连本机：支持连接远程机器 / 容器 / 已自行维护的 dsh web 实例
- 与 P0 的"智能模式"（探测 3080 复用 / 自启 --port 0）互补

### 状态模型（Rust 侧 enum）

```rust
enum ConnectTarget {
    Smart,                    // 默认：探测 3080 → 复用；否则自启
    Explicit { url: String }, // 直接连接给定 URL（用户输入）
}
```

### 交互
- 设置面板：切换 智能模式 / 连接模式
- 连接模式输入 URL（如 `http://192.168.1.10:3080`），校验可达后保存并导航
- 远程连接警告：非 loopback 地址时提示"仅限可信网络，建议 HTTPS"
- 连接失败显示错误 + 重试按钮（复用 P0 splash 的错误态）

### 安全边界
- 远程 URL 只允许 http/https
- 明确拒绝 `file://`、`javascript:` 等 scheme
- 记忆上次成功连接（settings.json），下次启动优先尝试

---

## 5. 配置存储

```rust
#[derive(Serialize, Deserialize)]
struct AppSettings {
    connect: ConnectTarget,
    notifications: NotificationSettings,
    autostart: bool,
    shortcut: String, // 默认 "CmdOrCtrl+Shift+Space"
}
```

- 存储位置：`$DSH_APP_HOME/settings.json`（默认 `~/.dsh-app/settings.json`）
- 与官方 `~/.dsh`（DSH_HOME）分离：桌面壳自己的偏好不污染官方数据

---

## 实现顺序建议

1. 连接模式（影响 P0 架构，先定）
2. 开机自启（简单、独立）
3. 桌面通知（依赖 Web UI 事件知识，先做托盘/错误通知）
4. 全局快捷键（独立）
5. 设置面板 UI（整合上述开关）
