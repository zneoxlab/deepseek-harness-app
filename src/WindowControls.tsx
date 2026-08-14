import type { CSSProperties } from "react";
import { invoke } from "@tauri-apps/api/core";
import { t } from "./i18n";

/**
 * splash 阶段的自绘标题栏（与系统边框融合）：
 *
 *   - macOS: 完全使用原生标题栏（红绿灯 + 原生标题 + 原生圆角），
 *     splash 不渲染任何条带。
 *   - Linux: 左上角圆形按钮（GNOME 风格）+ 标题。
 *   - Windows: 标题在左，右上角方形按钮（Win11 caption 风格，32px）。
 * 整条都是拖拽区（data-tauri-drag-region，按钮本身可点击）。
 */
export default function WindowControls() {
  const minimize = () => {
    invoke("window_minimize").catch(() => {});
  };
  const toggleMaximize = () => {
    invoke("window_toggle_maximize").catch(() => {});
  };
  const close = () => {
    invoke("window_close").catch(() => {});
  };

  const platform = detectPlatform();
  const height = platform === "macos" ? 28 : platform === "windows" ? 32 : 38;
  const strip: CSSProperties = {
    display: "flex",
    alignItems: "center",
    height,
    flexShrink: 0,
    width: "100%",
    boxSizing: "border-box",
    background: "#ffffff",
    borderBottom: "1px solid rgba(0,0,0,0.08)",
    userSelect: "none",
    WebkitUserSelect: "none",
  };

  if (platform === "windows") {
    return (
      <div data-tauri-drag-region style={{ ...strip, paddingLeft: 12 }}>
        <span style={titleStyle}>DeepSeek Harness</span>
        <div style={{ flex: 1 }} />
        <button onClick={minimize} title={t("最小化", "Minimize")} style={{ ...winBtn }} onMouseEnter={hoverGray} onMouseLeave={hoverClear}>
          <svg width="10" height="10" viewBox="0 0 10 10">
            <line x1="0" y1="5" x2="10" y2="5" stroke="currentColor" strokeWidth="1" />
          </svg>
        </button>
        <button onClick={toggleMaximize} title={t("最大化 / 还原", "Maximize / Restore")} style={{ ...winBtn }} onMouseEnter={hoverGray} onMouseLeave={hoverClear}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <rect x="0.5" y="0.5" width="9" height="9" stroke="currentColor" strokeWidth="1" />
          </svg>
        </button>
        <button
          onClick={close}
          title={t("关闭", "Close")}
          style={{ ...winBtn }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#c42b1c";
            e.currentTarget.style.color = "#fff";
          }}
          onMouseLeave={hoverClear}
        >
          <svg width="10" height="10" viewBox="0 0 10 10">
            <line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" strokeWidth="1" />
            <line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" strokeWidth="1" />
          </svg>
        </button>
      </div>
    );
  }

  if (platform === "macos") {
    // macOS 完全使用原生标题栏（红绿灯 + 原生标题 + 原生圆角），
    // WebView 视口本身从标题栏下缘开始 —— splash 无需任何条带。
    return null;
  }

  // Linux: 左上角圆形按钮 + 标题
  return (
    <>
      <style>{circleCss}</style>
      <div data-tauri-drag-region className="dsh-splash-tb" style={{ ...strip, paddingLeft: 12 }}>
        <button className="wc" title={t("关闭", "Close")} onClick={close}>
          <svg width="8" height="8" viewBox="0 0 8 8">
            <path d="M1.5 1.5 L6.5 6.5 M6.5 1.5 L1.5 6.5" stroke="rgba(0,0,0,0.55)" strokeWidth="1.1" strokeLinecap="round" />
          </svg>
        </button>
        <button className="wc" title={t("最小化", "Minimize")} onClick={minimize}>
          <svg width="8" height="8" viewBox="0 0 8 8">
            <path d="M1.5 4 H6.5" stroke="rgba(0,0,0,0.55)" strokeWidth="1.1" strokeLinecap="round" />
          </svg>
        </button>
        <button className="wc" title={t("最大化 / 还原", "Maximize / Restore")} onClick={toggleMaximize}>
          <svg width="9" height="9" viewBox="0 0 9 9">
            <path d="M2.4 3.1 L3.1 2.4 L2.4 2.4 Z" fill="rgba(0,0,0,0.5)" />
            <path d="M5.9 6.6 L6.6 5.9 L6.6 6.6 Z" fill="rgba(0,0,0,0.5)" />
          </svg>
        </button>
        <span style={titleStyle}>DeepSeek Harness</span>
        <div style={{ flex: 1 }} />
      </div>
    </>
  );
}

function detectPlatform(): "macos" | "linux" | "windows" {
  const ua = navigator.userAgent;
  const plat = navigator.platform || "";
  if (/mac/i.test(plat) || /Macintosh/.test(ua)) return "macos";
  if (/win/i.test(plat) || /Windows NT/.test(ua)) return "windows";
  return "linux";
}

const hoverGray = (e: React.MouseEvent<HTMLButtonElement>) => {
  e.currentTarget.style.background = "rgba(0,0,0,0.06)";
};
const hoverClear = (e: React.MouseEvent<HTMLButtonElement>) => {
  e.currentTarget.style.background = "transparent";
  e.currentTarget.style.color = "";
};

const titleStyle: CSSProperties = {
  fontSize: 12.5,
  color: "#5f6673",
  fontWeight: 500,
  letterSpacing: 0.2,
  marginLeft: 10,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const winBtn: CSSProperties = {
  width: 46,
  height: 32,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border: "none",
  background: "transparent",
  color: "#4a505c",
  cursor: "pointer",
  transition: "background 0.1s",
  flexShrink: 0,
};

const circleCss = `
.dsh-splash-tb .wc {
  width: 12px;
  height: 12px;
  flex: none;
  border: none;
  padding: 0;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #a8adb8;
  margin-right: 8px;
}
.dsh-splash-tb .wc:hover { filter: brightness(1.1); }
`;
