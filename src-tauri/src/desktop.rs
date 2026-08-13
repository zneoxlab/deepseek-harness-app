// P1: 开机自启 + 全局快捷键。
//
// 注意：这是参考实现，当前未接入 lib.rs（等 P0 构建完成后合入）。
// 依赖 tauri-plugin-autostart 与 tauri-plugin-global-shortcut
// （需在 Cargo.toml 添加，并注册到 Builder）。

use tauri::{AppHandle, Manager};

/// 设置开机自启（登录后静默驻留托盘）。
/// Windows: HKCU\...\Run（无需管理员）；macOS: LaunchAgents；Linux: XDG autostart。
pub fn set_autostart(app: &AppHandle, enabled: bool) -> Result<(), String> {
    // P1 接入后：
    //   use tauri_plugin_autostart::ManagerExt;
    //   let autostart = app.autolaunch();
    //   if enabled { autostart.enable().map_err(|e| e.to_string()) }
    //   else { autostart.disable().map_err(|e| e.to_string()) }
    //
    // 接入前：记录意图并打印，避免误报成功。
    eprintln!("[dsh-app] autostart -> {enabled}");
    let _ = app;
    Ok(())
}

/// 注册全局快捷键：任意界面呼出/隐藏主窗口。
/// 默认 CmdOrCtrl+Shift+Space，注册失败（被占用）时降级为仅托盘，不崩溃。
pub fn register_global_shortcut(app: &AppHandle, accelerator: &str) -> Result<(), String> {
    let _ = (app, accelerator);
    // P1 接入后：
    //   use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};
    //   let shortcut = Shortcut::from_str(accelerator).map_err(|e| e.to_string())?;
    //   app.global_shortcut().on_shortcut(shortcut, |app, _state, _shortcut| {
    //       if let Some(w) = app.get_webview_window("main") {
    //           if w.is_visible().unwrap_or(false) {
    //               let _ = w.hide();
    //           } else {
    //               let _ = w.show();
    //               let _ = w.unminimize();
    //               let _ = w.set_focus();
    //           }
    //       }
    //   }).map_err(|e| e.to_string())?;
    eprintln!("[dsh-app] global shortcut -> {accelerator}");
    Ok(())
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
