// P1: 连接模式 — 智能模式 / 显式连接。
//
// 注意：这是参考实现，当前未接入 lib.rs（等 P0 构建完成后合入）。
// 与 lib.rs 的 connect_and_navigate 合并后替换为单一入口。

use serde::{Deserialize, Serialize};
use std::net::TcpStream;
use std::path::PathBuf;
use std::time::Duration;

/// 默认探测目标: 官方 `dsh web` 的监听地址。
pub const DEFAULT_URL: &str = "http://127.0.0.1:3080";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "kind", content = "url", rename_all = "snake_case")]
pub enum ConnectTarget {
    /// 智能模式: 探测 127.0.0.1:3080 已有实例 → 复用; 否则自启 `dsh web --port 0`
    Smart,
    /// 显式连接: 直接导航到给定 URL（远程机器 / 容器 / 自行维护的实例）
    Explicit(String),
}

impl Default for ConnectTarget {
    fn default() -> Self {
        ConnectTarget::Smart
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub connect: ConnectTarget,
    pub autostart: bool,
    pub notifications_enabled: bool,
    /// 全局快捷键，默认 CmdOrCtrl+Shift+Space
    pub shortcut: String,
}

impl Default for AppSettings {
    fn default() -> Self {
        AppSettings {
            connect: ConnectTarget::Smart,
            autostart: false,
            notifications_enabled: true,
            shortcut: "CmdOrCtrl+Shift+Space".to_string(),
        }
    }
}

impl AppSettings {
    /// 设置文件位置: $DSH_APP_HOME/settings.json（默认 ~/.dsh-app/settings.json），
    /// 与官方 $DSH_HOME（~/.dsh）分离，桌面壳偏好不污染官方数据。
    pub fn path() -> PathBuf {
        if let Ok(home) = std::env::var("DSH_APP_HOME") {
            if !home.is_empty() {
                return PathBuf::from(home).join("settings.json");
            }
        }
        let base = std::env::var_os("USERPROFILE")
            .or_else(|| std::env::var_os("HOME"))
            .unwrap_or_default();
        PathBuf::from(base).join(".dsh-app").join("settings.json")
    }

    pub fn load() -> Self {
        let p = Self::path();
        match std::fs::read_to_string(&p) {
            Ok(raw) => serde_json::from_str(&raw).unwrap_or_default(),
            Err(_) => Self::default(),
        }
    }

    pub fn save(&self) -> Result<(), String> {
        let p = Self::path();
        if let Some(dir) = p.parent() {
            let _ = std::fs::create_dir_all(dir);
        }
        let raw = serde_json::to_string_pretty(self).map_err(|e| e.to_string())?;
        std::fs::write(&p, raw).map_err(|e| e.to_string())
    }
}

/// URL scheme 白名单: 只允许 http/https（loopback 或远程）。
pub fn sanitize_url(raw: &str) -> Option<String> {
    let trimmed = raw.trim().trim_end_matches('/');
    if trimmed.is_empty() {
        return None;
    }
    if trimmed.starts_with("http://") || trimmed.starts_with("https://") {
        Some(trimmed.to_string())
    } else {
        None
    }
}

/// 探测给定 URL 是否可达（TCP 连接）。
pub fn probe_url(url: &str) -> bool {
    let hostport = url
        .trim_start_matches("http://")
        .trim_start_matches("https://")
        .trim_end_matches('/');
    match hostport.parse::<std::net::SocketAddr>() {
        Ok(addr) => TcpStream::connect_timeout(&addr, Duration::from_millis(1200)).is_ok(),
        Err(_) => false,
    }
}

/// 由 ConnectTarget 决定最终要导航的 URL。
/// Smart: 探测 3080 → 复用；否则由调用方自启并传入实际端口。
/// Explicit: 校验并原样返回。
pub fn resolve_target(target: &ConnectTarget, spawned_port: Option<u16>) -> Result<String, String> {
    match target {
        ConnectTarget::Smart => {
            if probe_url(DEFAULT_URL) {
                Ok(DEFAULT_URL.to_string())
            } else if let Some(port) = spawned_port {
                Ok(format!("http://127.0.0.1:{port}"))
            } else {
                Err("没有可用的 dsh web 实例".to_string())
            }
        }
        ConnectTarget::Explicit(raw) => {
            let url = sanitize_url(raw).ok_or_else(|| "无效的 URL：仅支持 http:// 或 https://".to_string())?;
            if probe_url(&url) {
                Ok(url)
            } else {
                Err(format!("无法连接到 {url}"))
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sanitize_rejects_bad_schemes() {
        assert!(sanitize_url("file:///etc/passwd").is_none());
        assert!(sanitize_url("javascript:alert(1)").is_none());
        assert!(sanitize_url("").is_none());
        assert_eq!(sanitize_url("http://192.168.1.10:3080/"), Some("http://192.168.1.10:3080".to_string()));
    }

    #[test]
    fn settings_default_and_roundtrip() {
        let s = AppSettings::default();
        let raw = serde_json::to_string(&s).unwrap();
        let back: AppSettings = serde_json::from_str(&raw).unwrap();
        assert_eq!(back.connect, ConnectTarget::Smart);
    }
}
