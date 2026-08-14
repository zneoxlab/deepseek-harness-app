fn main() {
    // 声明 app 自定义命令的 ACL（生成 allow-<command> 权限），
    // 这样远程页面（官方 dsh web UI）也能通过 capability 调用它们。
    tauri_build::try_build(
        tauri_build::Attributes::new().app_manifest(
            tauri_build::AppManifest::new().commands(&[
                "dsh_detect",
                "dsh_connect",
                "app_info",
                "window_minimize",
                "window_toggle_maximize",
                "window_close",
                "window_start_dragging",
                "window_set_theme",
                "save_settings",
                "get_settings",
            ]),
        ),
    )
    .expect("failed to run tauri-build");
}
