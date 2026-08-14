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
use std::sync::{Arc, Mutex};
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

// ---------------------------------------------------------------------------
// macOS PATH 修复
//
// 从 Finder/Dock 双击启动的 .app 是 GUI 进程, launchd 只给它一个极简 PATH
// (/usr/bin:/bin:/usr/sbin:/sbin)。用户终端里经 Homebrew/nvm/volta 装的
// dsh、npm、node 都不在这个 PATH 上, 导致 resolve_dsh() 的三条探测路径
// (npm root -g / which dsh) 全部失败 —— 即使 CLI 已正确安装也检测不到。
//
// 方案: 启动时用登录 shell (zsh → bash → sh) 取一次完整 PATH 合并进本进程
// 环境, 之后所有子进程 (npm、node、dsh) 都继承它; 再叠加 known_dsh_bin()
// 常见目录兜底, 双保险。
// ---------------------------------------------------------------------------

/// 用登录 shell 恢复完整 PATH 并合并进当前进程（仅 macOS; 幂等）。
#[cfg(target_os = "macos")]
fn merge_login_shell_path() {
    let Some(login_path) = login_shell_path() else {
        return;
    };
    let mut dirs: Vec<std::path::PathBuf> = std::env::split_paths(&login_path).collect();
    // 保留当前 PATH 里登录 shell 没给到的条目, 防止意外丢目录
    if let Some(current) = std::env::var_os("PATH") {
        for dir in std::env::split_paths(&current) {
            if !dirs.contains(&dir) {
                dirs.push(dir);
            }
        }
    }
    if let Ok(merged) = std::env::join_paths(dirs) {
        std::env::set_var("PATH", merged);
    }
}

/// 依次尝试 zsh → bash → sh 登录 shell, 返回第一个成功输出的 PATH。
#[cfg(target_os = "macos")]
fn login_shell_path() -> Option<String> {
    for shell in ["/bin/zsh", "/bin/bash", "/bin/sh"] {
        if let Some(p) = login_shell_path_once(shell) {
            let p = p.trim();
            if !p.is_empty() {
                return Some(p.to_string());
            }
        }
    }
    None
}

/// 跑一次 `shell -l -c 'echo $PATH'`, 最多等 3 秒
/// (防 .zshrc 里的交互命令把启动卡死; 超时杀进程换下一个 shell)。
#[cfg(target_os = "macos")]
fn login_shell_path_once(shell: &str) -> Option<String> {
    use std::io::Read as _;

    let mut child = Command::new(shell)
        .args(["-l", "-c", "echo \"$PATH\""])
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .spawn()
        .ok()?;
    let mut stdout = child.stdout.take()?;
    let reader = thread::spawn(move || {
        let mut s = String::new();
        let _ = stdout.read_to_string(&mut s);
        s
    });
    let deadline = std::time::Instant::now() + Duration::from_secs(3);
    let finished = loop {
        match child.try_wait() {
            Ok(Some(_)) => break true,
            Ok(None) => {
                if std::time::Instant::now() >= deadline {
                    let _ = child.kill();
                    let _ = child.wait();
                    break false;
                }
                thread::sleep(Duration::from_millis(50));
            }
            Err(_) => break false,
        }
    };
    let out = reader.join().unwrap_or_default();
    if finished { Some(out) } else { None }
}

/// 持有拉起的 `dsh web` 子进程与它的 URL, 退出时整树清理。
struct ServerState(Mutex<Option<(Child, String)>>);

/// 前端可读的 dsh CLI 检测结果。
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct DshDetectResult {
    /// CLI 是否可用（能被解析并执行）。
    available: bool,
    /// 定位来源: "dsh_bin" | "npm_global" | "path" | "known_dir" | null
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
    /// dsh CLI 来源: "dsh_bin" | "npm_global" | "path" | "known_dir" | null
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
    /// 带子进程 stderr 尾部/退出状态, 不再盲超时。
    #[error("[CONNECT_TIMEOUT] Timed out waiting for dsh web (30s). {0}")]
    Timeout(String),
    #[error("[CONNECT_IO] Cannot reach the DeepSeek Harness web UI: {0}")]
    Io(String),
}

impl ConnectError {
    /// 稳定的错误码（前端据此做本地化显示）。
    fn code(&self) -> &'static str {
        match self {
            ConnectError::DshNotFound => "DSH_NOT_FOUND",
            ConnectError::Spawn(_) => "SPAWN_FAILED",
            ConnectError::Timeout(_) => "CONNECT_TIMEOUT",
            ConnectError::Io(_) => "CONNECT_IO",
        }
    }
}

pub fn run() {
    // macOS: Finder/Dock 启动的 GUI 进程 PATH 极简, 先合并登录 shell 的完整
    // PATH, 否则 dsh/npm 即使已安装也检测不到。
    #[cfg(target_os = "macos")]
    merge_login_shell_path();
    // 托管环境 (一键安装的 node / dsh) 前置进 PATH, 所有平台生效。
    prepend_managed_env_path();

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
            env_detect,
            install_node,
            install_dsh,
            register_managed_path,
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
        let (child, port) = spawn_dsh_web(app)?;
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
    Err(ConnectError::Timeout(
        "dsh web process started but the port was never announced".to_string(),
    ))
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

/// 解析 dsh 可执行文件: DSH_BIN 显式路径 > npm 全局包 > PATH 上的 dsh > 常见安装目录。
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
    // 4) 常见安装目录兜底（PATH/shell 合并都失效时的最后一层保险）
    if let Some(p) = known_dsh_bin() {
        return Some((p, "known_dir"));
    }
    None
}

/// 定位 npm 全局安装的 @deepseek-ai/dsh 的 bin.js。
/// 优先用 `npm root -g`（准确），失败时回退常见全局目录。
fn npm_global_dsh_entry() -> Option<std::path::PathBuf> {
    // 尝试 `npm root -g`（Windows 上 npm 是 .cmd, 需经 cmd /C）
    let mut npm_cmd = Command::new(if cfg!(windows) { "cmd" } else { "npm" });
    if cfg!(windows) {
        npm_cmd.arg("/C");
    }
    npm_cmd.arg("npm").args(["root", "-g"]);
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
    // 回退：Windows 常见全局目录（含应用托管目录 ~/.dsh-app/npm-global）
    #[cfg(windows)]
    {
        if let Ok(up) = std::env::var("USERPROFILE") {
            let entry = std::path::PathBuf::from(&up)
                .join(".dsh-app")
                .join("npm-global")
                .join("node_modules")
                .join("@deepseek-ai")
                .join("dsh")
                .join("lib")
                .join("bin.js");
            if entry.exists() {
                return Some(entry);
            }
        }
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
    // 回退：Unix/macOS 常见 npm 全局前缀（不依赖 PATH 上的 npm 命令）
    #[cfg(not(windows))]
    {
        let mut prefixes: Vec<std::path::PathBuf> = Vec::new();
        if let Ok(home) = std::env::var("HOME") {
            prefixes.push(std::path::PathBuf::from(&home).join(".npm-global"));
            prefixes.push(std::path::PathBuf::from(&home).join(".dsh-app").join("npm-global"));
        }
        prefixes.push(std::path::PathBuf::from("/opt/homebrew"));
        prefixes.push(std::path::PathBuf::from("/usr/local"));
        for prefix in prefixes {
            let entry = prefix
                .join("lib")
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
    // Windows 上按 PATHEXT 探测扩展名（npm → npm.cmd 等）
    let exts: Vec<String> = if cfg!(windows) {
        std::env::var("PATHEXT")
            .unwrap_or_else(|_| ".COM;.EXE;.BAT;.CMD".into())
            .split(';')
            .filter(|s| !s.is_empty())
            .map(|s| s.to_lowercase())
            .collect()
    } else {
        Vec::new()
    };
    for dir in std::env::split_paths(&path) {
        let candidate = dir.join(name);
        if candidate.is_file() {
            return Some(candidate);
        }
        for e in &exts {
            let c = dir.join(format!("{name}{e}"));
            if c.is_file() {
                return Some(c);
            }
        }
    }
    None
}

/// PATH / shell 合并都失效时的最后一层兜底：探测常见安装位置。
///   - Homebrew: /opt/homebrew/bin/dsh、/usr/local/bin/dsh
///   - npm 自定义 prefix: ~/.npm-global/bin/dsh
///   - volta: ~/.volta/bin/dsh
///   - nvm: ~/.nvm/versions/node/<最新安装版本>/bin/dsh
fn known_dsh_bin() -> Option<std::path::PathBuf> {
    let mut candidates: Vec<std::path::PathBuf> = Vec::new();
    let home_var = if cfg!(windows) { "USERPROFILE" } else { "HOME" };
    if let Ok(home) = std::env::var(home_var) {
        let home = std::path::Path::new(&home);
        if cfg!(windows) {
            // Windows: npm 全局 shim 在 prefix 根目录, 后缀 .cmd (volta 是 .exe)
            candidates.push(home.join(".npm-global").join("dsh.cmd"));
            candidates.push(home.join(".dsh-app").join("npm-global").join("dsh.cmd"));
            candidates.push(home.join(".volta").join("bin").join("dsh.exe"));
        } else {
            candidates.push(home.join(".npm-global").join("bin").join("dsh"));
            candidates.push(home.join(".volta").join("bin").join("dsh"));
            // 应用内一键安装的托管环境
            candidates.push(home.join(".dsh-app").join("npm-global").join("bin").join("dsh"));
        }
        // nvm 装了多个 node 版本时取最新安装的（unix 系布局）
        #[cfg(not(windows))]
        if let Ok(rd) = std::fs::read_dir(home.join(".nvm").join("versions").join("node")) {
            let mut versions: Vec<std::path::PathBuf> = rd.flatten().map(|e| e.path()).collect();
            versions.sort_by_key(|p| {
                std::fs::metadata(p)
                    .and_then(|m| m.modified())
                    .unwrap_or(std::time::UNIX_EPOCH)
            });
            if let Some(newest) = versions.pop() {
                candidates.push(newest.join("bin").join("dsh"));
            }
        }
    }
    candidates.push(std::path::PathBuf::from("/opt/homebrew/bin/dsh"));
    candidates.push(std::path::PathBuf::from("/usr/local/bin/dsh"));
    candidates.into_iter().find(|p| p.is_file())
}

/// dsh-app 独立 profile 名。官方 web profile 保留给用户，我们不碰。
const DSH_APP_PROFILE: &str = "dsh-app";

/// 确保独立 profile `dsh-app` 存在且包含 dsh-app-bridge bundle。
///
/// dsh 的 profile 根在 `$DSH_HOME/profiles/`（默认 `~/.dsh/profiles/`）。
/// 我们的 profile 只加官方 web-app + bridge 两个 bundle，dsh-web-app 由
/// 全局 dsh 的模块树提供（Node 向上查找），无需 npm 安装。
///
/// bridge 插件本体随 app 打包（macOS: .app/Contents/Resources/dsh-app-bridge，
/// 见 tauri.conf.json `bundle.resources`），profile 里只放几行 package.json
/// 和指向 app 内部插件的符号链接——用户环境零安装。
///
/// 幂等：manifest + 链接都就绪则不动；app 移动/升级导致链接失效时自动重建。
/// 失败只告警不阻断（用户可手动修）。
fn ensure_dsh_app_profile(_dsh: &std::path::Path, app: &tauri::AppHandle) -> Result<(), String> {
    use std::io::Write as _;

    let home = std::env::var("DSH_HOME").unwrap_or_else(|_| {
        std::env::var("USERPROFILE")
            .or_else(|_| std::env::var("HOME"))
            .map(|p| format!("{p}/.dsh"))
            .unwrap_or_default()
    });
    let profile_dir = std::path::PathBuf::from(&home).join("profiles").join(DSH_APP_PROFILE);
    let manifest_path = profile_dir.join("package.json");
    let nm = profile_dir.join("node_modules");
    let link = nm.join("dsh-app-bridge");

    // 幂等：manifest 含我们的 bundle 且链接有效 → 无需处理。
    // 链接可能因 app 移动而失效（符号链接指向旧位置），此时继续重建。
    if link.exists() {
        if let Ok(text) = std::fs::read_to_string(&manifest_path) {
            if text.contains("dsh-app-bridge") && text.contains("@deepseek-ai/dsh-web-app") {
                return Ok(());
            }
        }
    }

    std::fs::create_dir_all(&profile_dir).map_err(|e| e.to_string())?;

    // bridge 包目录：优先取随 app 打包的 resource（打包态
    // .app/Contents/Resources/dsh-app-bridge；开发态回退到 exe 上溯两级
    // target/debug|release → 项目根）。
    // resources 的两种写法落点不同（map 形式在资源根，数组 + `..` 形式在
    // `_up_/` 下），两个位置都探测。
    let bridge_abs = match app
        .path()
        .resource_dir()
        .ok()
        .and_then(|r| {
            let mut candidates = vec![r.join("dsh-app-bridge"), r.join("_up_").join("dsh-app-bridge")];
            // Windows NSIS 安装态资源与 exe 同目录, 加一层保险
            if let Ok(exe) = std::env::current_exe() {
                if let Some(dir) = exe.parent() {
                    candidates.push(dir.join("dsh-app-bridge"));
                }
            }
            candidates.into_iter().find(|p| p.is_dir())
        })
    {
        Some(b) => b,
        None => {
            let exe_dir = std::env::current_exe()
                .ok()
                .and_then(|p| p.parent().map(|p| p.to_path_buf()));
            exe_dir
                .as_ref()
                .and_then(|d| d.parent().and_then(|p| p.parent()))
                .map(|p| p.join("dsh-app-bridge"))
                .filter(|p| p.is_dir())
                .ok_or_else(|| {
                    "cannot locate dsh-app-bridge (resource dir or exe path unexpected)".to_string()
                })?
        }
    };
    // canonicalize 得到稳定绝对路径（.app 内 resource 可能经过符号链接）
    let bridge_abs = bridge_abs.canonicalize().map_err(|e| format!("bridge dir: {e}"))?;

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
    std::fs::create_dir_all(&nm).map_err(|e| e.to_string())?;
    // 旧链接可能指向已移动的 app 位置而失效（exists() 跟随链接返回 false），
    // 先清掉再重建，避免 symlink EEXIST。
    if link.symlink_metadata().is_ok() {
        #[cfg(windows)]
        let _ = std::fs::remove_dir(&link); // junction 是目录重解析点
        #[cfg(not(windows))]
        let _ = std::fs::remove_file(&link);
    }
    if !link.exists() {
        #[cfg(windows)]
        {
            // 目录 junction（无需管理员权限）。路径可能含空格
            // （如 C:\Program Files\DSH\...），必须加引号, 否则 mklink 会把
            // 目标拆成多个参数导致链接失败。
            let cmdline = format!(
                "mklink /J \"{}\" \"{}\"",
                link.display(),
                bridge_abs.display()
            );
            let mut mklink = std::process::Command::new("cmd");
            mklink.arg("/C").arg(&cmdline);
            no_console(&mut mklink);
            let st = mklink.status().map_err(|e| format!("mklink: {e}"))?;
            if !st.success() {
                return Err(format!("mklink junction failed (exit {st}): {cmdline}"));
            }
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
        let mut c = run_bin_cmd(entry);
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

// ---------------------------------------------------------------------------
// 一键环境安装
//
// 目标: 用户下载 App 后零操作, 环境在应用内一键装好。
//   - 分步检测 node → npm → dsh
//   - Node 缺失 → 下载官方预编译包到 ~/.dsh-app/node (免管理员, 不改系统),
//     随后用它的 npm 装 dsh 到 ~/.dsh-app/npm-global
//   - dsh 缺失 → npm install -g @deepseek-ai/dsh (系统 npm 优先, 否则托管 npm)
//   - 中文语言 + 中国时区 → 优先 npmmirror 镜像, 失败自动退官方源
// 进度通过 `dsh://install` 事件 (InstallEvent) 推给前端。
// ---------------------------------------------------------------------------

const NODE_VERSION: &str = "v22.14.0";
const NPM_OFFICIAL_REGISTRY: &str = "https://registry.npmjs.org";
const NPM_MIRROR_REGISTRY: &str = "https://registry.npmmirror.com";
const NODE_OFFICIAL_BASE: &str = "https://nodejs.org/dist";
const NODE_MIRROR_BASE: &str = "https://npmmirror.com/mirrors/node";
const MANAGED_NODE_DIR: &str = ".dsh-app/node";
const MANAGED_GLOBAL_DIR: &str = ".dsh-app/npm-global";

fn home_dir() -> Option<std::path::PathBuf> {
    std::env::var_os("HOME")
        .or_else(|| std::env::var_os("USERPROFILE"))
        .map(std::path::PathBuf::from)
}

/// 中文语言环境: LANG/LC_ALL/LC_CTYPE 以 zh 开头或含 zh_CN/zh-CN/zh-Hans。
fn is_chinese_locale() -> bool {
    for var in ["LANG", "LC_ALL", "LC_CTYPE"] {
        if let Ok(v) = std::env::var(var) {
            let v = v.to_lowercase();
            if v.starts_with("zh")
                || v.contains("zh_cn")
                || v.contains("zh-cn")
                || v.contains("zh_hans")
                || v.contains("zh-hans")
            {
                return true;
            }
        }
    }
    false
}

/// 中国时区: TZ 变量或 /etc/localtime 指向 Asia/Shanghai 等。
fn is_china_timezone() -> bool {
    if let Ok(tz) = std::env::var("TZ") {
        let tz = tz.to_lowercase();
        if ["shanghai", "chongqing", "urumqi", "harbin", "beijing"]
            .iter()
            .any(|k| tz.contains(k))
        {
            return true;
        }
    }
    #[cfg(unix)]
    if let Ok(p) = std::fs::read_link("/etc/localtime") {
        if p.to_string_lossy().contains("Asia/Shanghai") {
            return true;
        }
    }
    #[cfg(windows)]
    {
        // Windows: 注册表时区标准名 (China Standard Time = 中国标准时间 UTC+8)
        let mut c = Command::new("reg");
        c.args([
            "query",
            "HKLM\\SYSTEM\\CurrentControlSet\\Control\\TimeZoneInformation",
            "/v",
            "StandardName",
        ]);
        no_console(&mut c);
        if let Ok(o) = c.output() {
            if String::from_utf8_lossy(&o.stdout)
                .to_lowercase()
                .contains("china standard time")
            {
                return true;
            }
        }
    }
    false
}

/// 中文语言判定: 前端传的 navigator.language（GUI 下可靠）优先,
/// 兜底读 LANG/LC_ALL/LC_CTYPE。
fn locale_is_chinese(lang: Option<&str>) -> bool {
    if let Some(l) = lang {
        if l.to_lowercase().starts_with("zh") {
            return true;
        }
    }
    is_chinese_locale()
}

fn use_mirror(lang: Option<&str>) -> bool {
    locale_is_chinese(lang) && is_china_timezone()
}

/// 把托管环境目录前置进 PATH: npm-global/bin 在前 (dsh), node/bin 在后。
/// 所有平台启动时调用; 安装完成后也调用, 使后续子进程立即能找到。
fn prepend_managed_env_path() {
    let Some(home) = home_dir() else { return };
    let mut dirs: Vec<std::path::PathBuf> =
        std::env::split_paths(&std::env::var_os("PATH").unwrap_or_default()).collect();
    let managed = if cfg!(windows) {
        vec![
            home.join(MANAGED_GLOBAL_DIR),
            home.join(MANAGED_NODE_DIR),
        ]
    } else {
        vec![
            home.join(MANAGED_GLOBAL_DIR).join("bin"),
            home.join(MANAGED_NODE_DIR).join("bin"),
        ]
    };
    for d in managed {
        if d.is_dir() && !dirs.contains(&d) {
            dirs.insert(0, d);
        }
    }
    if let Ok(p) = std::env::join_paths(dirs) {
        std::env::set_var("PATH", p);
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ToolStatus {
    present: bool,
    version: Option<String>,
    path: Option<String>,
}

impl ToolStatus {
    fn probe(bin: &str) -> ToolStatus {
        let path = which_on_path(bin).map(|p| p.display().to_string());
        let version = probe_bin_version(bin);
        ToolStatus {
            present: version.is_some() || path.is_some(),
            version,
            path,
        }
    }
}

/// Windows 下 .cmd/.bat 批处理不能直接 CreateProcess（会报 193 不是有效的
/// Win32 应用程序），必须经 cmd /C 执行。统一在此包装。
fn run_bin_cmd(bin: &std::path::Path) -> Command {
    let is_shim = cfg!(windows)
        && bin
            .extension()
            .map(|e| e == "cmd" || e == "bat")
            .unwrap_or(false);
    if is_shim {
        let mut c = Command::new("cmd");
        c.arg("/C").arg(bin);
        c
    } else {
        Command::new(bin)
    }
}

fn probe_bin_version(bin: &str) -> Option<String> {
    // Windows: 裸名可能解析到 .cmd shim（npm → npm.cmd），一律经 cmd /C。
    #[cfg(windows)]
    let mut c = {
        let mut c = Command::new("cmd");
        c.arg("/C").arg(bin);
        c
    };
    #[cfg(not(windows))]
    let mut c = Command::new(bin);
    c.arg("--version");
    no_console(&mut c);
    match c.output() {
        Ok(o) if o.status.success() => {
            let v = String::from_utf8_lossy(&o.stdout).trim().to_string();
            if v.is_empty() { None } else { Some(v.chars().take(60).collect()) }
        }
        _ => None,
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct EnvStatus {
    node: ToolStatus,
    npm: ToolStatus,
    dsh: ToolStatus,
    /// 是否将优先使用国内镜像（中文语言 + 中国时区）。
    use_mirror: bool,
    /// 托管 Node 安装目录（未安装时是计划路径）。
    managed_node: Option<String>,
    /// 托管 npm 全局目录（dsh 装在这里）。
    managed_global: Option<String>,
}

/// 分步环境检测: node / npm / dsh 的状态 + 镜像策略。
#[tauri::command]
fn env_detect(lang: Option<String>) -> EnvStatus {
    let (dsh_entry, dsh_ver) = match resolve_dsh() {
        Some((e, _)) => (Some(e.display().to_string()), probe_dsh_version(&e)),
        None => (None, None),
    };
    EnvStatus {
        node: ToolStatus::probe("node"),
        npm: ToolStatus::probe("npm"),
        dsh: ToolStatus {
            present: dsh_entry.is_some(),
            version: dsh_ver,
            path: dsh_entry,
        },
        use_mirror: use_mirror(lang.as_deref()),
        managed_node: home_dir().map(|h| h.join(MANAGED_NODE_DIR).display().to_string()),
        managed_global: home_dir().map(|h| h.join(MANAGED_GLOBAL_DIR).display().to_string()),
    }
}

/// 安装进度事件: stage ∈ starting/downloading/extracting/installing/log/done/error
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct InstallEvent {
    stage: String,
    message: String,
    ok: Option<bool>,
}

fn emit_install(app: &tauri::AppHandle, stage: &str, message: String, ok: Option<bool>) {
    let _ = app.emit(
        "dsh://install",
        InstallEvent {
            stage: stage.to_string(),
            message,
            ok,
        },
    );
}

fn node_platform_triple() -> Option<&'static str> {
    match (std::env::consts::OS, std::env::consts::ARCH) {
        ("macos", "aarch64") => Some("darwin-arm64"),
        ("macos", "x86_64") => Some("darwin-x64"),
        ("windows", "x86_64") => Some("win-x64"),
        ("windows", "aarch64") => Some("win-arm64"),
        ("linux", "x86_64") => Some("linux-x64"),
        ("linux", "aarch64") => Some("linux-arm64"),
        _ => None,
    }
}

/// 一键安装 Node（托管到 ~/.dsh-app/node）。异步执行, 进度走事件。
#[tauri::command]
fn install_node(lang: Option<String>, app: tauri::AppHandle) -> Result<(), String> {
    let triple = node_platform_triple().ok_or("unsupported platform for managed node install")?;
    thread::spawn(move || {
        install_node_impl(&app, triple, lang);
    });
    Ok(())
}

fn install_node_impl(app: &tauri::AppHandle, triple: &str, lang: Option<String>) {
    let Some(home) = home_dir() else {
        emit_install(app, "error", "cannot resolve home dir".into(), Some(false));
        return;
    };
    let ext = if cfg!(windows) { ".zip" } else { ".tar.gz" };
    let file = format!("node-{NODE_VERSION}-{triple}{ext}");
    let mirror = use_mirror(lang.as_deref());
    let urls: Vec<String> = if mirror {
        vec![
            format!("{NODE_MIRROR_BASE}/{NODE_VERSION}/{file}"),
            format!("{NODE_OFFICIAL_BASE}/{NODE_VERSION}/{file}"),
        ]
    } else {
        vec![format!("{NODE_OFFICIAL_BASE}/{NODE_VERSION}/{file}")]
    };
    let tmp = std::env::temp_dir().join(&file);

    // 下载: 镜像 → 官方 退避
    let mut downloaded = false;
    for (i, url) in urls.iter().enumerate() {
        let label = if mirror && i == 0 { "国内镜像" } else { "官方源" };
        emit_install(app, "downloading", format!("正在下载 Node {NODE_VERSION}（{label}）"), None);
        let mut c = Command::new(if cfg!(windows) { "curl.exe" } else { "curl" });
        c.args(["-fL", "--retry", "3", "--connect-timeout", "10", "-o"])
            .arg(&tmp)
            .arg(url);
        no_console(&mut c);
        match c.status() {
            Ok(s) if s.success() => {
                downloaded = true;
                break;
            }
            Ok(_) => emit_install(app, "downloading", format!("{label}下载失败，尝试下一个源…"), None),
            Err(e) => emit_install(app, "downloading", format!("{label}下载失败: {e}，尝试下一个源…"), None),
        }
    }
    if !downloaded {
        let _ = std::fs::remove_file(&tmp);
        emit_install(app, "error", format!("Node {NODE_VERSION} 所有源下载失败，请检查网络后重试"), Some(false));
        return;
    }

    // 解压到 staging 再原子替换 node_dir
    emit_install(app, "extracting", "正在解压安装…".into(), None);
    let node_dir = home.join(MANAGED_NODE_DIR);
    let staging = home.join(".dsh-app").join(".node-tmp");
    let _ = std::fs::remove_dir_all(&staging);
    if std::fs::create_dir_all(&staging).is_err() {
        emit_install(app, "error", "无法创建安装目录".into(), Some(false));
        return;
    }
    // 解压: 统一用系统自带 tar (macOS/Linux 处理 .tar.gz, Windows 10+ 的
    // bsdtar 同样支持 .zip), 一律 --strip-components=1 拍平顶层目录。
    // 之前 Windows 用 PowerShell Expand-Archive 会保留 zip 的顶层文件夹,
    // 导致 node.exe 不在 ~/.dsh-app/node 根目录, 验证必然失败。
    let extract_ok = {
        let mut c = Command::new("tar");
        c.arg(if cfg!(windows) { "-xf" } else { "-xzf" });
        c.arg(&tmp.display().to_string())
            .arg("-C")
            .arg(&staging.display().to_string())
            .arg("--strip-components=1");
        no_console(&mut c);
        c.status().map(|s| s.success()).unwrap_or(false)
    };
    let _ = std::fs::remove_file(&tmp);
    if !extract_ok {
        let _ = std::fs::remove_dir_all(&staging);
        emit_install(app, "error", "解压失败，请重试".into(), Some(false));
        return;
    }
    let _ = std::fs::remove_dir_all(&node_dir);
    if std::fs::rename(&staging, &node_dir).is_err() {
        emit_install(app, "error", "安装目录替换失败".into(), Some(false));
        return;
    }

    // 验证
    let node_bin = node_dir.join(if cfg!(windows) { "node.exe" } else { "bin/node" });
    let ver = Command::new(&node_bin)
        .arg("--version")
        .output()
        .ok()
        .and_then(|o| {
            if o.status.success() {
                Some(String::from_utf8_lossy(&o.stdout).trim().to_string())
            } else {
                None
            }
        });
    match ver {
        Some(v) => {
            prepend_managed_env_path();
            emit_install(app, "done", format!("Node 安装完成: {v}"), Some(true));
        }
        None => emit_install(app, "error", "Node 安装完成但验证失败，请手动检查".into(), Some(false)),
    }
}

/// 一键安装 dsh CLI: npm install -g @deepseek-ai/dsh（registry 镜像退避）。
/// 系统 npm 优先; 没有则用托管 node 的 npm 装到托管全局目录。
#[tauri::command]
fn install_dsh(lang: Option<String>, app: tauri::AppHandle) -> Result<(), String> {
    thread::spawn(move || {
        install_dsh_impl(&app, lang);
    });
    Ok(())
}

/// npm 调用方式: 系统 npm（Windows 上为 .cmd shim, 需 cmd /C）
/// 或托管 node 的 npm-cli.js（直接用 node 执行, 免 cmd）。
enum NpmInvocation {
    System(std::path::PathBuf),
    Managed {
        node: std::path::PathBuf,
        cli: std::path::PathBuf,
    },
}

fn install_dsh_impl(app: &tauri::AppHandle, lang: Option<String>) {
    // 托管 node 优先: 用它装进 ~/.dsh-app/npm-global, 自包含、不碰系统环境。
    // （之前的顺序会把托管 npm.cmd 误判成"系统 npm", 装进 %APPDATA%\npm。）
    let managed_node = home_dir()
        .map(|h| h.join(MANAGED_NODE_DIR))
        .filter(|d| d.exists());
    let system_npm = which_on_path("npm");
    let npm = if let Some(nd) = &managed_node {
        let node_bin = if cfg!(windows) {
            nd.join("node.exe")
        } else {
            nd.join("bin").join("node")
        };
        let cli = nd
            .join("node_modules")
            .join("npm")
            .join("bin")
            .join("npm-cli.js");
        Some(NpmInvocation::Managed {
            node: node_bin,
            cli,
        })
    } else if let Some(s) = &system_npm {
        Some(NpmInvocation::System(s.clone()))
    } else {
        None
    };
    let Some(npm) = npm else {
        emit_install(app, "error", "未找到 npm：请先安装 Node 环境".into(), Some(false));
        return;
    };
    let using_managed = matches!(npm, NpmInvocation::Managed { .. });

    let mirror = use_mirror(lang.as_deref());
    let registries: Vec<&str> = if mirror {
        vec![NPM_MIRROR_REGISTRY, NPM_OFFICIAL_REGISTRY]
    } else {
        vec![NPM_OFFICIAL_REGISTRY]
    };

    let mut last_err = String::new();
    for (i, reg) in registries.iter().enumerate() {
        let label = if mirror && i == 0 { "国内镜像" } else { "官方源" };
        emit_install(app, "installing", format!("正在安装 dsh CLI（{label} registry）…"), None);
        let mut c = match &npm {
            NpmInvocation::System(p) => {
                if cfg!(windows) {
                    let mut c = Command::new("cmd");
                    c.arg("/C").arg(p);
                    c
                } else {
                    Command::new(p)
                }
            }
            NpmInvocation::Managed { node, cli } => {
                let mut c = Command::new(node);
                c.arg(cli);
                c
            }
        };
        c.arg("install").arg("-g").arg("--no-audit").arg("--no-fund");
        if using_managed {
            if let Some(g) = home_dir() {
                c.arg("--prefix").arg(g.join(MANAGED_GLOBAL_DIR));
            }
        }
        c.arg("@deepseek-ai/dsh").arg(format!("--registry={reg}"));
        no_console(&mut c);
        match run_streaming(&mut c, app) {
            Ok(()) => {
                prepend_managed_env_path();
                emit_install(app, "done", "dsh CLI 安装完成".into(), Some(true));
                return;
            }
            Err(e) => {
                last_err = e;
                emit_install(app, "installing", format!("{label}安装失败，尝试下一个源…"), None);
            }
        }
    }
    emit_install(app, "error", format!("dsh CLI 安装失败：{last_err}"), Some(false));
}

/// 运行命令并把 stdout/stderr 行流式发成 log 事件; 成功返回 Ok(())。
fn run_streaming(cmd: &mut Command, app: &tauri::AppHandle) -> Result<(), String> {
    use std::io::{BufRead, BufReader};
    cmd.stdout(Stdio::piped()).stderr(Stdio::piped());
    let mut child = cmd.spawn().map_err(|e| e.to_string())?;
    let stdout = child.stdout.take();
    let stderr = child.stderr.take();
    let a1 = app.clone();
    let t1 = stdout.map(|s| {
        thread::spawn(move || {
            let r = BufReader::new(s);
            for line in r.lines().map_while(Result::ok) {
                let l = line.trim();
                if !l.is_empty() {
                    emit_install(&a1, "log", l.chars().take(200).collect(), None);
                }
            }
        })
    });
    let a2 = app.clone();
    let t2 = stderr.map(|s| {
        thread::spawn(move || {
            let r = BufReader::new(s);
            for line in r.lines().map_while(Result::ok) {
                let l = line.trim();
                if !l.is_empty() {
                    emit_install(&a2, "log", l.chars().take(200).collect(), None);
                }
            }
        })
    });
    let status = child.wait().map_err(|e| e.to_string())?;
    if let Some(t) = t1 {
        let _ = t.join();
    }
    if let Some(t) = t2 {
        let _ = t.join();
    }
    if status.success() {
        Ok(())
    } else {
        Err(format!("exit code {}", status.code().unwrap_or(-1)))
    }
}

/// 把托管环境目录注册进用户级 PATH（免管理员、幂等），
/// 让终端（PowerShell/zsh/bash）新窗口也能直接用 node/npm/dsh。
#[tauri::command]
fn register_managed_path() -> Result<(), String> {
    let Some(home) = home_dir() else {
        return Err("cannot resolve home dir".into());
    };
    let node_dir = home.join(MANAGED_NODE_DIR);
    let global_dir = home.join(MANAGED_GLOBAL_DIR);
    if !node_dir.is_dir() || !global_dir.is_dir() {
        return Err("managed environment not installed yet".into());
    }

    #[cfg(windows)]
    {
        // 写用户级 PATH（HKCU\Environment），免管理员; 幂等。
        let script = format!(
            "$p=[Environment]::GetEnvironmentVariable('Path','User'); \
             $add='{0}\\node;{0}\\npm-global'; \
             if($p -notlike '*\\.dsh-app\\node*'){{ \
               $np = if($p){{ $p.TrimEnd(';') + ';' + $add }} else {{ $add }}; \
               [Environment]::SetEnvironmentVariable('Path', $np, 'User') \
             }}",
            home.display()
        );
        let mut c = Command::new("powershell");
        c.args(["-NoProfile", "-Command", &script]);
        no_console(&mut c);
        let st = c.status().map_err(|e| e.to_string())?;
        if !st.success() {
            return Err(format!("powershell PATH registration failed (exit {st})"));
        }
        return Ok(());
    }

    #[cfg(not(windows))]
    {
        // 追加 export 行到 ~/.zprofile 与 ~/.profile（幂等）。
        use std::io::Write as _;
        let line = "# dsh-app managed env\nexport PATH=\"$HOME/.dsh-app/npm-global/bin:$HOME/.dsh-app/node/bin:$PATH\"";
        for rc in [".zprofile", ".profile"] {
            let path = home.join(rc);
            if let Ok(existing) = std::fs::read_to_string(&path) {
                if existing.contains(".dsh-app/npm-global") {
                    continue;
                }
            }
            let mut f = std::fs::OpenOptions::new()
                .create(true)
                .append(true)
                .open(&path)
                .map_err(|e| e.to_string())?;
            writeln!(f, "\n{line}").map_err(|e| e.to_string())?;
        }
        Ok(())
    }
}


/// 启动 dsh web（带 dsh-app-bridge 插件）：
/// 通过独立 profile `dsh-app` 启动，加载官方 web app + 我们的桌面桥插件，
/// 不污染用户自己的 web profile。
fn spawn_dsh_web(app: &tauri::AppHandle) -> Result<(Child, u16), ConnectError> {
    let (dsh, source) = resolve_dsh().ok_or(ConnectError::DshNotFound)?;

    // 确保独立 profile 就绪（幂等，失败仅告警——用户可手动处理）；
    // 把失败原因拼进最终错误详情, 让连接失败不再无信息。
    let mut context: Vec<String> = Vec::new();
    if let Err(e) = ensure_dsh_app_profile(&dsh, app) {
        eprintln!("[dsh-app] warning: profile ensure failed: {e}");
        context.push(format!("profile ensure failed: {e}"));
    }

    // Windows 上 npm 全局 bin.js 不能直接 spawn，需 `node <bin.js>`；
    // .cmd shim 需经 cmd /C（run_bin_cmd 处理）。用 source 区分更可靠。
    let is_js_entry = source == "npm_global" && dsh.extension().map(|e| e == "js").unwrap_or(false);
    let mut cmd = if is_js_entry {
        let mut c = Command::new("node");
        c.arg(&dsh);
        c
    } else {
        run_bin_cmd(&dsh)
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

    // 持续排空 stderr: 防止子进程写满管道缓冲被阻塞, 并保留尾部用于诊断。
    let stderr_tail: Arc<Mutex<String>> = Arc::new(Mutex::new(String::new()));
    if let Some(stderr) = child.stderr.take() {
        let tail = Arc::clone(&stderr_tail);
        thread::spawn(move || {
            let reader = BufReader::new(stderr);
            for line in reader.lines().map_while(Result::ok) {
                let l = line.trim();
                if l.is_empty() {
                    continue;
                }
                let mut t = tail.lock().unwrap();
                t.push_str(&l.chars().take(300).collect::<String>());
                t.push('\n');
                let lines: Vec<&str> = t.lines().collect();
                if lines.len() > 8 {
                    *t = format!("{}\n", lines[lines.len() - 8..].join("\n"));
                }
            }
        });
    }

    // 读取就绪行: stdout 是 piped, 在这里阻塞读几行直到匹配。
    if let Some(stdout) = child.stdout.take() {
        let mut reader = BufReader::new(stdout);
        let mut line = String::new();
        let deadline = std::time::Instant::now() + Duration::from_secs(30);
        while std::time::Instant::now() < deadline {
            line.clear();
            match reader.read_line(&mut line) {
                Ok(0) => break, // EOF: 子进程已退出
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
    // 失败: 尽量把子进程退出状态 + stderr 尾部带出去, 不再盲超时。
    let exit = child.try_wait().ok().flatten();
    let stderr_msg = stderr_tail.lock().unwrap().trim().to_string();
    let _ = child.kill();
    let detail = if !stderr_msg.is_empty() {
        format!("dsh web 输出: {stderr_msg}")
    } else if let Some(st) = exit {
        format!("dsh web 未就绪即退出: {st}")
    } else {
        "dsh web 未在 30 秒内输出就绪行".to_string()
    };
    let full = if context.is_empty() {
        detail
    } else {
        format!("{}; {}", context.join("; "), detail)
    };
    Err(ConnectError::Timeout(full))
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

