window.__ModuleLoader__.load({
	id: "dsh-app-bridge",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.tsx
var index_exports = {};
__export(index_exports, {
  GITHUB_REPO: () => GITHUB_REPO,
  apply: () => apply,
  inject: () => inject,
  name: () => name
});
module.exports = __toCommonJS(index_exports);
var import_client = require("@deepseek-ai/dsh-client-runtime/client");
var React = __toESM(require("react"), 1);
var import_react_dom = require("react-dom");
var import_jsx_runtime = require("react/jsx-runtime");
var name = "dsh-app-bridge";
var inject = ["connection", "remote", "settingsScope", "locale", "slots"];
function tauriInvoke(cmd, args) {
  const internals = window.__TAURI_INTERNALS__;
  if (!internals) return Promise.reject(new Error("not inside the Tauri shell"));
  return internals.invoke(cmd, args ?? {});
}
function detectPlatform() {
  const ua = navigator.userAgent;
  const plat = navigator.platform || "";
  if (/mac/i.test(plat) || /Macintosh/.test(ua)) return "macos";
  if (/win/i.test(plat) || /Windows NT/.test(ua)) return "windows";
  if (/linux/i.test(plat) || /Linux/.test(ua)) return "linux";
  return "other";
}
var isZh = () => (navigator.language || "").toLowerCase().startsWith("zh");
var GLYPH_CLOSE = '<svg width="8" height="8" viewBox="0 0 8 8"><path d="M1.5 1.5 L6.5 6.5 M6.5 1.5 L1.5 6.5" stroke="rgba(0,0,0,0.55)" stroke-width="1.1" stroke-linecap="round"/></svg>';
var GLYPH_MIN = '<svg width="8" height="8" viewBox="0 0 8 8"><path d="M1.5 4 H6.5" stroke="rgba(0,0,0,0.55)" stroke-width="1.1" stroke-linecap="round"/></svg>';
var GLYPH_MAX = '<svg width="9" height="9" viewBox="0 0 9 9"><path d="M2.4 3.1 L3.1 2.4 L2.4 2.4 Z" fill="rgba(0,0,0,0.5)"/><path d="M5.9 6.6 L6.6 5.9 L6.6 6.6 Z" fill="rgba(0,0,0,0.5)"/></svg>';
var GLYPH_MIN_WIN = '<svg width="10" height="10" viewBox="0 0 10 10"><line x1="0" y1="5" x2="10" y2="5" stroke="currentColor" stroke-width="1"/></svg>';
var GLYPH_MAX_WIN = '<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><rect x="0.5" y="0.5" width="9" height="9" stroke="currentColor" stroke-width="1"/></svg>';
var GLYPH_CLOSE_WIN = '<svg width="10" height="10" viewBox="0 0 10 10"><line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" stroke-width="1"/><line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" stroke-width="1"/></svg>';
var TITLEBAR_CSS = `
#dsh-app-titlebar {
  position: relative;
  z-index: 2147483000;
  box-sizing: border-box;
  width: 100%;
  display: flex;
  align-items: center;
  flex: none;
  background: var(--dsw-alias-bg-base);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  user-select: none;
  -webkit-user-select: none;
  font-family: -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif;
}
body[data-ds-dark-theme] #dsh-app-titlebar {
  border-bottom-color: rgba(255, 255, 255, 0.07);
}
body[data-dsh-platform='linux'] #dsh-app-titlebar,
body[data-dsh-platform='other'] #dsh-app-titlebar {
  height: 38px;
  padding-left: 12px;
}
body[data-dsh-platform='windows'] #dsh-app-titlebar { height: 32px; }
.dsh-tb-title {
  flex: 1;
  min-width: 0;
  font-size: 12.5px;
  font-weight: 500;
  letter-spacing: 0.2px;
  color: #5f6673;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
body[data-ds-dark-theme] .dsh-tb-title { color: #8b93a7; }
body[data-dsh-platform='linux'] .dsh-tb-title,
body[data-dsh-platform='other'] .dsh-tb-title { margin-left: 10px; }
body[data-dsh-platform='windows'] .dsh-tb-title { margin-left: 12px; }
/* Linux \u5DE6\u4E0A\u89D2\u5706\u5F62\u6309\u94AE\uFF08GNOME \u98CE\u683C, \u56FE\u5F62\u5E38\u663E\uFF09 */
.dsh-tb-circle {
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
.dsh-tb-circle svg { opacity: 1; }
.dsh-tb-circle:hover { filter: brightness(1.15); }
body[data-ds-dark-theme] .dsh-tb-circle { background: #5a6070; }
.dsh-tb-status {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  line-height: 1;
  color: #6b7280;
  white-space: nowrap;
  flex: none;
}
body[data-ds-dark-theme] .dsh-tb-status { color: #8b93a7; }
body[data-dsh-platform='windows'] .dsh-tb-status { margin-right: 8px; }
.dsh-tb-dot {
  width: 7px;
  height: 7px;
  flex: none;
  border-radius: 50%;
  background: #9ca3af;
  transition: background 0.2s;
}
/* Windows \u53F3\u4E0A\u89D2\u65B9\u5F62\u6309\u94AE\uFF08Win11 caption \u98CE\u683C\uFF09 */
.dsh-tb-btn {
  width: 46px;
  height: 32px;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  padding: 0;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
  transition: background 0.1s;
  outline: none;
}
.dsh-tb-btn:hover { background: rgba(0, 0, 0, 0.05); }
body[data-ds-dark-theme] .dsh-tb-btn:hover { background: rgba(255, 255, 255, 0.07); }
.dsh-tb-btn.dsh-tb-close:hover { background: #c42b1c; color: #fff; }
/* \u5B98\u65B9 UI \u7F29\u5230\u6807\u9898\u680F\u4E0B\u65B9\uFF08macOS \u7528\u539F\u751F\u6807\u9898\u680F, WebView \u89C6\u53E3\u672C\u8EAB\u4E0D\u542B\u6807\u9898\u680F,
   #root \u4FDD\u6301 100vh \u5373\u53EF\uFF09 */
body { overflow: hidden; }
#root {
  box-sizing: border-box;
  height: 100vh;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
}
body[data-dsh-platform='linux'] #root,
body[data-dsh-platform='other'] #root { height: calc(100vh - 38px); }
body[data-dsh-platform='windows'] #root { height: calc(100vh - 32px); }
`;
function injectTitleBarStyle() {
  if (document.getElementById("dsh-app-tb-style")) return;
  const style = document.createElement("style");
  style.id = "dsh-app-tb-style";
  style.textContent = TITLEBAR_CSS;
  document.head.appendChild(style);
}
function startStatusPoller(onUpdate) {
  const updateStatus = async () => {
    let connected = false;
    let text;
    try {
      const res = await fetch("/dsh-app/status", { cache: "no-store" });
      const data = res.ok ? await res.json().catch(() => null) : null;
      if (res.ok && data && data.ok === true) {
        connected = true;
        text = isZh() ? "\u5DF2\u8FDE\u63A5" : "Connected";
      } else {
        throw new Error("bridge not ok");
      }
    } catch {
      connected = false;
      text = isZh() ? "\u672A\u8FDE\u63A5" : "Disconnected";
    }
    onUpdate(connected, text);
  };
  void updateStatus();
  setInterval(() => void updateStatus(), 5e3);
}
function syncWindowTheme() {
  const apply2 = () => {
    const dark = document.body.hasAttribute("data-ds-dark-theme");
    void tauriInvoke("window_set_theme", { theme: dark ? "dark" : "light" }).catch(() => {
    });
  };
  apply2();
  if (typeof MutationObserver !== "undefined") {
    new MutationObserver(apply2).observe(document.body, {
      attributes: true,
      attributeFilter: ["data-ds-dark-theme"]
    });
  }
}
function mountTitleBar() {
  if (document.getElementById("dsh-app-titlebar")) return;
  if (!window.__TAURI_INTERNALS__) return;
  const platform = detectPlatform();
  document.body.setAttribute("data-dsh-platform", platform);
  syncWindowTheme();
  if (platform === "macos") return;
  injectTitleBarStyle();
  const bar = document.createElement("div");
  bar.id = "dsh-app-titlebar";
  const makeBtn = (titleAttr, svg, cls) => {
    const btn = document.createElement("button");
    btn.title = titleAttr;
    btn.className = cls;
    btn.innerHTML = svg;
    return btn;
  };
  const makeTitle = () => {
    const title = document.createElement("span");
    title.textContent = "DeepSeek Harness";
    title.className = "dsh-tb-title";
    return title;
  };
  if (platform === "windows") {
    const minBtn = makeBtn("\u6700\u5C0F\u5316", GLYPH_MIN_WIN, "dsh-tb-btn");
    minBtn.addEventListener("click", () => void tauriInvoke("window_minimize").catch(() => {
    }));
    const maxBtn = makeBtn("\u6700\u5927\u5316 / \u8FD8\u539F", GLYPH_MAX_WIN, "dsh-tb-btn");
    maxBtn.addEventListener("click", () => void tauriInvoke("window_toggle_maximize").catch(() => {
    }));
    const closeBtn = makeBtn("\u5173\u95ED", GLYPH_CLOSE_WIN, "dsh-tb-btn dsh-tb-close");
    closeBtn.addEventListener("click", () => void tauriInvoke("window_close").catch(() => {
    }));
    bar.append(makeTitle(), minBtn, maxBtn, closeBtn);
  } else {
    const closeBtn = makeBtn("\u5173\u95ED", GLYPH_CLOSE, "dsh-tb-circle");
    closeBtn.addEventListener("click", () => void tauriInvoke("window_close").catch(() => {
    }));
    const minBtn = makeBtn("\u6700\u5C0F\u5316", GLYPH_MIN, "dsh-tb-circle");
    minBtn.addEventListener("click", () => void tauriInvoke("window_minimize").catch(() => {
    }));
    const maxBtn = makeBtn("\u6700\u5927\u5316 / \u8FD8\u539F", GLYPH_MAX, "dsh-tb-circle");
    maxBtn.addEventListener("click", () => void tauriInvoke("window_toggle_maximize").catch(() => {
    }));
    bar.append(closeBtn, minBtn, maxBtn, makeTitle());
  }
  bar.addEventListener("mousedown", (e) => {
    const target = e.target;
    if (target.closest("button")) return;
    if (e.button === 0) void tauriInvoke("window_start_dragging").catch(() => {
    });
  });
  bar.addEventListener("dblclick", (e) => {
    const target = e.target;
    if (target.closest("button")) return;
    void tauriInvoke("window_toggle_maximize").catch(() => {
    });
  });
  const root = document.getElementById("root");
  if (root) {
    document.body.insertBefore(bar, root);
  } else {
    document.body.prepend(bar);
  }
}
var STATUS_CSS = `
.dsh-status-row {
  box-sizing: border-box;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  /* \u4E0A\u4E0B\u5BF9\u79F0\u5185\u8FB9\u8DDD \u2192 \u5185\u5BB9\u5782\u76F4\u5C45\u4E2D; \u5DE6\u5706\u70B9\u4E0E\u8BBE\u7F6E\u6309\u94AE\u56FE\u6807\u5BF9\u9F50 */
  padding: 4px 10px 4px 6px;
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.1s;
  font-family: -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif;
}
.dsh-status-row:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dsh-status-left {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.dsh-status-dot {
  width: 8px;
  height: 8px;
  flex: none;
  border-radius: 50%;
  background: #9ca3af;
  transition: background 0.2s;
}
/* \u65AD\u8FDE\u65F6\u7EA2\u70B9\u547C\u5438\u95EA\u70C1 */
.dsh-status-dot[data-off] { animation: dsh-status-blink 1.4s ease-in-out infinite; }
@keyframes dsh-status-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
.dsh-status-text {
  font-size: 12px;
  line-height: 18px;
  color: var(--dsw-alias-label-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
/* \u53F3\u4FA7\u53EA\u653E\u77ED\u7248\u672C\u53F7\uFF08\u4E0D\u622A\u65AD\uFF09, \u5B8C\u6574\u4FE1\u606F\u60AC\u505C\u6D6E\u5C42\u663E\u793A */
.dsh-status-version {
  flex: none;
  font-family: ui-monospace, Consolas, monospace;
  font-size: 10.5px;
  line-height: 18px;
  color: var(--dsw-alias-label-tertiary);
  white-space: nowrap;
}
/* \u60AC\u505C\u5361\u7247: \u72B6\u6001\u884C\u4E0A\u65B9\u5F39\u51FA\u5361\u7247\uFF08\u65E0\u7BAD\u5934, \u7EAF\u5361\u7247\uFF09 */
.dsh-status-tip {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 0;
  right: 0;
  z-index: 300;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid var(--dsw-alias-border-l3);
  background: var(--dsw-specific-menu);
  box-shadow: var(--dsw-shadow-lv2);
  pointer-events: none;
  font-family: -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif;
  animation: dsh-status-tip-in 0.12s ease-out;
}
@keyframes dsh-status-tip-in {
  from { opacity: 0; transform: translateY(3px); }
  to { opacity: 1; transform: none; }
}
.dsh-status-tip .t-row {
  display: flex;
  align-items: baseline;
  gap: 10px;
}
.dsh-status-tip .t-k {
  flex: none;
  font-size: 11px;
  line-height: 18px;
  color: var(--dsw-alias-label-tertiary);
}
.dsh-status-tip .t-v {
  flex: 1;
  min-width: 0;
  text-align: right;
  font-family: ui-monospace, Consolas, monospace;
  font-size: 11px;
  line-height: 18px;
  color: var(--dsw-alias-label-secondary);
  word-break: break-all;
}
.dsh-status-tip .t-hint {
  margin-top: 4px;
  font-size: 10.5px;
  line-height: 16px;
  color: var(--dsw-alias-label-tertiary);
}
/* \u6298\u53E0\u4FA7\u680F: \u53EA\u7559\u4E00\u4E2A\u5F69\u8272\u5706\u70B9 */
.dsh-status-rail {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px 0;
}
.dsh-status-rail .dsh-status-dot { width: 9px; height: 9px; }

/* \u66F4\u65B0\u63D0\u793A\u5361\u7247: \u72B6\u6001\u884C\u4E0A\u65B9\u6D6E\u51FA\uFF08\u7EAF\u5361\u7247, \u65E0\u7BAD\u5934; \u68C0\u6D4B\u5230 App / CLI \u65B0\u7248\u672C\u65F6\u663E\u793A\uFF09 */
.dsh-status-update {
  position: absolute;
  bottom: calc(100% + 10px);
  left: 0;
  width: min(300px, 100%);
  z-index: 400;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid var(--dsw-alias-border-l3);
  background: var(--dsw-specific-menu);
  box-shadow: var(--dsw-shadow-lv2);
  font-family: -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif;
  animation: dsh-status-tip-in 0.15s ease-out;
}
/* \u6298\u53E0\u4FA7\u680F\uFF08rail\uFF09: \u5361\u7247\u8131\u79BB\u4FA7\u680F, \u56FA\u5B9A\u5728\u89C6\u53E3\u5DE6\u4E0B\u89D2 */
.dsh-status-update-rail {
  position: fixed;
  left: 12px;
  bottom: 12px;
  width: 320px;
  max-width: calc(100vw - 24px);
  z-index: 2147483000;
}
.dsh-status-update .u-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--dsw-alias-label-primary);
  white-space: nowrap;
}
.dsh-status-update .u-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.dsh-status-update .u-name {
  flex: none;
  width: 46px;
  font-size: 11px;
  color: var(--dsw-alias-label-tertiary);
  white-space: nowrap;
}
.dsh-status-update .u-vers {
  flex: 1;
  min-width: 0;
  font-family: ui-monospace, Consolas, monospace;
  font-size: 11px;
  line-height: 18px;
  color: var(--dsw-alias-label-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dsh-status-update .u-hint {
  flex: 1;
  min-width: 0;
  font-size: 11px;
  line-height: 16px;
  color: var(--dsw-alias-label-tertiary);
}
.dsh-status-update .u-hint.ok { color: #22c55e; }
.dsh-status-update .u-hint.warn { color: #f59e0b; }
.dsh-status-update .u-btn {
  flex: none;
  padding: 4px 12px;
  border-radius: 7px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: transparent;
  color: var(--dsw-alias-label-primary);
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  line-height: 18px;
  text-decoration: none;
  white-space: nowrap;
}
.dsh-status-update .u-btn:hover { background: rgba(255, 255, 255, 0.06); }
.dsh-status-update .u-btn:disabled { opacity: 0.55; cursor: not-allowed; }
body:not([data-ds-dark-theme]) .dsh-status-update .u-btn { border-color: rgba(0, 0, 0, 0.18); }
body:not([data-ds-dark-theme]) .dsh-status-update .u-btn:hover { background: rgba(0, 0, 0, 0.05); }
.dsh-status-update .u-btn.primary {
  background: #4d7cfe;
  border-color: #4d7cfe;
  color: #fff;
}
.dsh-status-update .u-btn.primary:hover { background: #3d6cf0; }
.dsh-status-update .u-foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 2px;
}
`;
function injectStatusStyle() {
  if (document.getElementById("dsh-app-status-style")) return;
  const style = document.createElement("style");
  style.id = "dsh-app-status-style";
  style.textContent = STATUS_CSS;
  document.head.appendChild(style);
}
function sinkStatusBelowSettings() {
  const status = document.querySelector("[data-dsh-app-status]");
  if (!status) return;
  let row = status.parentElement;
  while (row && !row.nextElementSibling) row = row.parentElement;
  const settingsArea = row?.nextElementSibling;
  if (settingsArea && settingsArea.style.order !== "-1") {
    settingsArea.style.order = "-1";
  }
}
function StatusFooterItem({
  wide,
  useStore,
  startupCheck,
  updateCli,
  dismissPrompt
}) {
  const [status, setStatus] = React.useState({
    connected: false,
    text: isZh() ? "\u68C0\u6D4B\u4E2D\u2026" : "Checking\u2026"
  });
  const [copied, setCopied] = React.useState(false);
  const [hovered, setHovered] = React.useState(false);
  const [cliFlash, setCliFlash] = React.useState(null);
  const info = useStore((s) => s.info);
  const updatePhase = useStore((s) => s.updatePhase);
  const latestVersion = useStore((s) => s.latestVersion);
  const latestUrl = useStore((s) => s.latestUrl);
  const cliPhase = useStore((s) => s.cliPhase);
  const cliLatest = useStore((s) => s.cliLatest);
  const promptDismissed = useStore((s) => s.promptDismissed);
  React.useEffect(() => {
    void startupCheck();
    startStatusPoller((connected, text) => setStatus({ connected, text }));
  }, []);
  React.useEffect(() => {
    sinkStatusBelowSettings();
  });
  React.useEffect(() => {
    if (cliPhase === "updated" || cliPhase === "failed") {
      setCliFlash(cliPhase === "updated" ? "ok" : "fail");
      const id = setTimeout(() => setCliFlash(null), 5e3);
      return () => clearTimeout(id);
    }
    setCliFlash(null);
  }, [cliPhase]);
  const zh2 = isZh();
  const appCurrent = extractVersion(info?.appVersion);
  const appHasNew = updatePhase === "done" && latestVersion !== null && appCurrent !== null && isNewer(latestVersion, appCurrent);
  const dshCurrent = extractVersion(info?.dshVersion);
  const cliHasNew = cliPhase === "done" && cliLatest !== null && dshCurrent !== null && isNewer(cliLatest, dshCurrent);
  const cliBusy = cliPhase === "updating";
  const updateVisible = !promptDismissed && (appHasNew || cliHasNew || cliBusy || cliFlash !== null);
  const copyInfo = async () => {
    const parts = [`DeepSeek Harness App v${info?.appVersion ?? "?"}`];
    if (info?.dshVersion) parts.push(`dsh CLI ${info.dshVersion}`);
    if (info?.serviceUrl) parts.push(info.serviceUrl);
    if (await copyText(parts.join(" \xB7 "))) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };
  const updateCard = (extraClass) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    "div",
    {
      className: "dsh-status-update" + (extraClass ? ` ${extraClass}` : ""),
      onClick: (e) => e.stopPropagation(),
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "u-title", children: zh2 ? "\u53D1\u73B0\u65B0\u7248\u672C" : "Updates available" }),
        appHasNew && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "u-row", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "u-name", children: "App" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "u-vers", children: [
            "v",
            appCurrent,
            " \u2192 v",
            latestVersion
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "a",
            {
              className: "u-btn primary",
              href: latestUrl ?? `${GITHUB_REPO}/releases/latest`,
              target: "_blank",
              rel: "noreferrer",
              children: zh2 ? "\u66F4\u65B0" : "Update"
            }
          )
        ] }),
        cliHasNew && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "u-row", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "u-name", children: "dsh CLI" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "u-vers", children: [
            dshCurrent,
            " \u2192 ",
            cliLatest
          ] }),
          info?.dshSource === "dsh_bin" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "u-hint", children: zh2 ? "\u7531 DSH_BIN \u6307\u5B9A\uFF0C\u8BF7\u5728\u7EC8\u7AEF\u624B\u52A8\u66F4\u65B0" : "Pinned by DSH_BIN \u2014 update manually" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "u-btn primary", disabled: cliBusy, onClick: () => void updateCli(), children: cliBusy ? zh2 ? "\u66F4\u65B0\u4E2D\u2026" : "Updating\u2026" : zh2 ? "\u66F4\u65B0" : "Update" })
        ] }),
        cliBusy && !cliHasNew && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "u-row", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "u-name", children: "dsh CLI" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "u-hint", children: zh2 ? "\u6B63\u5728\u66F4\u65B0\u2026" : "Updating\u2026" })
        ] }),
        cliFlash && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "u-row", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "u-name", children: "dsh CLI" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "u-hint " + (cliFlash === "ok" ? "ok" : "warn"), children: cliFlash === "ok" ? zh2 ? "\u66F4\u65B0\u5B8C\u6210\uFF0C\u91CD\u542F\u5E94\u7528\u540E\u751F\u6548" : "Updated \u2014 restart the app to take effect" : zh2 ? "\u66F4\u65B0\u672A\u5B8C\u6210\uFF0C\u8BF7\u5230\u300CApp \u8BBE\u7F6E\u300D\u590D\u5236\u547D\u4EE4\u624B\u52A8\u6267\u884C" : "Update failed \u2014 copy the command in App Settings" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "u-foot", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "u-btn", onClick: () => dismissPrompt(true), children: zh2 ? "\u6682\u4E0D\u66F4\u65B0" : "Not now" }) })
      ]
    }
  );
  if (!wide) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { "data-dsh-app-status": "1", className: "dsh-status-rail", title: status.text, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "span",
        {
          className: "dsh-status-dot",
          "data-off": status.connected ? void 0 : "1",
          style: { background: status.connected ? "#22c55e" : "#ef4444" }
        }
      ) }),
      updateVisible && (0, import_react_dom.createPortal)(updateCard("dsh-status-update-rail"), document.body)
    ] });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    "div",
    {
      "data-dsh-app-status": "1",
      className: "dsh-status-row",
      onMouseEnter: () => setHovered(true),
      onMouseLeave: () => setHovered(false),
      onClick: () => void copyInfo(),
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "dsh-status-left", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "span",
            {
              className: "dsh-status-dot",
              "data-off": status.connected ? void 0 : "1",
              style: { background: status.connected ? "#22c55e" : "#ef4444" }
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsh-status-text", children: status.text })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsh-status-version", children: copied ? zh2 ? "\u5DF2\u590D\u5236" : "Copied" : info?.appVersion ? `v${info.appVersion}` : "" }),
        hovered && !updateVisible && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh-status-tip", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "t-row", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "t-k", children: zh2 ? "\u72B6\u6001" : "Status" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "t-v", children: status.text })
          ] }),
          info?.appVersion !== void 0 && info?.appVersion !== null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "t-row", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "t-k", children: "App" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "t-v", children: [
              "v",
              info.appVersion
            ] })
          ] }),
          info?.dshVersion && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "t-row", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "t-k", children: "dsh CLI" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "t-v", children: info.dshVersion })
          ] }),
          info?.serviceUrl && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "t-row", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "t-k", children: zh2 ? "\u670D\u52A1" : "Service" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "t-v", children: info.serviceUrl })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "t-hint", children: zh2 ? "\u70B9\u51FB\u590D\u5236\u4EE5\u4E0A\u4FE1\u606F" : "Click to copy the info above" })
        ] }),
        updateVisible && updateCard("")
      ]
    }
  );
}
var GITHUB_REPO = "https://github.com/zneoxlab/deepseek-harness-app";
var GITHUB_LATEST_API = "https://api.github.com/repos/zneoxlab/deepseek-harness-app/releases/latest";
var NPM_CLI_UPDATE_CMD = "npm install -g @deepseek-ai/dsh@latest";
var NPM_LATEST_URLS = [
  "https://registry.npmjs.org/@deepseek-ai/dsh/latest",
  "https://registry.npmmirror.com/@deepseek-ai/dsh/latest"
];
var createAppSettingsStore = () => (0, import_client.defineStore)({
  init: () => ({
    info: null,
    updatePhase: "idle",
    latestVersion: null,
    latestUrl: null,
    cliPhase: "idle",
    cliLatest: null,
    promptDismissed: false,
    settings: null,
    loading: true,
    saving: false,
    saved: false,
    error: null
  }),
  actions: {
    adoptInfo(d, info) {
      d.info = info;
    },
    setUpdatePhase(d, phase) {
      d.updatePhase = phase;
    },
    setLatest(d, v, url) {
      d.latestVersion = v;
      d.latestUrl = url;
    },
    setCliPhase(d, phase) {
      d.cliPhase = phase;
    },
    setCliLatest(d, v) {
      d.cliLatest = v;
    },
    dismissPrompt(d, v) {
      d.promptDismissed = v;
    },
    adopt(d, settings) {
      d.settings = settings;
      d.loading = false;
    },
    setLoading(d, v) {
      d.loading = v;
    },
    setSaving(d, v) {
      d.saving = v;
    },
    setSaved(d, v) {
      d.saved = v;
    },
    setError(d, e) {
      d.error = e;
    }
  }
});
function extractVersion(text) {
  if (!text) return null;
  const m = /[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.]+)?/.exec(text);
  return m ? m[0] : text;
}
function isNewer(a, b) {
  const pa = a.replace(/^v/, "").split(".").map((x) => parseInt(x, 10) || 0);
  const pb = b.replace(/^v/, "").split(".").map((x) => parseInt(x, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x !== y) return x > y;
  }
  return false;
}
async function fetchNpmLatest() {
  let lastErr = new Error("npm registry unreachable");
  for (const url of NPM_LATEST_URLS) {
    try {
      const res = await fetch(url, { cache: "no-store", headers: { accept: "application/json" } });
      if (!res.ok) {
        lastErr = new Error(`npm registry ${res.status}`);
        continue;
      }
      const data = await res.json();
      const v = extractVersion(data.version);
      if (v) return v;
      lastErr = new Error("npm registry response has no version field");
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none;";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}
var ABOUT_CSS = `
.dsh-app-about { display: flex; flex-direction: column; gap: 14px; font-size: 13px; }
.dsh-app-about h3 { margin: 0; font-size: 14px; font-weight: 600; }
.dsh-app-about h3.sub { margin-top: 8px; }
.dsh-app-about .rows { display: flex; flex-direction: column; border-radius: 10px; overflow: hidden; border: 1px solid rgba(255,255,255,0.08); }
body:not([data-ds-dark-theme]) .dsh-app-about .rows { border-color: rgba(0,0,0,0.08); }
.dsh-app-about .row { display: flex; align-items: baseline; gap: 10px; padding: 8px 12px; }
.dsh-app-about .row:nth-child(odd) { background: rgba(255,255,255,0.03); }
body:not([data-ds-dark-theme]) .dsh-app-about .row:nth-child(odd) { background: rgba(0,0,0,0.02); }
.dsh-app-about .row .k { flex: none; width: 110px; color: #8b93a7; font-size: 12px; }
body:not([data-ds-dark-theme]) .dsh-app-about .row .k { color: #6b7280; }
.dsh-app-about .row .v { flex: 1; font-family: ui-monospace, Consolas, monospace; font-size: 12px; word-break: break-all; }
.dsh-app-about .update { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.dsh-app-about .update button {
  padding: 6px 14px; border-radius: 7px; border: 1px solid rgba(255,255,255,0.15);
  background: transparent; color: inherit; cursor: pointer; font-size: 12.5px;
}
.dsh-app-about .update button:hover { background: rgba(255,255,255,0.06); }
.dsh-app-about .update button:disabled { opacity: 0.55; cursor: not-allowed; }
body:not([data-ds-dark-theme]) .dsh-app-about .update button { border-color: rgba(0,0,0,0.18); }
body:not([data-ds-dark-theme]) .dsh-app-about .update button:hover { background: rgba(0,0,0,0.05); }
.dsh-app-about .update .hint { font-size: 12px; color: #8b93a7; }
body:not([data-ds-dark-theme]) .dsh-app-about .update .hint { color: #6b7280; }
.dsh-app-about .update .hint.new { color: #f59e0b; }
.dsh-app-about .dsh-app-link { color: #4d7cfe; text-decoration: none; font-size: 12px; }
.dsh-app-about .dsh-app-link:hover { text-decoration: underline; }
.dsh-app-about .update button.dsh-app-link-btn { border: none; padding: 6px 2px; background: none; color: #4d7cfe; }
.dsh-app-about .update button.dsh-app-link-btn:hover { background: none; text-decoration: underline; }
`;
function injectAboutStyle() {
  if (document.getElementById("dsh-app-about-style")) return;
  const style = document.createElement("style");
  style.id = "dsh-app-about-style";
  style.textContent = ABOUT_CSS;
  document.head.appendChild(style);
}
function AboutSection({ useStore, t, checkUpdate, checkCliUpdate, updateCli }) {
  const [copied, setCopied] = React.useState(false);
  const info = useStore((s) => s.info);
  const phase = useStore((s) => s.updatePhase);
  const latest = useStore((s) => s.latestVersion);
  const latestUrl = useStore((s) => s.latestUrl);
  const cliPhase = useStore((s) => s.cliPhase);
  const cliLatest = useStore((s) => s.cliLatest);
  const appCurrent = extractVersion(info?.appVersion);
  const hasNew = latest !== null && appCurrent !== null && isNewer(latest, appCurrent);
  const upToDate = latest !== null && appCurrent !== null && !isNewer(latest, appCurrent);
  const dshCurrent = extractVersion(info?.dshVersion);
  const cliHasNew = cliPhase === "done" && cliLatest !== null && dshCurrent !== null && isNewer(cliLatest, dshCurrent);
  const cliUpToDate = cliPhase === "done" && cliLatest !== null && dshCurrent !== null && !isNewer(cliLatest, dshCurrent);
  const copyCmd = async () => {
    if (await copyText(NPM_CLI_UPDATE_CMD)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh-app-about", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: t("dshApp.about.title") }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "rows", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "k", children: t("dshApp.about.appVersion") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "v", children: [
          "v",
          info?.appVersion ?? t("dshApp.about.notAvailable")
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "k", children: t("dshApp.about.repo") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "v", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", { href: GITHUB_REPO, target: "_blank", rel: "noreferrer", className: "dsh-app-link", children: GITHUB_REPO }) })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "update", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", onClick: () => void checkUpdate(), disabled: phase === "checking", children: phase === "checking" ? t("dshApp.update.checking") : t("dshApp.update.check") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "hint" + (hasNew ? " new" : ""), children: phase === "done" && hasNew ? `${t("dshApp.update.new")}: v${latest}` : phase === "done" && upToDate ? t("dshApp.update.latest") : phase === "none" ? t("dshApp.update.none") : phase === "error" ? t("dshApp.update.error") : "" }),
      phase === "done" && hasNew && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", { href: latestUrl ?? GITHUB_REPO + "/releases/latest", target: "_blank", rel: "noreferrer", className: "dsh-app-link", children: t("dshApp.update.download") })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { className: "sub", children: t("dshApp.cli.title") }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "rows", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "k", children: t("dshApp.cli.version") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "v", children: dshCurrent ?? t("dshApp.about.notAvailable") })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "k", children: t("dshApp.cli.source") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "v", children: info?.dshSource ?? t("dshApp.about.notAvailable") })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "k", children: t("dshApp.cli.serviceUrl") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "v", children: info?.serviceUrl ?? t("dshApp.about.notAvailable") })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "update", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          type: "button",
          onClick: () => void checkCliUpdate(),
          disabled: cliPhase === "checking" || cliPhase === "updating",
          children: cliPhase === "checking" ? t("dshApp.cli.checking") : t("dshApp.cli.check")
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "hint" + (cliHasNew ? " new" : ""), children: cliPhase === "done" && cliHasNew ? `${t("dshApp.cli.new")}: v${cliLatest}` : cliPhase === "done" && cliUpToDate ? t("dshApp.cli.latest") : cliPhase === "updating" ? t("dshApp.cli.updating") : cliPhase === "updated" ? t("dshApp.cli.updated") : cliPhase === "failed" ? t("dshApp.cli.failed") : cliPhase === "error" ? t("dshApp.cli.error") : "" }),
      cliHasNew && info?.dshSource !== "dsh_bin" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", onClick: () => void updateCli(), disabled: cliPhase === "updating", children: t("dshApp.cli.update") }),
      cliHasNew && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", onClick: () => void copyCmd(), className: "dsh-app-link-btn", children: copied ? t("dshApp.cli.copied") : t("dshApp.cli.copy") })
    ] }),
    cliHasNew && info?.dshSource === "dsh_bin" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "hint new", children: t("dshApp.cli.dshBinHint") })
  ] });
}
var DESKTOP_CSS = `
.dsh-app-desktop { display: flex; flex-direction: column; gap: 14px; font-size: 13px; }
.dsh-app-desktop h3 { margin: 0; font-size: 14px; font-weight: 600; }
.dsh-app-desktop .rows { display: flex; flex-direction: column; border-radius: 10px; overflow: hidden; border: 1px solid rgba(255,255,255,0.08); }
body:not([data-ds-dark-theme]) .dsh-app-desktop .rows { border-color: rgba(0,0,0,0.08); }
.dsh-app-desktop .row { display: flex; align-items: center; gap: 10px; padding: 8px 12px; }
.dsh-app-desktop .row:nth-child(odd) { background: rgba(255,255,255,0.03); }
body:not([data-ds-dark-theme]) .dsh-app-desktop .row:nth-child(odd) { background: rgba(0,0,0,0.02); }
.dsh-app-desktop .row.col { align-items: flex-start; flex-direction: column; gap: 6px; }
.dsh-app-desktop .row .k { flex: none; width: 110px; color: #8b93a7; font-size: 12px; }
body:not([data-ds-dark-theme]) .dsh-app-desktop .row .k { color: #6b7280; }
.dsh-app-desktop .row .v { flex: 1; min-width: 0; }
.dsh-app-desktop .sub { display: flex; flex-direction: column; gap: 6px; padding-left: 14px; }
.dsh-app-desktop .sub .opt:has(input:disabled) { opacity: 0.55; }
.dsh-app-desktop .dsh-app-test-btn {
  padding: 4px 12px; border-radius: 7px; border: 1px solid rgba(255,255,255,0.15);
  background: transparent; color: inherit; cursor: pointer; font-size: 12px;
}
.dsh-app-desktop .dsh-app-test-btn:hover { background: rgba(255,255,255,0.06); }
.dsh-app-desktop .dsh-app-test-btn:disabled { opacity: 0.55; cursor: not-allowed; }
.dsh-app-desktop .test-err { color: #ef4444; }
body:not([data-ds-dark-theme]) .dsh-app-desktop .dsh-app-test-btn { border-color: rgba(0,0,0,0.18); }
body:not([data-ds-dark-theme]) .dsh-app-desktop .dsh-app-test-btn:hover { background: rgba(0,0,0,0.05); }
.dsh-app-desktop .opt { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.dsh-app-desktop .opt input[type='radio'], .dsh-app-desktop .opt input[type='checkbox'] { cursor: pointer; }
.dsh-app-desktop .opt label { cursor: pointer; }
.dsh-app-desktop input[type='text'] {
  box-sizing: border-box; width: 100%; padding: 6px 10px; border-radius: 7px;
  border: 1px solid rgba(255,255,255,0.15); background: transparent; color: inherit;
  font-size: 12.5px; font-family: ui-monospace, Consolas, monospace;
}
.dsh-app-desktop input[type='text']:focus { outline: none; border-color: #4d7cfe; }
body:not([data-ds-dark-theme]) .dsh-app-desktop input[type='text'] { border-color: rgba(0,0,0,0.18); }
.dsh-app-desktop .hint { font-size: 12px; color: #8b93a7; line-height: 1.5; }
body:not([data-ds-dark-theme]) .dsh-app-desktop .hint { color: #6b7280; }
.dsh-app-desktop .hint.warn { color: #f59e0b; }
.dsh-app-desktop .save-row { display: flex; align-items: center; gap: 10px; }
.dsh-app-desktop .save-row button {
  padding: 6px 14px; border-radius: 7px; border: 1px solid rgba(255,255,255,0.15);
  background: transparent; color: inherit; cursor: pointer; font-size: 12.5px;
}
.dsh-app-desktop .save-row button:hover { background: rgba(255,255,255,0.06); }
.dsh-app-desktop .save-row button:disabled { opacity: 0.55; cursor: not-allowed; }
body:not([data-ds-dark-theme]) .dsh-app-desktop .save-row button { border-color: rgba(0,0,0,0.18); }
body:not([data-ds-dark-theme]) .dsh-app-desktop .save-row button:hover { background: rgba(0,0,0,0.05); }
.dsh-app-desktop .save-row .ok { color: #22c55e; font-size: 12px; }
.dsh-app-desktop .save-row .err { color: #ef4444; font-size: 12px; }
`;
function injectDesktopStyle() {
  if (document.getElementById("dsh-app-desktop-style")) return;
  const style = document.createElement("style");
  style.id = "dsh-app-desktop-style";
  style.textContent = DESKTOP_CSS;
  document.head.appendChild(style);
}
function DesktopSection({ useStore, t, load, save }) {
  const settings = useStore((s) => s.settings);
  const loading = useStore((s) => s.loading);
  const saving = useStore((s) => s.saving);
  const saved = useStore((s) => s.saved);
  const error = useStore((s) => s.error);
  React.useEffect(() => {
    void load();
  }, []);
  const isExplicit = settings?.connect.kind === "explicit";
  const [urlDraft, setUrlDraft] = React.useState(isExplicit && settings?.connect.kind === "explicit" ? settings.connect.url : "");
  const [shortcutDraft, setShortcutDraft] = React.useState(settings?.shortcut ?? "CmdOrCtrl+Shift+Space");
  const [testSending, setTestSending] = React.useState(false);
  const [testError, setTestError] = React.useState(null);
  const sendTestNotification = async () => {
    setTestSending(true);
    setTestError(null);
    try {
      await tauriInvoke("desktop_notify", {
        kind: "test",
        title: isZh() ? "\u6D4B\u8BD5\u901A\u77E5" : "Test notification",
        body: isZh() ? "\u684C\u9762\u901A\u77E5\u5DE5\u4F5C\u6B63\u5E38\uFF01" : "Desktop notifications are working!",
        reply_id: null,
        session_id: null,
        question_id: null,
        choices: [],
        open_label: isZh() ? "\u6253\u5F00 DSH" : "Open DSH"
      });
    } catch (e) {
      setTestError(String(e));
    }
    setTimeout(() => setTestSending(false), 1500);
  };
  React.useEffect(() => {
    if (!settings) return;
    setUrlDraft(settings.connect.kind === "explicit" ? settings.connect.url : "");
    setShortcutDraft(settings.shortcut);
  }, [settings]);
  if (loading || !settings) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh-app-desktop", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: t("dshApp.desktop.title") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "hint", children: t("dshApp.desktop.loading") })
    ] });
  }
  const buildNext = () => ({
    connect: isExplicit ? { kind: "explicit", url: urlDraft.trim() } : { kind: "smart" },
    autostart: settings.autostart,
    notifications_enabled: settings.notifications_enabled,
    notify_only_unfocused: settings.notify_only_unfocused,
    notify_confirm: settings.notify_confirm,
    notify_turn_complete: settings.notify_turn_complete,
    notify_errors: settings.notify_errors,
    shortcut: shortcutDraft.trim() || "CmdOrCtrl+Shift+Space"
  });
  const patchAutostart = (autostart) => ({ ...settings, autostart });
  const patchNotifications = (notifications_enabled) => ({ ...settings, notifications_enabled });
  const patchOnlyUnfocused = (notify_only_unfocused) => ({ ...settings, notify_only_unfocused });
  const patchConfirm = (notify_confirm) => ({ ...settings, notify_confirm });
  const patchTurn = (notify_turn_complete) => ({ ...settings, notify_turn_complete });
  const patchErrors = (notify_errors) => ({ ...settings, notify_errors });
  const patchShortcut = (shortcut) => ({ ...settings, shortcut });
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh-app-desktop", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: t("dshApp.desktop.title") }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "rows", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "row col", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "k", children: t("dshApp.desktop.connect") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "opt", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "input",
            {
              id: "dsh-app-connect-smart",
              type: "radio",
              name: "dsh-app-connect",
              checked: !isExplicit,
              onChange: () => void save({ ...settings, connect: { kind: "smart" } })
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { htmlFor: "dsh-app-connect-smart", children: t("dshApp.desktop.smart") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "input",
            {
              id: "dsh-app-connect-explicit",
              type: "radio",
              name: "dsh-app-connect",
              checked: isExplicit,
              onChange: () => void save({ ...settings, connect: { kind: "explicit", url: urlDraft.trim() } })
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { htmlFor: "dsh-app-connect-explicit", children: t("dshApp.desktop.explicit") })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "hint" + (isExplicit ? " warn" : ""), children: isExplicit ? t("dshApp.desktop.remoteWarn") : t("dshApp.desktop.smartHint") }),
        isExplicit && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "input",
          {
            type: "text",
            value: urlDraft,
            placeholder: "http://192.168.1.10:3080",
            spellCheck: false,
            onChange: (e) => setUrlDraft(e.target.value),
            onBlur: () => void save({ ...settings, connect: { kind: "explicit", url: urlDraft.trim() } })
          }
        )
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "k", children: t("dshApp.desktop.autostart") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "opt", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "input",
            {
              id: "dsh-app-autostart",
              type: "checkbox",
              checked: settings.autostart,
              onChange: (e) => void save(patchAutostart(e.target.checked))
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { htmlFor: "dsh-app-autostart", children: t("dshApp.desktop.autostartHint") })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "row col", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "k", children: t("dshApp.desktop.notifications") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "opt", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "input",
            {
              id: "dsh-app-notify",
              type: "checkbox",
              checked: settings.notifications_enabled,
              onChange: (e) => void save(patchNotifications(e.target.checked))
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { htmlFor: "dsh-app-notify", children: t("dshApp.desktop.notificationsHint") })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "sub", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "opt", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "input",
              {
                id: "dsh-app-notify-unfocused",
                type: "checkbox",
                disabled: !settings.notifications_enabled,
                checked: settings.notify_only_unfocused,
                onChange: (e) => void save(patchOnlyUnfocused(e.target.checked))
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { htmlFor: "dsh-app-notify-unfocused", children: t("dshApp.desktop.notifyOnlyUnfocused") })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "opt", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "input",
              {
                id: "dsh-app-notify-confirm",
                type: "checkbox",
                disabled: !settings.notifications_enabled,
                checked: settings.notify_confirm,
                onChange: (e) => void save(patchConfirm(e.target.checked))
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { htmlFor: "dsh-app-notify-confirm", children: t("dshApp.desktop.notifyConfirm") }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "hint", children: t("dshApp.desktop.notifyConfirmHint") })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "opt", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "input",
              {
                id: "dsh-app-notify-turn",
                type: "checkbox",
                disabled: !settings.notifications_enabled,
                checked: settings.notify_turn_complete,
                onChange: (e) => void save(patchTurn(e.target.checked))
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { htmlFor: "dsh-app-notify-turn", children: t("dshApp.desktop.notifyTurn") }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "hint", children: t("dshApp.desktop.notifyTurnHint") })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "opt", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "input",
              {
                id: "dsh-app-notify-errors",
                type: "checkbox",
                disabled: !settings.notifications_enabled,
                checked: settings.notify_errors,
                onChange: (e) => void save(patchErrors(e.target.checked))
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { htmlFor: "dsh-app-notify-errors", children: t("dshApp.desktop.notifyErrors") }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "hint", children: t("dshApp.desktop.notifyErrorsHint") })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "opt", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "button",
              {
                type: "button",
                className: "dsh-app-test-btn",
                disabled: !settings.notifications_enabled || testSending,
                onClick: () => void sendTestNotification(),
                children: testSending ? t("dshApp.desktop.notifyTestSent") : t("dshApp.desktop.notifyTest")
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "hint", children: t("dshApp.desktop.notifyTestHint") })
          ] }),
          testError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "hint warn test-err", children: testError })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "row col", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "k", children: t("dshApp.desktop.shortcut") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "input",
          {
            type: "text",
            value: shortcutDraft,
            spellCheck: false,
            onChange: (e) => setShortcutDraft(e.target.value),
            onBlur: () => void save(patchShortcut(shortcutDraft.trim() || "CmdOrCtrl+Shift+Space"))
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "save-row", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", disabled: saving, onClick: () => void save(buildNext()), children: saving ? t("dshApp.desktop.saving") : t("dshApp.desktop.save") }),
      saved && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ok", children: t("dshApp.desktop.saved") }),
      error && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "err", children: [
        t("dshApp.desktop.error"),
        ": ",
        error
      ] })
    ] })
  ] });
}
var zh = {
  "dshApp.about.title": "\u5173\u4E8E DSH App",
  "dshApp.about.appVersion": "DSH App \u7248\u672C",
  "dshApp.about.repo": "\u5F00\u6E90\u5730\u5740",
  "dshApp.about.notAvailable": "\u672A\u68C0\u6D4B\u5230",
  "dshApp.update.check": "\u68C0\u67E5\u66F4\u65B0",
  "dshApp.update.checking": "\u6B63\u5728\u68C0\u67E5\u2026",
  "dshApp.update.latest": "\u5DF2\u662F\u6700\u65B0\u7248\u672C",
  "dshApp.update.new": "\u53D1\u73B0\u65B0\u7248\u672C",
  "dshApp.update.download": "\u524D\u5F80\u4E0B\u8F7D",
  "dshApp.update.none": "\u6682\u65E0\u5DF2\u53D1\u5E03\u7248\u672C",
  "dshApp.update.error": "\u68C0\u67E5\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u7F51\u7EDC\u540E\u91CD\u8BD5",
  "dshApp.cli.title": "dsh CLI",
  "dshApp.cli.version": "CLI \u7248\u672C",
  "dshApp.cli.source": "CLI \u6765\u6E90",
  "dshApp.cli.serviceUrl": "\u670D\u52A1\u5730\u5740",
  "dshApp.cli.check": "\u68C0\u67E5 CLI \u66F4\u65B0",
  "dshApp.cli.checking": "\u6B63\u5728\u68C0\u67E5\u2026",
  "dshApp.cli.latest": "CLI \u5DF2\u662F\u6700\u65B0",
  "dshApp.cli.new": "\u53D1\u73B0\u65B0\u7248\u672C",
  "dshApp.cli.update": "\u4E00\u952E\u66F4\u65B0",
  "dshApp.cli.updating": "\u6B63\u5728\u66F4\u65B0\u2026",
  "dshApp.cli.updated": "\u66F4\u65B0\u5B8C\u6210\uFF0C\u91CD\u542F\u5E94\u7528\u540E\u751F\u6548",
  "dshApp.cli.failed": "\u66F4\u65B0\u672A\u5B8C\u6210\uFF0C\u8BF7\u590D\u5236\u547D\u4EE4\u624B\u52A8\u6267\u884C",
  "dshApp.cli.copy": "\u590D\u5236\u66F4\u65B0\u547D\u4EE4",
  "dshApp.cli.copied": "\u5DF2\u590D\u5236",
  "dshApp.cli.dshBinHint": "CLI \u7531 DSH_BIN \u6307\u5B9A\uFF0C\u8BF7\u5728\u7EC8\u7AEF\u624B\u52A8\u66F4\u65B0",
  "dshApp.cli.error": "\u68C0\u67E5\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u7F51\u7EDC\u540E\u91CD\u8BD5",
  "dshApp.desktop.title": "\u684C\u9762\u8BBE\u7F6E",
  "dshApp.desktop.loading": "\u6B63\u5728\u8BFB\u53D6\u8BBE\u7F6E\u2026",
  "dshApp.desktop.connect": "\u8FDE\u63A5\u6A21\u5F0F",
  "dshApp.desktop.smart": "\u667A\u80FD\u6A21\u5F0F\uFF08\u81EA\u52A8\u63A2\u6D4B/\u81EA\u542F\uFF09",
  "dshApp.desktop.explicit": "\u663E\u5F0F\u8FDE\u63A5",
  "dshApp.desktop.smartHint": "\u4F18\u5148\u590D\u7528\u672C\u673A 3080 \u5E26\u684C\u9762\u6865\u7684\u5B9E\u4F8B\uFF0C\u5426\u5219\u81EA\u52A8\u62C9\u8D77 dsh web\u3002",
  "dshApp.desktop.remoteWarn": "\u8FDE\u63A5\u8FDC\u7A0B/\u5BB9\u5668\u5B9E\u4F8B\uFF1A\u4EC5\u9650\u53EF\u4FE1\u7F51\u7EDC\uFF0C\u5EFA\u8BAE\u4F7F\u7528 HTTPS\u3002",
  "dshApp.desktop.url": "\u670D\u52A1\u5730\u5740",
  "dshApp.desktop.autostart": "\u5F00\u673A\u81EA\u542F",
  "dshApp.desktop.autostartHint": "\u767B\u5F55\u540E\u9759\u9ED8\u542F\u52A8\uFF08\u9A7B\u7559\u6258\u76D8\uFF0C\u4E0D\u5F39\u7A97\uFF09",
  "dshApp.desktop.notifications": "\u684C\u9762\u901A\u77E5",
  "dshApp.desktop.notificationsHint": "\u56DE\u5408\u5B8C\u6210 / \u6743\u9650\u8BF7\u6C42 / \u670D\u52A1\u4E8B\u4EF6",
  "dshApp.desktop.notifyOnlyUnfocused": "\u4EC5\u7A97\u53E3\u672A\u805A\u7126\u65F6\u901A\u77E5",
  "dshApp.desktop.notifyConfirm": "\u9700\u8981\u786E\u8BA4",
  "dshApp.desktop.notifyConfirmHint": "\u7528\u6237\u95EE\u9898 / \u6743\u9650\u8BF7\u6C42\uFF08\u901A\u77E5\u5361\u7247\u5E26\u9009\u9879\u6309\u94AE\uFF09",
  "dshApp.desktop.notifyTurn": "\u4EFB\u52A1\u5B8C\u6210",
  "dshApp.desktop.notifyTurnHint": "Agent \u56DE\u5408\u7ED3\u675F",
  "dshApp.desktop.notifyErrors": "\u51FA\u9519\u62A5\u8B66",
  "dshApp.desktop.notifyErrorsHint": "\u8FD0\u884C\u9519\u8BEF / \u670D\u52A1\u9000\u51FA",
  "dshApp.desktop.notifyTest": "\u53D1\u9001\u6D4B\u8BD5\u901A\u77E5",
  "dshApp.desktop.notifyTestSent": "\u5DF2\u53D1\u9001",
  "dshApp.desktop.notifyTestHint": "\u7ACB\u5373\u5F39\u4E00\u6761\u6D4B\u8BD5\u901A\u77E5\uFF0C\u9A8C\u8BC1\u7CFB\u7EDF\u901A\u77E5\u94FE\u8DEF",
  "dshApp.desktop.shortcut": "\u5168\u5C40\u5FEB\u6377\u952E",
  "dshApp.desktop.save": "\u4FDD\u5B58",
  "dshApp.desktop.saving": "\u4FDD\u5B58\u4E2D\u2026",
  "dshApp.desktop.saved": "\u5DF2\u4FDD\u5B58",
  "dshApp.desktop.error": "\u4FDD\u5B58\u5931\u8D25"
};
var en = {
  "dshApp.about.title": "About DSH App",
  "dshApp.about.appVersion": "DSH App version",
  "dshApp.about.repo": "Source code",
  "dshApp.about.notAvailable": "Not detected",
  "dshApp.update.check": "Check for updates",
  "dshApp.update.checking": "Checking\u2026",
  "dshApp.update.latest": "Up to date",
  "dshApp.update.new": "New version available",
  "dshApp.update.download": "Download",
  "dshApp.update.none": "No releases published yet",
  "dshApp.update.error": "Check failed \u2014 verify your network and retry",
  "dshApp.cli.title": "dsh CLI",
  "dshApp.cli.version": "CLI version",
  "dshApp.cli.source": "CLI source",
  "dshApp.cli.serviceUrl": "Service URL",
  "dshApp.cli.check": "Check CLI update",
  "dshApp.cli.checking": "Checking\u2026",
  "dshApp.cli.latest": "CLI is up to date",
  "dshApp.cli.new": "New version available",
  "dshApp.cli.update": "Update",
  "dshApp.cli.updating": "Updating\u2026",
  "dshApp.cli.updated": "Updated \u2014 restart the app to take effect",
  "dshApp.cli.failed": "Update did not complete \u2014 copy the command and run it manually",
  "dshApp.cli.copy": "Copy command",
  "dshApp.cli.copied": "Copied",
  "dshApp.cli.dshBinHint": "CLI is pinned by DSH_BIN \u2014 update it manually in your terminal",
  "dshApp.cli.error": "Check failed \u2014 verify your network and retry",
  "dshApp.desktop.title": "Desktop",
  "dshApp.desktop.loading": "Loading settings\u2026",
  "dshApp.desktop.connect": "Connect mode",
  "dshApp.desktop.smart": "Smart (auto-detect / auto-start)",
  "dshApp.desktop.explicit": "Explicit URL",
  "dshApp.desktop.smartHint": "Reuses a local bridged instance on port 3080 when available, otherwise starts dsh web automatically.",
  "dshApp.desktop.remoteWarn": "Remote / container instances: trusted network only \u2014 HTTPS recommended.",
  "dshApp.desktop.url": "Service URL",
  "dshApp.desktop.autostart": "Launch at login",
  "dshApp.desktop.autostartHint": "Start silently after login (tray only, no window)",
  "dshApp.desktop.notifications": "Desktop notifications",
  "dshApp.desktop.notificationsHint": "Turn completion / permission requests / service events",
  "dshApp.desktop.notifyOnlyUnfocused": "Only when the window is unfocused",
  "dshApp.desktop.notifyConfirm": "Needs confirmation",
  "dshApp.desktop.notifyConfirmHint": "User questions / permission requests (with option buttons on the card)",
  "dshApp.desktop.notifyTurn": "Task complete",
  "dshApp.desktop.notifyTurnHint": "Agent turn finished",
  "dshApp.desktop.notifyErrors": "Errors",
  "dshApp.desktop.notifyErrorsHint": "Runtime errors / service exited",
  "dshApp.desktop.notifyTest": "Send test notification",
  "dshApp.desktop.notifyTestSent": "Sent",
  "dshApp.desktop.notifyTestHint": "Fire a test notification now to verify the system notification chain",
  "dshApp.desktop.shortcut": "Global shortcut",
  "dshApp.desktop.save": "Save",
  "dshApp.desktop.saving": "Saving\u2026",
  "dshApp.desktop.saved": "Saved",
  "dshApp.desktop.error": "Save failed"
};
function truncateText(s, max) {
  return s.length > max ? `${s.slice(0, max)}\u2026` : s;
}
function startNotificationBridge() {
  const internals = window.__TAURI_INTERNALS__;
  if (!internals) return;
  const host = window.location.host;
  if (!host) return;
  const invokeNotify = (payload) => {
    internals.invoke("desktop_notify", payload).catch(() => {
    });
  };
  const zh2 = isZh();
  const openLabel = zh2 ? "\u6253\u5F00 DSH" : "Open DSH";
  const none = { reply_id: null, session_id: null, question_id: null, choices: [] };
  const seenQuestions = /* @__PURE__ */ new Set();
  const seenApprovals = /* @__PURE__ */ new Set();
  const sessionRunning = /* @__PURE__ */ new Map();
  let lastTurnAt = 0;
  let lastErrorAt = 0;
  const connect = (path, onFrame) => {
    const open = () => {
      let sock;
      try {
        sock = new WebSocket(`ws://${host}${path}`);
      } catch {
        setTimeout(open, 5e3);
        return;
      }
      sock.onmessage = (ev) => {
        try {
          onFrame(JSON.parse(ev.data));
        } catch {
        }
      };
      sock.onclose = () => setTimeout(open, 5e3);
      sock.onerror = () => {
        try {
          sock.close();
        } catch {
        }
      };
    };
    open();
  };
  connect("/api/events.mux", (env) => {
    const frame = env.payload;
    if (!frame) return;
    switch (frame.type) {
      case "question/requested": {
        const rpcId = env.rpcId;
        if (!rpcId || seenQuestions.has(rpcId)) return;
        seenQuestions.add(rpcId);
        const qs = frame.questions ?? [];
        const q = qs.length === 1 ? qs[0] : void 0;
        const options = q?.options ?? [];
        const choices = q && !q.multiSelect && options.length > 0 && options.length <= 3 ? options.map((o) => o.label) : [];
        invokeNotify({
          kind: "confirm",
          title: zh2 ? "\u9700\u8981\u4F60\u7684\u786E\u8BA4" : "Confirmation needed",
          body: q ? truncateText(q.question, 160) : zh2 ? "\u6709\u65B0\u7684\u786E\u8BA4\u8BF7\u6C42" : "New confirmation request",
          reply_id: rpcId,
          session_id: frame.sessionId,
          question_id: q ? q.id : null,
          choices,
          open_label: openLabel
        });
        break;
      }
      case "approval/requested": {
        if (seenApprovals.has(frame.approvalId)) return;
        seenApprovals.add(frame.approvalId);
        invokeNotify({
          kind: "confirm",
          title: zh2 ? "\u6743\u9650\u8BF7\u6C42" : "Permission request",
          body: frame.reason ? `${frame.toolName} \u2014 ${truncateText(frame.reason, 120)}` : frame.toolName,
          ...none,
          open_label: openLabel
        });
        break;
      }
      case "stream/error": {
        const now = Date.now();
        if (now - lastErrorAt < 1e4) return;
        lastErrorAt = now;
        invokeNotify({
          kind: "error",
          title: zh2 ? "\u51FA\u9519\u62A5\u8B66" : "Error alert",
          body: truncateText(frame.error?.message ?? "stream error", 160),
          ...none,
          open_label: openLabel
        });
        break;
      }
    }
  });
  connect("/api/events.host", (env) => {
    const frame = env.payload;
    if (!frame) return;
    switch (frame.type) {
      case "host/session-status": {
        const prev = sessionRunning.get(frame.sessionId) ?? false;
        sessionRunning.set(frame.sessionId, frame.running);
        if (prev && !frame.running) {
          const now = Date.now();
          if (now - lastTurnAt < 5e3) return;
          lastTurnAt = now;
          invokeNotify({
            kind: "turn_complete",
            title: zh2 ? "\u4EFB\u52A1\u5B8C\u6210" : "Task complete",
            body: zh2 ? "Agent \u56DE\u5408\u5DF2\u5B8C\u6210\uFF0C\u70B9\u51FB\u67E5\u770B\u7ED3\u679C\u3002" : "Agent turn finished \u2014 click to view the result.",
            ...none,
            open_label: openLabel
          });
        }
        break;
      }
      case "host/agent-error": {
        const now = Date.now();
        if (now - lastErrorAt < 1e4) return;
        lastErrorAt = now;
        invokeNotify({
          kind: "error",
          title: zh2 ? "\u51FA\u9519\u62A5\u8B66" : "Error alert",
          body: truncateText(frame.message ?? "agent error", 160),
          ...none,
          open_label: openLabel
        });
        break;
      }
    }
  });
  console.log("[dsh-app-bridge] notification bridge: listening on events.mux / events.host");
}
function apply(ctx) {
  const inTauriShell = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
  if (!inTauriShell) {
    console.log("[dsh-app-bridge] browser environment detected - desktop-only UI skipped (server marker stays active)");
    return;
  }

  mountTitleBar();
  const store = createAppSettingsStore();
  let bound;
  let currentInfo = null;
  let currentDesktop = null;
  let startupChecked = false;
  const refreshInfo = async () => {
    const internals = window.__TAURI_INTERNALS__;
    if (!internals) return;
    try {
      const info = await internals.invoke("app_info", {});
      currentInfo = info;
      bound?.adoptInfo(info);
    } catch {
    }
  };
  const runAppCheck = async (actions) => {
    actions.setUpdatePhase("checking");
    try {
      const res = await fetch(GITHUB_LATEST_API, {
        cache: "no-store",
        headers: { accept: "application/vnd.github+json" }
      });
      if (res.status === 404) {
        actions.setLatest(null, null);
        actions.setUpdatePhase("none");
        return;
      }
      if (!res.ok) throw new Error(`github api ${res.status}`);
      const data = await res.json();
      actions.setLatest(extractVersion(data.tag_name), data.html_url ?? null);
      actions.setUpdatePhase("done");
    } catch {
      actions.setUpdatePhase("error");
    }
  };
  const runCliCheck = async (actions) => {
    actions.setCliPhase("checking");
    try {
      const latest = await fetchNpmLatest();
      actions.setCliLatest(latest);
      actions.setCliPhase("done");
    } catch {
      actions.setCliPhase("error");
    }
  };
  const runCliUpdate = async (actions) => {
    actions.setCliPhase("updating");
    const before = extractVersion(currentInfo?.dshVersion);
    try {
      await tauriInvoke("install_dsh", { lang: navigator.language });
    } catch {
      actions.setCliPhase("failed");
      return;
    }
    const deadline = Date.now() + 9e4;
    for (; ; ) {
      await new Promise((resolve) => setTimeout(resolve, 2e3));
      await refreshInfo();
      const after = extractVersion(currentInfo?.dshVersion);
      if (after !== null && after !== before) {
        actions.setCliPhase("updated");
        return;
      }
      if (Date.now() > deadline) {
        actions.setCliPhase("failed");
        return;
      }
    }
  };
  injectStatusStyle();
  ctx.slots.inject(
    "sidebar.footer.action",
    () => ctx.slots.register(
      {
        name: "sidebar.footer.action",
        id: "dsh-app-status",
        order: 100,
        store,
        inject: (actions) => {
          bound = actions;
          void refreshInfo();
          return {
            startupCheck: async () => {
              if (startupChecked) return;
              startupChecked = true;
              try {
                await refreshInfo();
              } catch {
              }
              await Promise.all([runAppCheck(actions), runCliCheck(actions)]);
            },
            updateCli: () => runCliUpdate(actions),
            dismissPrompt: (v) => actions.dismissPrompt(v)
          };
        }
      },
      StatusFooterItem
    )
  );
  injectAboutStyle();
  injectDesktopStyle();
  ctx.effect(() => ctx.locale.register("dsh-app", { zh, en }), "dsh-app-bridge: about dictionaries");
  const injected = (actions) => {
    bound = actions;
    void refreshInfo();
    return {
      checkUpdate: () => runAppCheck(actions),
      checkCliUpdate: () => runCliCheck(actions),
      updateCli: () => runCliUpdate(actions),
      // --- 桌面偏好 ---
      load: async () => {
        bound?.setLoading(true);
        try {
          const s = await tauriInvoke("get_settings");
          currentDesktop = s;
          bound?.adopt(s);
        } catch (e) {
          bound?.setError(String(e));
          bound?.setLoading(false);
        }
      },
      save: async (next) => {
        bound?.setSaving(true);
        bound?.setSaved(false);
        bound?.setError(null);
        const targetChanged = currentDesktop !== null && JSON.stringify(currentDesktop.connect) !== JSON.stringify(next.connect);
        try {
          await tauriInvoke("save_settings", { settings: next });
          currentDesktop = next;
          bound?.adopt(next);
          bound?.setSaved(true);
          if (targetChanged) {
            try {
              await tauriInvoke("dsh_connect");
            } catch {
            }
          }
        } catch (e) {
          bound?.setError(String(e));
        } finally {
          bound?.setSaving(false);
        }
      }
    };
  };
  const AppSettingsSection = ({
    useStore,
    t,
    checkUpdate,
    checkCliUpdate,
    updateCli,
    load,
    save
  }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", flexDirection: "column", gap: 20 }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      AboutSection,
      {
        useStore,
        t,
        checkUpdate,
        checkCliUpdate,
        updateCli
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DesktopSection, { useStore, t, load, save })
  ] });
  ctx.slots.inject(
    "settings.section",
    () => ctx.slots.register(
      {
        name: "settings.section",
        id: "dsh-app",
        order: 100,
        label: () => isZh() ? "App \u8BBE\u7F6E" : "App Settings",
        store,
        locale: "dsh-app",
        inject: injected
      },
      AppSettingsSection
    )
  );
  startNotificationBridge();
  console.log("[dsh-app-bridge] client loaded: fused title bar + App settings page + startup update prompt + notification bridge");
}

		return module.exports;
	}
});
