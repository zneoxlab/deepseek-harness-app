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

type ToolStatus = {
  present: boolean;
  version: string | null;
  path: string | null;
};

type EnvStatus = {
  node: ToolStatus;
  npm: ToolStatus;
  dsh: ToolStatus;
  useMirror: boolean;
  managedNode: string | null;
  managedGlobal: string | null;
};

type InstallEvent = {
  stage: string;
  message: string;
  ok?: boolean;
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
    maxWidth: 560,
    textAlign: "left" as const,
    boxShadow: "0 1px 4px rgba(16, 24, 40, 0.06)",
  },
  step: {
    border: "1px solid #e2e5ea",
    borderRadius: 10,
    padding: "12px 14px",
    marginBottom: 10,
    display: "flex" as const,
    alignItems: "center" as const,
    gap: 12,
  },
  stepIndex: {
    width: 26,
    height: 26,
    borderRadius: "50%",
    background: "#f0f2f5",
    color: "#4b5563",
    display: "flex" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    fontSize: 13,
    fontWeight: 600,
    flexShrink: 0,
  },
  stepBody: { flex: 1, minWidth: 0 },
  stepTitle: { fontSize: 14, fontWeight: 600, margin: "0 0 2px" },
  stepMeta: { fontSize: 12, color: "#6b7280", margin: 0, wordBreak: "break-all" as const },
  chipOk: {
    fontSize: 12,
    color: "#15803d",
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: 999,
    padding: "3px 10px",
    whiteSpace: "nowrap" as const,
  },
  chipMissing: {
    fontSize: 12,
    color: "#b45309",
    background: "#fffbeb",
    border: "1px solid #fde68a",
    borderRadius: 999,
    padding: "3px 10px",
    whiteSpace: "nowrap" as const,
  },
  installBtn: {
    padding: "7px 16px",
    borderRadius: 8,
    border: "none",
    background: "var(--accent)",
    color: "#fff",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
    whiteSpace: "nowrap" as const,
  },
  installBtnDisabled: {
    padding: "7px 16px",
    borderRadius: 8,
    border: "1px solid #d8dce3",
    background: "#f0f2f5",
    color: "#9ca3af",
    fontSize: 13,
    whiteSpace: "nowrap" as const,
    cursor: "not-allowed" as const,
  },
  mirrorHint: {
    fontSize: 12,
    color: "#1d4ed8",
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    borderRadius: 8,
    padding: "8px 10px",
    marginBottom: 10,
    lineHeight: 1.6,
  },
  logBox: {
    background: "#0f172a",
    borderRadius: 8,
    padding: "10px 12px",
    maxHeight: 140,
    overflowY: "auto" as const,
    fontFamily: "ui-monospace, Consolas, monospace",
    fontSize: 11.5,
    lineHeight: 1.7,
    marginTop: 4,
  },
  logLine: { color: "#cbd5e1", wordBreak: "break-all" as const },
  logErr: { color: "#f87171", wordBreak: "break-all" as const },
  advanced: {
    marginTop: 12,
    fontSize: 12,
    color: "#6b7280",
    display: "flex" as const,
    gap: 14,
    alignItems: "center" as const,
    flexWrap: "wrap" as const,
  },
  linkBtn: {
    background: "none",
    border: "none",
    color: "var(--accent)",
    cursor: "pointer",
    fontSize: 12,
    padding: 0,
    textDecoration: "underline",
  },
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
  const [env, setEnv] = useState<EnvStatus | null>(null);
  const [installLog, setInstallLog] = useState<InstallEvent[]>([]);
  const [installing, setInstalling] = useState<"node" | "dsh" | null>(null);
  const [addToPath, setAddToPath] = useState(true);

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

  const refreshEnv = async () => {
    try {
      setEnv(await invoke<EnvStatus>("env_detect", { lang: navigator.language }));
    } catch {
      /* ignore */
    }
  };

  const startInstall = async (what: "node" | "dsh") => {
    setInstalling(what);
    setInstallLog((log) => [
      ...log,
      {
        stage: "starting",
        message: what === "node" ? t("开始安装 Node…", "Installing Node…") : t("开始安装 dsh CLI…", "Installing dsh CLI…"),
      },
    ]);
    try {
      await invoke(what === "node" ? "install_node" : "install_dsh", { lang: navigator.language });
    } catch (e) {
      setInstalling(null);
      setInstallLog((log) => [...log, { stage: "error", message: String(e) }]);
    }
  };

  // 安装事件 → 日志; done/error → 刷新状态并按需链式安装 / 自动连接
  const onInstallEvent = async (ev: InstallEvent) => {
    setInstallLog((log) => [...log.slice(-60), ev]);
    if (ev.stage === "error") {
      setInstalling(null);
      return;
    }
    if (ev.stage !== "done") return;
    try {
      const e = await invoke<EnvStatus>("env_detect", { lang: navigator.language });
      setEnv(e);
      if (e.dsh.present) {
        // dsh 就绪 → 可选注册用户 PATH（终端可用）→ 自动连接
        setInstalling(null);
        if (addToPath) {
          try {
            await invoke("register_managed_path");
            setInstallLog((log) => [
              ...log,
              {
                stage: "done",
                message: t(
                  "已加入用户 PATH（新开终端即可用 node/npm/dsh）",
                  "Added to user PATH (node/npm/dsh available in new terminals)",
                ),
              },
            ]);
          } catch (err) {
            setInstallLog((log) => [
              ...log,
              { stage: "error", message: t("PATH 注册失败：", "PATH registration failed: ") + String(err) },
            ]);
          }
        }
        detect();
      } else if (!e.dsh.present) {
        // node 就绪但 dsh 未装 → 自动链式安装 dsh
        setInstalling("dsh");
        await invoke("install_dsh", { lang: navigator.language }).catch(() => setInstalling(null));
      } else {
        setInstalling(null);
      }
    } catch {
      setInstalling(null);
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
    const p2 = listen<InstallEvent>("dsh://install", (e) => {
      onInstallEvent(e.payload);
    });
    p2.then((fn) => unlistens.push(fn));
    return () => unlistens.forEach((fn) => fn());
  }, []);

  // 进入引导页时刷新环境检测
  useEffect(() => {
    if (state.phase === "missing") refreshEnv();
  }, [state.phase]);

  const copyCmd = async () => {
    try {
      await navigator.clipboard.writeText(INSTALL_CMD);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  const stepStatus = (tool: ToolStatus | undefined, label: string) => {
    if (!tool) return <span style={styles.chipMissing}>{t("检测中…", "Checking…")}</span>;
    if (tool.present) {
      return (
        <span style={styles.chipOk}>
          ✓ {label}
          {tool.version ? ` ${tool.version}` : ""}
        </span>
      );
    }
    return <span style={styles.chipMissing}>{t("未安装", "Not installed")}</span>;
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
          <p style={styles.title}>{t("正在检测运行环境…", "Checking runtime environment…")}</p>
          <div style={styles.bar}>
            <div style={styles.barFill} />
          </div>
        </>
      )}

      {state.phase === "missing" && (
        <>
          <p style={styles.title}>{t("配置运行环境", "Set up your environment")}</p>
          <div style={styles.installCard}>
            <p style={styles.installText}>
              {t(
                "检测到缺少运行环境。按步骤一键安装即可，完成后会自动连接。",
                "Some required components are missing. Install them with one click — we'll connect automatically when done.",
              )}
            </p>

            {env?.useMirror && (
              <div style={styles.mirrorHint}>
                {t(
                  "已检测到中文环境与中国时区，将优先使用国内镜像下载；镜像不可用时自动切换到官方源。",
                  "Chinese locale and China timezone detected — downloads will prefer the domestic mirror and fall back to the official source automatically.",
                )}
              </div>
            )}

            {/* 步骤 1: Node */}
            <div style={styles.step}>
              <div style={styles.stepIndex}>1</div>
              <div style={styles.stepBody}>
                <p style={styles.stepTitle}>{t("Node.js 运行环境", "Node.js runtime")}</p>
                <p style={styles.stepMeta}>
                  {env?.npm.present
                    ? t("npm", "npm") + ` ${env.npm.version}`
                    : env?.node.present
                      ? t("npm 未检测到", "npm not detected")
                      : t("未检测到 node 与 npm", "Neither node nor npm detected")}
                  {env?.managedNode ? ` · ${env.managedNode}` : ""}
                </p>
              </div>
              {env?.node.present ? (
                stepStatus(env.node, t("Node", "Node"))
              ) : installing === "node" ? (
                <span style={styles.chipMissing}>{t("安装中…", "Installing…")}</span>
              ) : (
                <button style={styles.installBtn} onClick={() => startInstall("node")}>
                  {t("一键安装", "Install")}
                </button>
              )}
            </div>

            {/* 步骤 2: dsh CLI */}
            <div style={styles.step}>
              <div style={styles.stepIndex}>2</div>
              <div style={styles.stepBody}>
                <p style={styles.stepTitle}>{t("dsh CLI", "dsh CLI")}</p>
                <p style={styles.stepMeta}>
                  {env?.dsh.path ??
                    t("安装后自动拉起本地 dsh web 并连接", "Starts a local dsh web and connects once installed")}
                </p>
              </div>
              {env?.dsh.present ? (
                stepStatus(env.dsh, t("dsh", "dsh"))
              ) : installing === "dsh" ? (
                <span style={styles.chipMissing}>{t("安装中…", "Installing…")}</span>
              ) : env && !env.node.present ? (
                <span style={styles.chipMissing}>{t("需先安装 Node", "Install Node first")}</span>
              ) : (
                <button style={styles.installBtn} onClick={() => startInstall("dsh")}>
                  {t("一键安装", "Install")}
                </button>
              )}
            </div>

            {/* 安装日志 */}
            {installLog.length > 0 && (
              <div style={styles.logBox}>
                {installLog.slice(-10).map((l, i) => (
                  <div key={i} style={l.stage === "error" ? styles.logErr : styles.logLine}>
                    {l.stage === "error" ? "✗ " : l.stage === "done" ? "✓ " : ""}
                    {l.message}
                  </div>
                ))}
              </div>
            )}

            {/* PATH 选项 */}
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, fontSize: 12.5, color: "#374151", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={addToPath}
                onChange={(e) => setAddToPath(e.target.checked)}
                style={{ cursor: "pointer" }}
              />
              {t(
                "装完后加入用户 PATH，让终端（PowerShell 等）也能直接用 node / npm / dsh",
                "Also add node / npm / dsh to the user PATH so terminals can use them",
              )}
            </label>

            {/* 高级选项 */}
            <div style={styles.advanced}>
              <button style={styles.linkBtn} onClick={detect}>
                {t("重新检测", "Re-check")}
              </button>
              <button style={styles.linkBtn} onClick={copyCmd}>
                {copied ? t("已复制", "Copied") : t("复制安装命令", "Copy install command")}
              </button>
              <code style={styles.mono}>{INSTALL_CMD}</code>
            </div>
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
          <p style={styles.err}>{localizeError(state.message)}</p>
          <div style={{ ...styles.logBox, maxWidth: 560, marginTop: 0 }}>
            <div style={styles.logErr}>{state.message}</div>
          </div>
          <button style={styles.retryBtn} onClick={detect}>
            {t("重试", "Retry")}
          </button>
        </>
      )}
      </div>
    </div>
  );
}
