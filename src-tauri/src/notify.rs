// P1: 桌面通知。
//
// 注意：这是参考实现，当前未接入 lib.rs（等 P0 构建完成后合入）。
// 依赖 tauri-plugin-notification（需在 Cargo.toml 添加）。

use tauri::{AppHandle, Emitter};

/// 发送一条桌面通知。所有通知走同一入口，方便以后加"通知历史/免打扰"。
pub fn notify(app: &AppHandle, title: &str, body: &str) {
    // P1 接入后：使用 tauri_plugin_notification::NotificationExt
    //   let _ = app.notification().builder().title(title).body(body).show();
    //
    // 在插件接入前，先通过事件让前端（官方 Web UI）决定是否展示，
    // 避免依赖未安装的插件。
    let _ = app.emit("dsh://notify", format!("{title}\u{1f}|{body}"));
    #[cfg(debug_assertions)]
    eprintln!("[dsh-app] notify: {title} — {body}");
}

/// 会话回合完成通知（P1 简化版：由前端 Web UI 侧监听回合事件后调 Rust 触发）。
pub fn on_turn_complete(app: &AppHandle, session_title: &str) {
    notify(
        app,
        "Agent 回合完成",
        &format!("「{session_title}」已完成一轮，可以查看结果了。"),
    );
}

/// 服务事件通知（dsh web 退出 / 重启）。
pub fn on_server_event(app: &AppHandle, event: &str) {
    match event {
        "exited" => notify(app, "DSH 服务已退出", "dsh web 进程意外结束，应用即将退出或重启。"),
        "restarted" => notify(app, "DSH 服务已重启", "dsh web 已重新就绪。"),
        other => notify(app, "DSH 事件", other),
    }
}
