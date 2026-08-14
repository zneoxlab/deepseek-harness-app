// P1: 开机自启 + 全局快捷键。
//
// 开机自启: tauri-plugin-autostart（Windows HKCU Run / macOS LaunchAgent /
// Linux XDG autostart，均免管理员）。
// 全局快捷键: tauri-plugin-global-shortcut，默认 CmdOrCtrl+Shift+Space
// 呼出/隐藏主窗口；注册失败（快捷键被占用）时降级为仅托盘，不崩溃。

use std::str::FromStr;
use tauri::{AppHandle, Manager};
use tauri_plugin_autostart::ManagerExt;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};

/// 设置开机自启（登录后静默驻留托盘，--hidden 由 lib.rs 解析为启动隐藏）。
pub fn set_autostart(app: &AppHandle, enabled: bool) -> Result<(), String> {
    let autostart = app.autolaunch();
    if enabled {
        autostart.enable().map_err(|e| e.to_string())
    } else {
        autostart.disable().map_err(|e| e.to_string())
    }
}

/// 注册全局快捷键: 任意界面呼出/隐藏主窗口。
/// 先清掉旧注册再注册新的，保证 save_settings 幂等可重入。
pub fn register_global_shortcut(app: &AppHandle, accelerator: &str) -> Result<(), String> {
    let shortcut = Shortcut::from_str(accelerator).map_err(|e| e.to_string())?;
    let gs = app.global_shortcut();
    if let Err(e) = gs.unregister_all() {
        eprintln!("[dsh-app] warning: unregister_all failed: {e}");
    }
    gs.on_shortcut(shortcut, |app, _shortcut, _state| {
        toggle_main_window(app);
    })
    .map_err(|e| e.to_string())
}

/// 显示/隐藏主窗口（托盘与快捷键共用）。
pub fn toggle_main_window(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        if w.is_visible().unwrap_or(false) {
            let _ = w.hide();
        } else {
            let _ = w.show();
            let _ = w.unminimize();
            let _ = w.set_focus();
        }
    }
}
