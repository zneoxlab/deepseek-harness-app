// DSH App — Tauri 2 shell for DeepSeek Harness.
//
// P0 scope (吸收社区项目优点):
//   - 智能连接: 探测 127.0.0.1:3080 已有实例 → 复用; 否则自启 `dsh web --port 0`
//     (bruc3van/dsh-desktop 智能模式 + dsh-desktop-electron 随机端口不冲突)
//   - 单实例锁 (tauri-plugin-single-instance)
//   - 托盘常驻: 关窗隐藏, 只有 Quit 才退出并清理子进程 (electron 壳的孤儿收割)
//   - 安全: 窗口导航到 loopback 地址, 不注入 preload, 外链走系统浏览器

use std::io::{BufRead, BufReader};
use std::net::TcpStream;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::thread;
use std::time::Duration;

use serde::Serialize;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{Emitter, Manager, WebviewWindow};

/// 默认探测目标: 官方 `dsh web` 的监听地址。
const DEFAULT_URL: &str = "http://127.0.0.1:3080";

/// `dsh web` 打印的就绪行, 例如 `dsh web: http://127.0.0.1:PORT`。
const READY_MARKER: &str = "dsh web:";

/// Windows: 隐藏子进程的控制台窗口（node.exe / cmd.exe 不再弹黑框）。
#[cfg(windows)]
fn no_console(cmd: &mut Command) {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x0800_0000;
    cmd.creation_flags(CREATE_NO_WINDOW);
}
#[cfg(not(windows))]
fn no_console(_cmd: &mut Command) {}

/// 持有拉起的 `dsh web` 子进程与它的 URL, 退出时整树清理。
struct ServerState(Mutex<Option<(Child, String)>>);

/// 前端可读的 dsh CLI 检测结果。
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct DshDetectResult {
    /// CLI 是否可用（能被解析并执行）。
    available: bool,
    /// 定位来源: "dsh_bin" | "npm_global" | "path" | null
    source: Option<&'static str>,
    /// 解析到的入口（可执行文件或 bin.js 路径）。
    entry: Option<String>,
    /// `dsh --version` 的输出（截断），失败时为 None。
    version: Option<String>,
    /// 给用户看的安装指引。
    install_hint: &'static str,
}

impl DshDetectResult {
    fn missing(hint: &'static str) -> Self {
        DshDetectResult {
            available: false,
            source: None,
            entry: None,
            version: None,
            install_hint: hint,
        }
    }
}

/// 桌面端信息（标题栏"关于"面板用）。
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct AppInfo {
    /// dsh-app 自身版本（来自 Cargo.toml）。
    app_version: &'static str,
    /// 本地 dsh CLI 版本（`dsh --version` 输出）。
    dsh_version: Option<String>,
    /// dsh CLI 来源: "dsh_bin" | "npm_global" | "path" | null
    dsh_source: Option<&'static str>,
    /// 当前连接的 dsh web 服务地址。
    service_url: Option<String>,
}

#[derive(Debug, thiserror::Error)]
enum ConnectError {
    #[error("[DSH_NOT_FOUND] dsh CLI not found. Install it with `npm install -g @deepseek-ai/dsh` or point DSH_BIN to a dsh executable.")]
    DshNotFound,
    #[error("[SPAWN_FAILED] Failed to start dsh web: {0}")]
    Spawn(String),
    #[error("[CONNECT_TIMEOUT] Timed out waiting for dsh web (30s)")]
    Timeout,
    #[error("[CONNECT_IO] Cannot reach the DeepSeek Harness web UI: {0}")]
    Io(String),
}

impl ConnectError {
    /// 稳定的错误码（前端据此做本地化显示）。
    fn code(&self) -> &'static str {
        match self {
            ConnectError::DshNotFound => "DSH_NOT_FOUND",
            ConnectError::Spawn(_) => "SPAWN_FAILED",
            ConnectError::Timeout => "CONNECT_TIMEOUT",
            ConnectError::Io(_) => "CONNECT_IO",
        }
    }
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            // 第二次启动: 聚焦已有窗口而不是再起一个服务
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.show();
                let _ = w.unminimize();
                let _ = w.set_focus();
            }
        }))
        .manage(ServerState(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![
            dsh_detect,
            dsh_connect,
            app_info,
            window_minimize,
            window_toggle_maximize,
            window_close,
            window_start_dragging
        ])
        .setup(|app| {
            setup_tray(app)?;
            Ok(())
        })
        .on_window_event(|window, event| {
            // 关窗 = 隐藏到托盘; 只有托盘 Quit 才真正退出
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let _ = window.hide();
                api.prevent_close();
            }
        })
        .build(tauri::generate_context!())
        .expect("failed to build tauri app")
        .run(|app, event| {
            if let tauri::RunEvent::ExitRequested { .. } = event {
                kill_spawned_server(app);
            }
        });
}

// ---------------------------------------------------------------------------
// 智能连接
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// 窗口控制（自绘标题栏: 融合 Windows 缩小/放大/关闭 + 拖拽）
// ---------------------------------------------------------------------------

#[tauri::command]
fn window_minimize(app: tauri::AppHandle) -> Result<(), String> {
    let win = app.get_webview_window("main").ok_or("no main window")?;
    win.minimize().map_err(|e| e.to_string())
}

#[tauri::command]
fn window_toggle_maximize(app: tauri::AppHandle) -> Result<bool, String> {
    let win = app.get_webview_window("main").ok_or("no main window")?;
    let maximized = win.is_maximized().map_err(|e| e.to_string())?;
    if maximized {
        win.unmaximize().map_err(|e| e.to_string())?;
    } else {
        win.maximize().map_err(|e| e.to_string())?;
    }
    Ok(!maximized)
}

#[tauri::command]
fn window_close(app: tauri::AppHandle) -> Result<(), String> {
    let win = app.get_webview_window("main").ok_or("no main window")?;
    // 触发 CloseRequested → 隐藏到托盘（与原生关闭行为一致）
    win.close().map_err(|e| e.to_string())
}

#[tauri::command]
fn window_start_dragging(app: tauri::AppHandle) -> Result<(), String> {
    let win = app.get_webview_window("main").ok_or("no main window")?;
    win.start_dragging().map_err(|e| e.to_string())
}

/// 桌面端信息（设置页"关于"区块 + 更新监测用）。
#[tauri::command]
fn app_info(app: tauri::AppHandle) -> AppInfo {
    let (dsh_version, dsh_source) = match resolve_dsh() {
        Some((entry, source)) => (probe_dsh_version(&entry), Some(source)),
        None => (None, None),
    };
    let service_url = {
        let state = app.try_state::<ServerState>();
        let owned = state.and_then(|s| {
            s.0.lock()
                .ok()
                .and_then(|g| g.as_ref().map(|(_, url)| url.clone()))
        });
        owned.or_else(|| {
            if probe_bridge_ready() {
                Some(DEFAULT_URL.to_string())
            } else {
                None
            }
        })
    };
    AppInfo {
        app_version: env!("CARGO_PKG_VERSION"),
        dsh_version,
        dsh_source,
        service_url,
    }
}

/// 读取测试开关 `DSH_APP_MOCK`:
///   - `missing-cli`  模拟未安装 dsh CLI（引导界面）
///   - `no-server`    模拟 3080 无实例且自启失败（连接错误）
fn mock_mode() -> Option<&'static str> {
    match std::env::var("DSH_APP_MOCK").ok().as_deref() {
        Some("missing-cli") => Some("missing-cli"),
        Some("no-server") => Some("no-server"),
        _ => None,
    }
}

/// 前端调用：检测通过后触发连接。防重复：若 3080 已在复用或子进程已存在则跳过。
#[tauri::command]
fn dsh_connect(app: tauri::AppHandle) -> Result<(), String> {
    if mock_mode() == Some("no-server") {
        return Err("[MOCK_NO_SERVER] Mock mode: DSH_APP_MOCK=no-server, spawn deliberately failed".to_string());
    }
    // 已就绪就不重复连接（前端重试场景）。
    // 注意: 只有带 bridge 插件的实例才复用 —— 用户手动起的普通 `dsh web`
    // 没有桌面桥（自绘标题栏 / 设置融合会缺失），必须 spawn 我们自己的实例。
    let owned_url = {
        let state = app.try_state::<ServerState>();
        match state {
            Some(s) => {
                let guard = s.0.lock().unwrap();
                guard.as_ref().map(|(_, url)| url.clone())
            }
            None => None,
        }
    };
    if let Some(url) = owned_url {
        // 复用本进程 spawn 的实例（记住它的随机端口）
        if let Some(win) = app.get_webview_window("main") {
            let _ = navigate_to(&win, &url);
        }
        return Ok(());
    }
    if probe_bridge_ready() {
        // 复用 3080 上带桌面桥的实例
        if let Some(win) = app.get_webview_window("main") {
            let _ = navigate_to(&win, DEFAULT_URL);
        }
        return Ok(());
    }
    thread::spawn(move || {
        if let Err(e) = connect_and_navigate(&app) {
            let _ = app.emit("dsh://phase", format!("error:{e}"));
        }
    });
    Ok(())
}

fn connect_and_navigate(app: &tauri::AppHandle) -> Result<(), ConnectError> {
    let url = if probe_bridge_ready() {
        // 已有带桌面桥的实例在跑: 直接复用
        DEFAULT_URL.to_string()
    } else {
        let _ = app.emit("dsh://phase", "starting:");
        let (child, port) = spawn_dsh_web()?;
        let url = format!("http://127.0.0.1:{port}");
        if let Some(state) = app.try_state::<ServerState>() {
            *state.0.lock().unwrap() = Some((child, url.clone()));
        }
        url
    };

    // 等窗口出现再导航 (splash 先渲染, 避免白屏)
    for _ in 0..50 {
        if let Some(win) = app.get_webview_window("main") {
            let _ = app.emit("dsh://phase", format!("ready:{url}"));
            navigate_to(&win, &url)?;
            return Ok(());
        }
        thread::sleep(Duration::from_millis(100));
    }
    Err(ConnectError::Timeout)
}

fn navigate_to(win: &WebviewWindow, url: &str) -> Result<(), ConnectError> {
    let parsed = url
        .parse::<tauri::Url>()
        .map_err(|e| ConnectError::Io(e.to_string()))?;
    win.navigate(parsed)
        .map_err(|e| ConnectError::Io(e.to_string()))
}

/// 探测 127.0.0.1:3080 是否有 HTTP 服务在监听。
fn probe_ready(url: &str) -> bool {
    let hostport = url
        .trim_start_matches("http://")
        .trim_start_matches("https://")
        .trim_end_matches('/');
    match hostport.parse::<std::net::SocketAddr>() {
        Ok(addr) => TcpStream::connect_timeout(&addr, Duration::from_millis(800)).is_ok(),
        Err(_) => false,
    }
}

/// 探测 127.0.0.1:3080 是否运行着**带桌面桥**的 dsh web 实例。
/// 手写一个最小 HTTP GET /dsh-app/status，避免引入 HTTP 客户端依赖。
fn probe_bridge_ready() -> bool {
    use std::io::{Read, Write};
    let Ok(addr) = "127.0.0.1:3080".parse::<std::net::SocketAddr>() else {
        return false;
    };
    let Ok(mut stream) = TcpStream::connect_timeout(&addr, Duration::from_millis(800)) else {
        return false;
    };
    let req = "GET /dsh-app/status HTTP/1.1\r\nHost: 127.0.0.1:3080\r\nConnection: close\r\n\r\n";
    if stream.write_all(req.as_bytes()).is_err() {
        return false;
    }
    let mut buf = String::new();
    if stream.read_to_string(&mut buf).is_err() {
        return false;
    }
    buf.contains("\"ok\":true")
}

/// 解析 dsh 可执行文件: DSH_BIN 显式路径 > npm 全局包 > PATH 上的 dsh。
/// 返回 (入口, 来源标识)。
fn resolve_dsh() -> Option<(std::path::PathBuf, &'static str)> {
    // 1) DSH_BIN 显式覆盖
    if let Ok(bin) = std::env::var("DSH_BIN") {
        if !bin.is_empty() {
            let p = std::path::PathBuf::from(&bin);
            if p.exists() {
                return Some((p, "dsh_bin"));
            }
        }
    }
    // 2) npm 全局安装的 @deepseek-ai/dsh → lib/bin.js
    if let Some(entry) = npm_global_dsh_entry() {
        return Some((entry, "npm_global"));
    }
    // 3) PATH 上的 dsh
    for name in ["dsh", "dsh.cmd", "dsh.exe"] {
        if let Some(p) = which_on_path(name) {
            return Some((p, "path"));
        }
    }
    None
}

/// 定位 npm 全局安装的 @deepseek-ai/dsh 的 bin.js。
/// 优先用 `npm root -g`（准确），失败时回退常见全局目录。
fn npm_global_dsh_entry() -> Option<std::path::PathBuf> {
    // 尝试 `npm root -g`
    let mut npm_cmd = Command::new("npm");
    npm_cmd.args(["root", "-g"]);
    no_console(&mut npm_cmd);
    if let Ok(out) = npm_cmd.output() {
        if out.status.success() {
            let root = String::from_utf8_lossy(&out.stdout).trim().to_string();
            if !root.is_empty() {
                let entry = std::path::PathBuf::from(&root)
                    .join("@deepseek-ai")
                    .join("dsh")
                    .join("lib")
                    .join("bin.js");
                if entry.exists() {
                    return Some(entry);
                }
            }
        }
    }
    // 回退：Windows 常见全局目录
    #[cfg(windows)]
    {
        if let Ok(appdata) = std::env::var("APPDATA") {
            let entry = std::path::PathBuf::from(&appdata)
                .join("npm")
                .join("node_modules")
                .join("@deepseek-ai")
                .join("dsh")
                .join("lib")
                .join("bin.js");
            if entry.exists() {
                return Some(entry);
            }
        }
    }
    None
}

fn which_on_path(name: &str) -> Option<std::path::PathBuf> {
    let path = std::env::var_os("PATH").unwrap_or_default();
    for dir in std::env::split_paths(&path) {
        let candidate = dir.join(name);
        if candidate.is_file() {
            return Some(candidate);
        }
    }
    None
}

/// dsh-app 独立 profile 名。官方 web profile 保留给用户，我们不碰。
const DSH_APP_PROFILE: &str = "dsh-app";

/// 确保独立 profile `dsh-app` 存在且包含 dsh-app-bridge bundle。
///
/// dsh 的 profile 根在 `$DSH_HOME/profiles/`（默认 `~/.dsh/profiles/`）。
/// 我们的 profile 只加官方 web-app + bridge 两个 bundle，dsh-web-app 由
/// 全局 dsh 的模块树提供（Node 向上查找），无需 npm 安装。
///
/// 幂等：已就绪则不动；仅首次创建。失败只告警不阻断（用户可手动修）。
fn ensure_dsh_app_profile(_dsh: &std::path::Path) -> Result<(), String> {
    use std::io::Write as _;

    let home = std::env::var("DSH_HOME").unwrap_or_else(|_| {
        std::env::var("USERPROFILE")
            .or_else(|_| std::env::var("HOME"))
            .map(|p| format!("{p}/.dsh"))
            .unwrap_or_default()
    });
    let profile_dir = std::path::PathBuf::from(&home).join("profiles").join(DSH_APP_PROFILE);
    let manifest_path = profile_dir.join("package.json");

    // 已存在且含我们的 bundle → 无需处理
    if let Ok(text) = std::fs::read_to_string(&manifest_path) {
        if text.contains("dsh-app-bridge") && text.contains("@deepseek-ai/dsh-web-app") {
            return Ok(());
        }
    }

    std::fs::create_dir_all(&profile_dir).map_err(|e| e.to_string())?;

    // bridge 包目录：相对本应用 exe（target/release/dsh-app.exe → 上两级 = dsh-app 根）
    let exe_dir = std::env::current_exe().ok().and_then(|p| p.parent().map(|p| p.to_path_buf()));
    let bridge_dir = match exe_dir {
        Some(d) => d.parent().and_then(|p| p.parent()).map(|p| p.join("dsh-app-bridge")),
        None => None,
    };
    let bridge_abs = match bridge_dir {
        Some(b) => b.canonicalize().map_err(|e| format!("bridge dir: {e}"))?,
        None => return Err("cannot locate dsh-app-bridge (exe path unexpected)".to_string()),
    };

    let manifest = format!(
        r#"{{
  "name": "dsh-profile-dsh-app",
  "private": true,
  "dependencies": {{
    "dsh-app-bridge": "link:{}"
  }},
  "dsh": {{
    "profile": {{
      "bundles": [
        "@deepseek-ai/dsh-base",
        "@deepseek-ai/dsh-web-app",
        "dsh-app-bridge"
      ]
    }}
  }}
}}
"#,
        bridge_abs.display().to_string().replace('\\', "/")
    );

    let mut f = std::fs::File::create(&manifest_path).map_err(|e| e.to_string())?;
    f.write_all(manifest.as_bytes()).map_err(|e| e.to_string())?;

    // profile 的 node_modules 里建 bridge 链接（dsh plugin 用 pnpm；这里直接
    // 用目录链接，Node 解析 link: 依赖时按路径解析）。
    let nm = profile_dir.join("node_modules");
    std::fs::create_dir_all(&nm).map_err(|e| e.to_string())?;
    let link = nm.join("dsh-app-bridge");
    if !link.exists() {
        #[cfg(windows)]
        {
            // 目录 junction（无需管理员权限）
            let mut mklink = std::process::Command::new("cmd");
            mklink
                .args(["/C", "mklink", "/J", &link.display().to_string(), &bridge_abs.display().to_string()]);
            no_console(&mut mklink);
            let _ = mklink.status();
        }
        #[cfg(not(windows))]
        {
            let _ = std::os::unix::fs::symlink(&bridge_abs, &link);
        }
    }

    eprintln!("[dsh-app] initialized profile {DSH_APP_PROFILE} at {}", profile_dir.display());
    Ok(())
}

/// 运行 `dsh --version`（bin.js 用 node 执行），失败返回 None。
fn probe_dsh_version(entry: &std::path::Path) -> Option<String> {
    let is_js = entry.extension().map(|e| e == "js").unwrap_or(false);
    let out = if is_js {
        let mut c = Command::new("node");
        c.arg(entry).arg("--version");
        no_console(&mut c);
        c.output()
    } else {
        let mut c = Command::new(entry);
        c.arg("--version");
        no_console(&mut c);
        c.output()
    };
    match out {
        Ok(o) if o.status.success() => {
            let v = String::from_utf8_lossy(&o.stdout).trim().to_string();
            if v.is_empty() { None } else { Some(v.chars().take(120).collect()) }
        }
        _ => None,
    }
}

/// 前端调用的 dsh CLI 检测。
#[tauri::command]
fn dsh_detect() -> DshDetectResult {
    if mock_mode() == Some("missing-cli") {
        return DshDetectResult::missing(
            "[MOCK_MISSING_CLI] Mock mode: DSH_APP_MOCK=missing-cli. Install with: npm install -g @deepseek-ai/dsh.",
        );
    }
    match resolve_dsh() {
        Some((entry, source)) => DshDetectResult {
            available: true,
            source: Some(source),
            entry: Some(entry.display().to_string()),
            version: probe_dsh_version(&entry),
            install_hint: "",
        },
        None => DshDetectResult::missing(
            "[DSH_NOT_FOUND] dsh CLI not found. Install it with `npm install -g @deepseek-ai/dsh` \
             or set DSH_BIN to point at a dsh executable.",
        ),
    }
}

/// 启动 dsh web（带 dsh-app-bridge 插件）：
/// 通过独立 profile `dsh-app` 启动，加载官方 web app + 我们的桌面桥插件，
/// 不污染用户自己的 web profile。
fn spawn_dsh_web() -> Result<(Child, u16), ConnectError> {
    let (dsh, source) = resolve_dsh().ok_or(ConnectError::DshNotFound)?;

    // 确保独立 profile 就绪（幂等，失败仅告警——用户可手动处理）
    if let Err(e) = ensure_dsh_app_profile(&dsh) {
        eprintln!("[dsh-app] warning: profile ensure failed: {e}");
    }

    // Windows 上 npm 全局 bin.js 不能直接 spawn，需 `node <bin.js>`；
    // .cmd/.exe/.ps1 直接执行。用 source 区分更可靠。
    let is_js_entry = source == "npm_global" && dsh.extension().map(|e| e == "js").unwrap_or(false);
    let mut cmd = if is_js_entry {
        let mut c = Command::new("node");
        c.arg(&dsh);
        c
    } else {
        Command::new(&dsh)
    };
    cmd.arg("--profile").arg("dsh-app").arg("--port").arg("0");
    cmd.stdout(Stdio::piped()).stderr(Stdio::piped());
    no_console(&mut cmd);

    // Windows 无 confinement 后端时 dsh 默认 workspace-write 无法启动,
    // 与 dsh-desktop-electron 一致: 未显式设置时回退 danger-full-access 并记录。
    #[cfg(windows)]
    if std::env::var_os("DSH_PERMISSION_MODE").is_none() {
        cmd.env("DSH_PERMISSION_MODE", "danger-full-access");
        eprintln!("[dsh-app] warning: DSH_PERMISSION_MODE 未设置, Windows 下回退 danger-full-access");
    }

    let mut child = cmd
        .spawn()
        .map_err(|e| ConnectError::Spawn(e.to_string()))?;

    // 读取就绪行: stdout 是 piped, 在这里阻塞读几行直到匹配。
    if let Some(stdout) = child.stdout.take() {
        let mut reader = BufReader::new(stdout);
        let mut line = String::new();
        let deadline = std::time::Instant::now() + Duration::from_secs(30);
        while std::time::Instant::now() < deadline {
            line.clear();
            match reader.read_line(&mut line) {
                Ok(0) => break, // EOF
                Ok(_) => {
                    let trimmed = line.trim();
                    if let Some(idx) = trimmed.find(READY_MARKER) {
                        let url_part = trimmed[idx + READY_MARKER.len()..].trim();
                        if let Some(port) = parse_port_from_url(url_part) {
                            return Ok((child, port));
                        }
                    }
                }
                Err(_) => break,
            }
        }
    }
    // 超时: 杀掉子进程
    let _ = child.kill();
    Err(ConnectError::Timeout)
}

fn parse_port_from_url(url_part: &str) -> Option<u16> {
    let clean = url_part
        .trim_start_matches("http://")
        .trim_start_matches("https://")
        .trim_end_matches('/');
    let port = clean.rsplit(':').next()?;
    port.parse().ok()
}

fn kill_spawned_server(app: &tauri::AppHandle) {
    if let Some(state) = app.try_state::<ServerState>() {
        if let Ok(mut guard) = state.0.lock() {
            if let Some((mut child, _url)) = guard.take() {
                tree_kill(&mut child);
            }
        }
    }
}

/// Windows 用 taskkill /T 杀整个进程树; 其他平台直接 kill。
fn tree_kill(child: &mut Child) {
    #[cfg(windows)]
    {
        let pid = child.id();
        let mut tk = Command::new("taskkill");
        tk.args(["/PID", &pid.to_string(), "/T", "/F"])
            .stdout(Stdio::null())
            .stderr(Stdio::null());
        no_console(&mut tk);
        let _ = tk.status();
        let _ = child.kill();
    }
    #[cfg(not(windows))]
    {
        let _ = child.kill();
    }
}

// ---------------------------------------------------------------------------
// 托盘
// ---------------------------------------------------------------------------

fn setup_tray(app: &tauri::App) -> tauri::Result<()> {
    let show_i = MenuItem::with_id(app, "show", "显示主窗口", true, None::<&str>)?;
    let quit_i = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

    let _tray = TrayIconBuilder::with_id("dsh-tray")
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => {
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.show();
                    let _ = w.unminimize();
                    let _ = w.set_focus();
                }
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.show();
                    let _ = w.unminimize();
                    let _ = w.set_focus();
                }
            }
        })
        .build(app)?;

    Ok(())
}
