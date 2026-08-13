import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { localizeError, t } from "./i18n";
import TitleBar from "./TitleBar";

type DshDetect = {
  available: boolean;
  source: string | null;
  entry: string | null;
  version: string | null;
  installHint: string;
};

type ConnState =
  | { phase: "checking" }
  | { phase: "missing"; detect: DshDetect }
  | { phase: "starting" }
  | { phase: "ready"; url: string }
  | { phase: "error"; message: string };

const styles = {
  wrap: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
    flex: 1,
    padding: 40,
    textAlign: "center" as const,
  },
  logo: { width: 72, height: 72, display: "flex", alignItems: "center", justifyContent: "center" },
  logoImg: { width: 72, height: 72 },
  title: { fontSize: 20, fontWeight: 600, margin: 0 },
  sub: { fontSize: 14, color: "var(--muted)", margin: 0, maxWidth: 460, lineHeight: 1.6 },
  url: {
    fontSize: 13,
    color: "var(--accent)",
    fontFamily: "ui-monospace, Consolas, monospace",
    wordBreak: "break-all" as const,
  },
  err: { fontSize: 13, color: "#dc2626", maxWidth: 460, lineHeight: 1.6 },
  bar: { width: 220, height: 4, borderRadius: 2, background: "#e2e5ea", overflow: "hidden" },
  barFill: {
    height: "100%",
    width: "40%",
    background: "var(--accent)",
    borderRadius: 2,
    animation: "dsh-load 1.1s ease-in-out infinite",
  },
  installCard: {
    background: "#ffffff",
    border: "1px solid #e2e5ea",
    borderRadius: 12,
    padding: 22,
    maxWidth: 520,
    textAlign: "left" as const,
    boxShadow: "0 1px 4px rgba(16, 24, 40, 0.06)",
  },
  installTitle: { margin: "0 0 10px", fontSize: 16, fontWeight: 600 },
  installText: { margin: "0 0 14px", fontSize: 13, lineHeight: 1.7, color: "#4b5563" },
  cmdBox: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "#f0f2f5",
    border: "1px solid #d8dce3",
    borderRadius: 8,
    padding: "8px 10px",
    marginBottom: 12,
  },
  cmd: {
    flex: 1,
    fontSize: 12.5,
    fontFamily: "ui-monospace, Consolas, monospace",
    color: "#1f2329",
    whiteSpace: "nowrap" as const,
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  copyBtn: {
    padding: "5px 12px",
    borderRadius: 6,
    border: "1px solid #c9d0da",
    background: "transparent",
    color: "var(--fg)",
    cursor: "pointer",
    fontSize: 12,
  },
  retryBtn: {
    padding: "8px 20px",
    borderRadius: 8,
    border: "none",
    background: "var(--accent)",
    color: "#fff",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
  },
  mono: {
    fontFamily: "ui-monospace, Consolas, monospace",
    fontSize: 12,
    color: "#6b7280",
  },
};

const INSTALL_CMD = "npm install -g @deepseek-ai/dsh";

export default function App() {
  const [state, setState] = useState<ConnState>({ phase: "checking" });
  const [copied, setCopied] = useState(false);

  const detect = async () => {
    setState({ phase: "checking" });
    try {
      const result = await invoke<DshDetect>("dsh_detect");
      if (result.available) {
        // CLI 可用 → 触发 Rust 侧连接（复用 3080 或自启 dsh web）
        try {
          await invoke("dsh_connect");
          setState({ phase: "starting" });
        } catch (e) {
          setState({ phase: "error", message: localizeError(String(e)) });
        }
      } else {
        setState({ phase: "missing", detect: result });
      }
    } catch (e) {
      setState({ phase: "error", message: localizeError(String(e)) });
    }
  };

  useEffect(() => {
    detect();
    const unlistens: Array<() => void> = [];
    const p1 = listen<string>("dsh://phase", (e) => {
      const p = e.payload;
      if (p.startsWith("starting:")) setState({ phase: "starting" });
      else if (p.startsWith("ready:")) setState({ phase: "ready", url: p.slice(6) });
      else if (p.startsWith("error:")) setState({ phase: "error", message: localizeError(p.slice(6)) });
    });
    p1.then((fn) => unlistens.push(fn));
    return () => unlistens.forEach((fn) => fn());
  }, []);

  const copyCmd = async () => {
    try {
      await navigator.clipboard.writeText(INSTALL_CMD);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", width: "100vw", overflow: "hidden" }}>
      <TitleBar />
      <div style={styles.wrap}>
      <div style={styles.logo}>
        <img src="/favicon.svg" alt="DeepSeek Harness" style={styles.logoImg} />
      </div>

      {state.phase === "checking" && (
        <>
          <p style={styles.title}>{t("正在检测 dsh CLI…", "Checking for dsh CLI…")}</p>
          <div style={styles.bar}>
            <div style={styles.barFill} />
          </div>
        </>
      )}

      {state.phase === "missing" && (
        <>
          <p style={styles.title}>{t("需要安装 dsh CLI", "dsh CLI required")}</p>
          <div style={styles.installCard}>
            <p style={styles.installText}>
              {t(
                "未检测到 dsh CLI。安装后 dsh-app 会自动拉起本地 dsh web 并连接。",
                "The dsh CLI was not found. Once installed, dsh-app will start a local dsh web and connect automatically.",
              )}
              <br />
              <span style={{ color: "#6b7280" }}>
                {t("安装命令", "Install with")}: <code>{INSTALL_CMD}</code>
              </span>
            </p>
            <div style={styles.cmdBox}>
              <code style={styles.cmd}>{INSTALL_CMD}</code>
              <button style={styles.copyBtn} onClick={copyCmd}>
                {copied ? t("已复制", "Copied") : t("复制", "Copy")}
              </button>
            </div>
            <p style={styles.mono}>
              {state.detect.entry
                ? t("检测到入口：", "Entry found: ") + state.detect.entry + t("（但不可执行）", " (but not executable)")
                : t("未检测到任何 dsh 安装", "No dsh installation detected")}
            </p>
            <button style={{ ...styles.retryBtn, marginTop: 12 }} onClick={detect}>
              {t("我已安装，重新检测", "I've installed it — re-check")}
            </button>
          </div>
        </>
      )}

      {state.phase === "starting" && (
        <>
          <p style={styles.title}>{t("正在连接 DeepSeek Harness…", "Connecting to DeepSeek Harness…")}</p>
          <div style={styles.bar}>
            <div style={styles.barFill} />
          </div>
          <p style={styles.sub}>
            {t("优先复用本机已有实例，否则自动拉起 dsh web。", "Reusing a running instance when available, otherwise starting dsh web.")}
          </p>
        </>
      )}

      {state.phase === "ready" && (
        <>
          <p style={styles.title}>{t("已就绪", "Ready")}</p>
          <p style={styles.url}>{state.url}</p>
        </>
      )}

      {state.phase === "error" && (
        <>
          <p style={styles.title}>{t("连接失败", "Connection failed")}</p>
          <p style={styles.err}>{state.message}</p>
          <button style={styles.retryBtn} onClick={detect}>
            {t("重试", "Retry")}
          </button>
        </>
      )}
      </div>
    </div>
  );
}
