import type { CSSProperties } from "react";
import { invoke } from "@tauri-apps/api/core";

/**
 * 自绘标题栏：替代 Windows 原生标题栏（缩小 / 放大 / 关闭 + 标题 + 拖拽）。
 *
 * decorations:false 的窗口没有原生标题栏，所有控制都在这里。
 * - 拖拽区：data-tauri-drag-region 让 Tauri 内核处理窗口拖动
 * - 按钮：invoke 到 Rust 的 window_* 命令
 * - 主题：splash（检测/引导）固定浅色，与浅色页面一致
 */
export default function TitleBar() {
  const minimize = () => {
    invoke("window_minimize").catch(() => {});
  };
  const toggleMaximize = () => {
    invoke("window_toggle_maximize").catch(() => {});
  };
  const close = () => {
    invoke("window_close").catch(() => {});
  };

  const titleColor = "#5f6673";
  const btnColor = "#4a505c";
  const barBg = "rgba(255, 255, 255, 0.94)";
  const border = "1px solid rgba(0,0,0,0.08)";
  const hoverBg = "rgba(0,0,0,0.06)";

  return (
    <div
      data-tauri-drag-region
      style={{
        display: "flex",
        alignItems: "center",
        height: 36,
        flexShrink: 0,
        boxSizing: "border-box",
        background: barBg,
        borderBottom: border,
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
    >
      <img
        src="/favicon.svg"
        alt=""
        style={{ width: 16, height: 16, marginLeft: 12, marginRight: 8 }}
        draggable={false}
      />
      <span
        style={{
          flex: 1,
          fontSize: 12.5,
          color: titleColor,
          fontWeight: 500,
          letterSpacing: 0.2,
        }}
      >
        DeepSeek Harness
      </span>
      <button
        onClick={minimize}
        title="最小化"
        style={{ ...btnStyle, color: btnColor }}
        onMouseEnter={(e) => (e.currentTarget.style.background = hoverBg)}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        <svg width="10" height="10" viewBox="0 0 10 10">
          <line x1="0" y1="5" x2="10" y2="5" stroke="currentColor" strokeWidth="1" />
        </svg>
      </button>
      <button
        onClick={toggleMaximize}
        title="最大化 / 还原"
        style={{ ...btnStyle, color: btnColor }}
        onMouseEnter={(e) => (e.currentTarget.style.background = hoverBg)}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <rect x="0.5" y="0.5" width="9" height="9" stroke="currentColor" strokeWidth="1" />
        </svg>
      </button>
      <button
        onClick={close}
        title="关闭"
        style={{ ...btnStyle, width: 46, color: btnColor }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#e81123";
          e.currentTarget.style.color = "#fff";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = btnColor;
        }}
      >
        <svg width="10" height="10" viewBox="0 0 10 10">
          <line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" strokeWidth="1" />
          <line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" strokeWidth="1" />
        </svg>
      </button>
    </div>
  );
}

const btnStyle: CSSProperties = {
  width: 46,
  height: 36,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border: "none",
  background: "transparent",
  cursor: "pointer",
  transition: "background 0.1s",
};
