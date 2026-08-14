# P1 合入清单（等 P0 编译完成后执行）

> **状态：✅ 已执行（2026-08-14）**，`cargo check` 通过、`connect` 模块单元测试通过、
> bridge 客户端构建通过、完整 `npm run tauri build` 通过。
>
> **实际差异**（相对本清单）：
> - 前端设置界面不在 `src/SettingsPanel.tsx`（该文件不存在），而是
>   **dsh-app-bridge 客户端**注入官方 Web UI 的设置页（`settings.section` 槽，
>   id `dsh-app-desktop`），通过 `window.__TAURI_INTERNALS__.invoke` 调
>   `get_settings` / `save_settings`。
> - `save_settings` 额外校验显式连接 URL：仅 http/https 且可达才保存
>   （`docs/P1-design.md` §4 安全边界）。
> - `connect_and_navigate` 的智能模式保留 P0 的**桥感知**探测
>   （`probe_bridge_ready`，只复用带桌面桥的 3080 实例），未改用
>   参考模块的裸 TCP 探测。
> - 开机自启插件注册参数 `--hidden`，`lib.rs` 的 `setup` 解析该参数
>   静默启动（驻留托盘不弹窗）。
> - `desktop.rs` 的 `register_global_shortcut` 先 `unregister_all` 再注册，
>   保证设置页重复保存幂等。

目的：把 `src-tauri/src/{connect,notify,desktop}.rs` 三个参考模块接入
现有 `lib.rs`，并添加对应 Tauri 插件。按顺序执行。

## 1. Cargo.toml 添加依赖

```toml
[dependencies]
# 现有...
tauri-plugin-notification = "2"
tauri-plugin-autostart = "2"
tauri-plugin-global-shortcut = "2"
```

## 2. lib.rs 顶部声明模块

```rust
mod connect;
mod desktop;
mod notify;
```

（在 `use` 之后、`fn run()` 之前）

## 3. Builder 注册插件 + 模块接线

在 `tauri::Builder::default()` 链中（`manage` 之后）加：

```rust
.plugin(tauri_plugin_notification::init())
.plugin(tauri_plugin_autostart::init(
    tauri_plugin_autostart::MacosLauncher::LaunchAgent,
    None,
))
.plugin(tauri_plugin_global_shortcut::Builder::new().build())
```

## 4. settings 状态

`manage` 里加入：

```rust
.manage(Mutex::new(connect::AppSettings::load()))
```

## 5. connect_and_navigate 替换

把现有 `connect_and_navigate` 改为读取 settings 的 ConnectTarget：

```rust
fn connect_and_navigate(app: &tauri::AppHandle) -> Result<(), ConnectError> {
    let settings = app.state::<Mutex<connect::AppSettings>>();
    let target = settings.lock().unwrap().connect.clone();
    let url = match target {
        connect::ConnectTarget::Smart => {
            if probe_ready(DEFAULT_URL) {
                DEFAULT_URL.to_string()
            } else {
                let _ = app.emit("dsh://phase", "starting:");
                let (child, port) = spawn_dsh_web()?;
                if let Some(state) = app.try_state::<ServerState>() {
                    *state.0.lock().unwrap() = Some(child);
                }
                format!("http://127.0.0.1:{port}")
            }
        }
        connect::ConnectTarget::Explicit(raw) => {
            connect::sanitize_url(&raw).ok_or(ConnectError::Io("无效 URL".into()))?
        }
    };
    // ...后续导航逻辑不变
}
```

## 6. 新增 Tauri command（给前端设置面板调用）

在 lib.rs 末尾加：

```rust
#[tauri::command]
fn save_settings(app: tauri::AppHandle, settings: connect::AppSettings) -> Result<(), String> {
    settings.save()?;
    let state = app.state::<Mutex<connect::AppSettings>>();
    *state.lock().unwrap() = settings.clone();
    desktop::set_autostart(&app, settings.autostart)?;
    if settings.notifications_enabled {
        notify::notify(&app, "DeepSeek Harness App", "设置已保存");
    }
    Ok(())
}

#[tauri::command]
fn get_settings(app: tauri::AppHandle) -> connect::AppSettings {
    let state = app.state::<Mutex<connect::AppSettings>>();
    state.lock().unwrap().clone()
}
```

并在 `.invoke_handler(tauri::generate_handler![save_settings, get_settings])` 注册。

## 7. 前端接通

`src/SettingsPanel.tsx` 中 `save()` 改为：

```ts
import { invoke } from "@tauri-apps/api/core";
await invoke("save_settings", { settings: {...} });
```

（需要 `npm i @tauri-apps/api`）

## 8. 验证

```sh
cargo check            # 类型检查
npm run tauri build    # 完整构建
```
