// P1: 桌面通知。
//
// 所有通知走同一入口 notify::notify()，统一处理:
//   - 设置开关（总开关 + 按场景开关, 见 connect::AppSettings）
//   - "仅窗口未聚焦时通知"（notify_only_unfocused）
//   - macOS: notify-rust `preview-macos-un` 后端（UNUserNotificationCenter），
//     支持通知卡片 action 按钮; 选项按钮点击 → 由本模块直接 POST /api/respond
//     把答案回传给 dsh web（闭环全在 Rust 侧, 前端无需监听事件）。
//   - 其他平台: tauri-plugin-notification（无按钮, 点击通知由系统行为兜底）。
//
// 触发点:
//   - Agent 回合完成 / 权限请求 / 用户问题（由 dsh-app-bridge 前端监听
//     events.mux / events.host WebSocket 后调 desktop_notify 命令）
//   - dsh web 服务意外退出（lib.rs spawn 监控线程调 on_server_event）

use std::collections::HashMap;
use std::sync::Mutex;
use std::time::Duration;

use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_notification::NotificationExt;

use crate::connect;

/// 通知场景分类（与设置页的子开关一一对应）。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum NotifyKind {
    /// 需要确认（ask_user_question / 权限请求）。
    Confirm,
    /// 任务完成（Agent 回合结束）。
    TurnComplete,
    /// 出错报警（流错误 / agent 错误 / 服务退出）。
    Error,
    /// 服务事件（dsh web 退出/重启），不受子开关约束（跟随总开关）。
    Service,
    /// 设置页"发送测试通知"：忽略全部开关与失焦检查，强制弹出。
    Test,
    /// 其他（如"设置已保存"），跟随总开关 + 失焦检查。
    Other,
}

impl NotifyKind {
    pub fn parse(raw: &str) -> NotifyKind {
        match raw {
            "confirm" => NotifyKind::Confirm,
            "turn" | "turn_complete" => NotifyKind::TurnComplete,
            "error" => NotifyKind::Error,
            "service" => NotifyKind::Service,
            "test" => NotifyKind::Test,
            _ => NotifyKind::Other,
        }
    }
}

/// 一条待发通知。
#[derive(Debug, Clone)]
pub struct NotifyRequest {
    pub kind: NotifyKind,
    pub title: String,
    pub body: String,
    /// 关联 id（confirm 类 = question/requested 的 rpcId），选项按钮点击后原样用于回传。
    pub reply_id: Option<String>,
    /// 选项按钮 (identifier, label)。仅 macOS 生效; 前端最多传 3 个。
    pub choices: Vec<(String, String)>,
    /// "打开应用"按钮的文案（前端按界面语言传）。
    pub open_label: String,
}

/// 待回答的 question 上下文: 选项按钮点击后据此构造 /api/respond 的答案。
#[derive(Debug, Clone)]
pub struct PendingQuestion {
    pub url: String,
    pub session_id: String,
    pub question_id: String,
    /// 与 choices 顺序对齐的选项标签（回传时 selected 用标签原文）。
    pub options: Vec<String>,
}

/// 全局状态: reply_id → PendingQuestion。选项按钮回调时查询。
pub struct NotifyState(pub Mutex<HashMap<String, PendingQuestion>>);

/// 检查总开关 + 场景开关 + 失焦，决定是否真正弹出。
/// NotifyKind::Test 绕过一切检查（设置页测试按钮要能立刻看到效果）。
pub fn should_notify(app: &AppHandle, kind: NotifyKind) -> bool {
    if kind == NotifyKind::Test {
        return true;
    }
    let Some(state) = app.try_state::<Mutex<connect::AppSettings>>() else {
        return false;
    };
    let settings = state.lock().unwrap();
    if !settings.notifications_enabled {
        return false;
    }
    let kind_ok = match kind {
        NotifyKind::Confirm => settings.notify_confirm,
        NotifyKind::TurnComplete => settings.notify_turn_complete,
        NotifyKind::Error => settings.notify_errors,
        NotifyKind::Service | NotifyKind::Other => true,
        NotifyKind::Test => true,
    };
    if !kind_ok {
        return false;
    }
    if settings.notify_only_unfocused {
        if let Some(w) = app.get_webview_window("main") {
            if w.is_focused().unwrap_or(false) {
                return false;
            }
        }
    }
    true
}

/// 统一通知入口。开关/失焦检查不过则静默跳过（Ok）。
/// 实际发送失败（权限未授予等）返回 Err, 供调用方展示诊断。
pub fn notify(app: &AppHandle, req: NotifyRequest) -> Result<(), String> {
    if !should_notify(app, req.kind) {
        return Ok(());
    }
    // 广播给前端（官方 Web UI 内的桥可自行决定是否展示站内提示）。
    let _ = app.emit("dsh://notify", format!("{}\u{1f}|{}", req.title, req.body));
    diag_log(&format!(
        "notify(kind={:?}) permission={}",
        req.kind,
        permission_description()
    ));

    #[cfg(target_os = "macos")]
    {
        mac_notify(app, req)
    }
    #[cfg(not(target_os = "macos"))]
    {
        app.notification()
            .builder()
            .title(&req.title)
            .body(&req.body)
            .show()
            .map_err(|e| format!("notification plugin failed: {e}"))
    }
}

// ---------------------------------------------------------------------------
// 诊断: ~/.dsh-app/notify.log（GUI 应用没有可见 stderr, 失败原因落盘）
// ---------------------------------------------------------------------------

/// 追加一行带时间戳的诊断日志。
pub fn diag_log(line: &str) {
    use std::io::Write as _;

    let Ok(ts) = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
    else {
        return;
    };
    let Some(base) = std::env::var_os("HOME")
        .or_else(|| std::env::var_os("USERPROFILE"))
        .map(std::path::PathBuf::from)
    else {
        return;
    };
    let dir = base.join(".dsh-app");
    let _ = std::fs::create_dir_all(&dir);
    if let Ok(mut f) = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(dir.join("notify.log"))
    {
        let _ = writeln!(f, "[{ts}] {line}");
    }
}

/// 当前系统通知授权状态（供诊断与测试按钮错误提示）。
#[cfg(target_os = "macos")]
pub fn permission_description() -> String {
    match notify_rust::get_notification_settings_blocking() {
        Ok(s) => format!(
            "authorization={:?}, alert={:?}, sound={:?}, notification-center={:?}",
            s.authorization_status, s.alert_enabled, s.sound_enabled, s.notification_center_enabled
        ),
        Err(e) => format!("query failed: {e}"),
    }
}

#[cfg(not(target_os = "macos"))]
pub fn permission_description() -> String {
    "n/a (non-Mac)".to_string()
}

/// 聚焦主窗口（通知点击 / 选项点击后的兜底行为）。
pub fn focus_main_window(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.show();
        let _ = w.unminimize();
        let _ = w.set_focus();
    }
}

// ---------------------------------------------------------------------------
// macOS: notify-rust UNUserNotificationCenter 后端（带 action 按钮）
// ---------------------------------------------------------------------------

#[cfg(target_os = "macos")]
fn mac_notify(app: &AppHandle, req: NotifyRequest) -> Result<(), String> {
    use std::thread;

    let mut n = notify_rust::Notification::new();
    n.summary(&req.title).body(&req.body).sound_name("Default");
    for (id, label) in &req.choices {
        n.action(id, label);
    }
    let open_label = if req.open_label.is_empty() {
        "Open".to_string()
    } else {
        req.open_label.clone()
    };
    n.action("dsh-open", &open_label);

    // 权限未授予 / 无 bundle 时 show 返回 Err —— 原样传播给调用方（测试按钮可见）。
    let handle = n.show().map_err(|e| {
        let msg = format!("macOS notification send failed: {e}");
        diag_log(&msg);
        msg
    })?;

    let app2 = app.clone();
    let reply_id = req.reply_id.clone();
    thread::spawn(move || {
        // wait_for_action 阻塞当前线程直到用户交互（或通知过期）。
        handle.wait_for_action(move |action| match action {
            "default" | "dsh-open" => focus_main_window(&app2),
            "__closed" => {
                // 通知被关闭: 清理挂起的回传上下文。
                if let Some(rid) = &reply_id {
                    clear_pending(&app2, rid);
                }
            }
            id => {
                // 选项按钮: 回传答案 → 聚焦窗口。
                if let Some(rid) = &reply_id {
                    answer_question(&app2, rid, id);
                }
                focus_main_window(&app2);
            }
        });
    });
    Ok(())
}

/// 记录 question 回传上下文（desktop_notify 命令调用）。
pub fn register_pending(app: &AppHandle, reply_id: &str, pending: PendingQuestion) {
    let Some(state) = app.try_state::<NotifyState>() else {
        return;
    };
    let mut map = state.0.lock().unwrap();
    // 防御性清理: 防止旧通知堆积（极端情况下）。
    if map.len() > 200 {
        map.clear();
    }
    map.insert(reply_id.to_string(), pending);
}

fn clear_pending(app: &AppHandle, reply_id: &str) {
    if let Some(state) = app.try_state::<NotifyState>() {
        let _ = state.0.lock().unwrap().remove(reply_id);
    }
}

/// 选项按钮点击: 构造 /api/respond 的 client-response 并 POST 给 dsh web。
/// 成功（2xx）或非 pending 响应都视为已送达, 清掉挂起上下文。
fn answer_question(app: &AppHandle, reply_id: &str, action: &str) -> bool {
    let Some(idx) = action
        .strip_prefix('a')
        .and_then(|s| s.parse::<usize>().ok())
    else {
        return false;
    };
    let pending = {
        let Some(state) = app.try_state::<NotifyState>() else {
            return false;
        };
        let guard = state.0.lock().unwrap();
        guard.get(reply_id).cloned()
    };
    let Some(pending) = pending else {
        return false;
    };
    let Some(label) = pending.options.get(idx).cloned() else {
        return false;
    };

    let payload = serde_json::json!({
        "type": "client-response",
        "rpcId": reply_id,
        "result": {
            "ok": true,
            "value": {
                "sessionId": pending.session_id,
                "answer": {
                    "answers": [{
                        "id": pending.question_id,
                        "selected": [label],
                        "custom": null
                    }]
                }
            }
        }
    });
    let ok = http_post_json(&pending.url, "/api/respond", &payload.to_string());
    clear_pending(app, reply_id);
    ok
}

/// 最小 HTTP POST（手写, 与 probe_bridge_ready 同一风格, 不引入 HTTP 依赖）。
fn http_post_json(base: &str, path: &str, body: &str) -> bool {
    use std::io::{Read, Write};

    let hostport = base
        .trim_start_matches("http://")
        .trim_start_matches("https://")
        .trim_end_matches('/');
    let Ok(addr) = hostport.parse::<std::net::SocketAddr>() else {
        return false;
    };
    let Ok(mut stream) = std::net::TcpStream::connect_timeout(&addr, Duration::from_millis(1000))
    else {
        return false;
    };
    let req = format!(
        "POST {path} HTTP/1.1\r\nHost: {hostport}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
        body.len()
    );
    if stream.write_all(req.as_bytes()).is_err() {
        return false;
    }
    let mut buf = String::new();
    if stream.read_to_string(&mut buf).is_err() {
        return false;
    }
    // 2xx 或 4xx（late/duplicate = not-pending）都算送达; 只有连接/协议错误才失败。
    buf.starts_with("HTTP/1.1 2") || buf.starts_with("HTTP/1.1 4")
}

/// macOS 通知权限请求（窗口显示后调用; 内部延迟 3 秒让 app 进入前台激活态,
/// 否则系统会静默拒绝首次请求且不再弹权限框）。幂等: 已授权则直接返回。
#[cfg(target_os = "macos")]
pub fn ensure_permission() {
    use std::thread;
    thread::spawn(|| {
        thread::sleep(std::time::Duration::from_secs(3));
        let before = permission_description();
        let ok = notify_rust::request_auth_blocking();
        let after = permission_description();
        diag_log(&format!(
            "ensure_permission: before={before} request={ok:?} after={after}"
        ));
    });
}

// ---------------------------------------------------------------------------
// 预留触发点
// ---------------------------------------------------------------------------

/// 会话回合完成通知。
#[allow(dead_code)]
pub fn on_turn_complete(app: &AppHandle, session_title: &str) {
    let _ = notify(
        app,
        NotifyRequest {
            kind: NotifyKind::TurnComplete,
            title: "任务完成".to_string(),
            body: if session_title.is_empty() {
                "Agent 回合已完成，可以查看结果了。".to_string()
            } else {
                format!("「{session_title}」已完成一轮，可以查看结果了。")
            },
            reply_id: None,
            choices: Vec::new(),
            open_label: "打开处理".to_string(),
        },
    );
}

/// 服务事件通知（dsh web 退出 / 重启）。
pub fn on_server_event(app: &AppHandle, event: &str) {
    let req = match event {
        "exited" => NotifyRequest {
            kind: NotifyKind::Error,
            title: "DSH 服务已退出".to_string(),
            body: "dsh web 进程意外结束。请重新打开应用。".to_string(),
            reply_id: None,
            choices: Vec::new(),
            open_label: "打开处理".to_string(),
        },
        "restarted" => NotifyRequest {
            kind: NotifyKind::Service,
            title: "DSH 服务已重启".to_string(),
            body: "dsh web 已重新就绪。".to_string(),
            reply_id: None,
            choices: Vec::new(),
            open_label: "打开处理".to_string(),
        },
        other => NotifyRequest {
            kind: NotifyKind::Service,
            title: "DSH 事件".to_string(),
            body: other.to_string(),
            reply_id: None,
            choices: Vec::new(),
            open_label: "打开处理".to_string(),
        },
    };
    let _ = notify(app, req);
}
