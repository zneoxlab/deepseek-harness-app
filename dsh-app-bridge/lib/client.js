window.__ModuleLoader__.load({
	id: "dsh-app-bridge",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var import_jsx_runtime = require("react/jsx-runtime");
var name = "dsh-app-bridge";
var inject = ["connection", "remote", "settingsScope", "locale", "slots"];
function tauriInvoke(cmd) {
  const internals = window.__TAURI_INTERNALS__;
  if (!internals) return;
  internals.invoke(cmd, {}).catch(() => {
  });
}
var TITLEBAR_HEIGHT = 36;
var STYLE_CSS = `
/* dsh-app bridge: fused title bar layout + theme */
body { overflow: hidden; }
#dsh-app-titlebar {
  position: relative;
  z-index: 2147483000;
  box-sizing: border-box;
  height: ${TITLEBAR_HEIGHT}px;
  width: 100%;
  display: flex;
  align-items: center;
  flex: none;
  background: rgba(15, 17, 23, 0.96);
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  user-select: none;
  -webkit-user-select: none;
}
#dsh-app-titlebar .dsh-tb-title {
  flex: 1;
  font-size: 12.5px;
  color: #8b93a7;
  font-weight: 500;
  letter-spacing: 0.2px;
  font-family: -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif;
}
#dsh-app-titlebar .dsh-tb-status {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11.5px;
  margin-right: 10px;
  color: #6b7280;
  flex: none;
  font-family: -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif;
}
#dsh-app-titlebar .dsh-tb-btn {
  width: 46px;
  height: ${TITLEBAR_HEIGHT}px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: #c7cddd;
  cursor: pointer;
  transition: background 0.1s;
  outline: none;
  padding: 0;
}
#dsh-app-titlebar .dsh-tb-btn:hover { background: rgba(255, 255, 255, 0.08); }
#dsh-app-titlebar .dsh-tb-close:hover { background: #e81123; color: #fff; }
/* light theme */
body:not([data-ds-dark-theme]) #dsh-app-titlebar {
  background: rgba(255, 255, 255, 0.96);
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}
body:not([data-ds-dark-theme]) #dsh-app-titlebar .dsh-tb-title { color: #5f6673; }
body:not([data-ds-dark-theme]) #dsh-app-titlebar .dsh-tb-status { color: #6b7280; }
body:not([data-ds-dark-theme]) #dsh-app-titlebar .dsh-tb-btn { color: #4a505c; }
body:not([data-ds-dark-theme]) #dsh-app-titlebar .dsh-tb-btn:hover { background: rgba(0, 0, 0, 0.06); }
body:not([data-ds-dark-theme]) #dsh-app-titlebar .dsh-tb-close:hover { background: #e81123; color: #fff; }
/* shrink the official root so 100vh pages never overflow by the bar */
#root {
  box-sizing: border-box;
  height: calc(100vh - ${TITLEBAR_HEIGHT}px);
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
}
`;
function injectStyle() {
  if (document.getElementById("dsh-app-tb-style")) return;
  const style = document.createElement("style");
  style.id = "dsh-app-tb-style";
  style.textContent = STYLE_CSS;
  document.head.appendChild(style);
}
function mountTitleBar() {
  if (document.getElementById("dsh-app-titlebar")) return;
  if (!window.__TAURI_INTERNALS__) return;
  injectStyle();
  const bar = document.createElement("div");
  bar.id = "dsh-app-titlebar";
  bar.setAttribute("data-tauri-drag-region", "");
  const logo = document.createElement("img");
  logo.src = "/favicon.svg";
  logo.alt = "";
  logo.draggable = false;
  logo.style.cssText = "width:16px;height:16px;margin:0 8px 0 12px;";
  const title = document.createElement("span");
  title.textContent = "DeepSeek Harness";
  title.className = "dsh-tb-title";
  const makeBtn = (titleAttr, svg, cls) => {
    const btn = document.createElement("button");
    btn.title = titleAttr;
    btn.className = cls;
    btn.innerHTML = svg;
    return btn;
  };
  const minBtn = makeBtn(
    "\u6700\u5C0F\u5316",
    '<svg width="10" height="10" viewBox="0 0 10 10"><line x1="0" y1="5" x2="10" y2="5" stroke="currentColor" stroke-width="1"/></svg>',
    "dsh-tb-btn"
  );
  minBtn.addEventListener("click", () => tauriInvoke("window_minimize"));
  const maxBtn = makeBtn(
    "\u6700\u5927\u5316 / \u8FD8\u539F",
    '<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><rect x="0.5" y="0.5" width="9" height="9" stroke="currentColor" stroke-width="1"/></svg>',
    "dsh-tb-btn"
  );
  maxBtn.addEventListener("click", () => tauriInvoke("window_toggle_maximize"));
  const closeBtn = makeBtn(
    "\u5173\u95ED",
    '<svg width="10" height="10" viewBox="0 0 10 10"><line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" stroke-width="1"/><line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" stroke-width="1"/></svg>',
    "dsh-tb-btn dsh-tb-close"
  );
  closeBtn.addEventListener("click", () => tauriInvoke("window_close"));
  const status = document.createElement("span");
  status.className = "dsh-tb-status";
  const dot = document.createElement("span");
  dot.style.cssText = "width:7px;height:7px;border-radius:50%;background:#9ca3af;flex:none;transition:background 0.2s;";
  const statusLabel = document.createElement("span");
  statusLabel.textContent = "\u68C0\u6D4B\u4E2D\u2026";
  status.append(dot, statusLabel);
  const updateStatus = async () => {
    try {
      const res = await fetch("/dsh-app/status", { cache: "no-store" });
      const data = res.ok ? await res.json().catch(() => null) : null;
      if (res.ok && data && data.ok === true) {
        dot.style.background = "#22c55e";
        statusLabel.textContent = "\u5DF2\u8FDE\u63A5";
        return;
      }
      throw new Error("bridge not ok");
    } catch {
      dot.style.background = "#ef4444";
      statusLabel.textContent = "\u672A\u8FDE\u63A5";
    }
  };
  void updateStatus();
  setInterval(() => void updateStatus(), 5e3);
  bar.append(logo, title, status, minBtn, maxBtn, closeBtn);
  bar.addEventListener("mousedown", (e) => {
    const target = e.target;
    if (target.closest("button")) return;
    if (e.button === 0) tauriInvoke("window_start_dragging");
  });
  bar.addEventListener("dblclick", (e) => {
    const target = e.target;
    if (target.closest("button")) return;
    tauriInvoke("window_toggle_maximize");
  });
  const root = document.getElementById("root");
  if (root) {
    document.body.insertBefore(bar, root);
  } else {
    document.body.prepend(bar);
  }
}
var GITHUB_REPO = "https://github.com/zneoxlab/deepseek-harness-app";
var GITHUB_LATEST_API = "https://api.github.com/repos/zneoxlab/deepseek-harness-app/releases/latest";
var createAboutStore = () => (0, import_client.defineStore)({
  init: () => ({ info: null, updatePhase: "idle", latestVersion: null, latestUrl: null }),
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
var ABOUT_CSS = `
.dsh-app-about { display: flex; flex-direction: column; gap: 14px; font-size: 13px; }
.dsh-app-about h3 { margin: 0; font-size: 14px; font-weight: 600; }
.dsh-app-about .rows { display: flex; flex-direction: column; border-radius: 10px; overflow: hidden; border: 1px solid rgba(255,255,255,0.08); }
body:not([data-ds-dark-theme]) .dsh-app-about .rows { border-color: rgba(0,0,0,0.08); }
.dsh-app-about .row { display: flex; align-items: baseline; gap: 10px; padding: 8px 12px; }
.dsh-app-about .row:nth-child(odd) { background: rgba(255,255,255,0.03); }
body:not([data-ds-dark-theme]) .dsh-app-about .row:nth-child(odd) { background: rgba(0,0,0,0.02); }
.dsh-app-about .row .k { flex: none; width: 110px; color: #8b93a7; font-size: 12px; }
body:not([data-ds-dark-theme]) .dsh-app-about .row .k { color: #6b7280; }
.dsh-app-about .row .v { flex: 1; font-family: ui-monospace, Consolas, monospace; font-size: 12px; word-break: break-all; }
.dsh-app-about .update { display: flex; align-items: center; gap: 10px; }
.dsh-app-about .update button {
  padding: 6px 14px; border-radius: 7px; border: 1px solid rgba(255,255,255,0.15);
  background: transparent; color: inherit; cursor: pointer; font-size: 12.5px;
}
.dsh-app-about .update button:hover { background: rgba(255,255,255,0.06); }
body:not([data-ds-dark-theme]) .dsh-app-about .update button { border-color: rgba(0,0,0,0.18); }
body:not([data-ds-dark-theme]) .dsh-app-about .update button:hover { background: rgba(0,0,0,0.05); }
.dsh-app-about .update .hint { font-size: 12px; color: #8b93a7; }
body:not([data-ds-dark-theme]) .dsh-app-about .update .hint { color: #6b7280; }
.dsh-app-about .update .hint.new { color: #f59e0b; }
.dsh-app-about .dsh-app-link { color: #4d7cfe; text-decoration: none; font-size: 12px; }
.dsh-app-about .dsh-app-link:hover { text-decoration: underline; }
`;
function injectAboutStyle() {
  if (document.getElementById("dsh-app-about-style")) return;
  const style = document.createElement("style");
  style.id = "dsh-app-about-style";
  style.textContent = ABOUT_CSS;
  document.head.appendChild(style);
}
function AboutSection({ useStore, t, checkUpdate }) {
  const info = useStore((s) => s.info);
  const phase = useStore((s) => s.updatePhase);
  const latest = useStore((s) => s.latestVersion);
  const latestUrl = useStore((s) => s.latestUrl);
  const dshCurrent = extractVersion(info?.dshVersion);
  const appCurrent = extractVersion(info?.appVersion);
  const hasNew = latest !== null && appCurrent !== null && isNewer(latest, appCurrent);
  const upToDate = latest !== null && appCurrent !== null && !isNewer(latest, appCurrent);
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
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "k", children: t("dshApp.about.dshVersion") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "v", children: dshCurrent ?? t("dshApp.about.notAvailable") })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "k", children: t("dshApp.about.dshSource") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "v", children: info?.dshSource ?? t("dshApp.about.notAvailable") })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "k", children: t("dshApp.about.serviceUrl") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "v", children: info?.serviceUrl ?? t("dshApp.about.notAvailable") })
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
    ] })
  ] });
}
var zh = {
  "dshApp.about.title": "\u5173\u4E8E DSH App",
  "dshApp.about.appVersion": "DSH App \u7248\u672C",
  "dshApp.about.dshVersion": "dsh CLI \u7248\u672C",
  "dshApp.about.dshSource": "CLI \u6765\u6E90",
  "dshApp.about.serviceUrl": "\u670D\u52A1\u5730\u5740",
  "dshApp.about.repo": "\u5F00\u6E90\u5730\u5740",
  "dshApp.about.notAvailable": "\u672A\u68C0\u6D4B\u5230",
  "dshApp.update.check": "\u68C0\u67E5\u66F4\u65B0",
  "dshApp.update.checking": "\u6B63\u5728\u68C0\u67E5\u2026",
  "dshApp.update.latest": "\u5DF2\u662F\u6700\u65B0\u7248\u672C",
  "dshApp.update.new": "\u53D1\u73B0\u65B0\u7248\u672C",
  "dshApp.update.download": "\u524D\u5F80\u4E0B\u8F7D",
  "dshApp.update.none": "\u6682\u65E0\u5DF2\u53D1\u5E03\u7248\u672C",
  "dshApp.update.error": "\u68C0\u67E5\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u7F51\u7EDC\u540E\u91CD\u8BD5"
};
var en = {
  "dshApp.about.title": "About DSH App",
  "dshApp.about.appVersion": "DSH App version",
  "dshApp.about.dshVersion": "dsh CLI version",
  "dshApp.about.dshSource": "CLI source",
  "dshApp.about.serviceUrl": "Service URL",
  "dshApp.about.repo": "Source code",
  "dshApp.about.notAvailable": "Not detected",
  "dshApp.update.check": "Check for updates",
  "dshApp.update.checking": "Checking\u2026",
  "dshApp.update.latest": "Up to date",
  "dshApp.update.new": "New version available",
  "dshApp.update.download": "Download",
  "dshApp.update.none": "No releases published yet",
  "dshApp.update.error": "Check failed \u2014 verify your network and retry"
};
function apply(ctx) {
  mountTitleBar();
  injectAboutStyle();
  ctx.effect(() => ctx.locale.register("dsh-app", { zh, en }), "dsh-app-bridge: about dictionaries");
  const store = createAboutStore();
  let bound;
  const refreshInfo = async () => {
    const internals = window.__TAURI_INTERNALS__;
    if (!internals) return;
    try {
      const info = await internals.invoke("app_info", {});
      bound?.adoptInfo(info);
    } catch {
    }
  };
  const injected = (actions) => {
    bound = actions;
    void refreshInfo();
    return {
      checkUpdate: async () => {
        bound?.setUpdatePhase("checking");
        try {
          const res = await fetch(GITHUB_LATEST_API, {
            cache: "no-store",
            headers: { accept: "application/vnd.github+json" }
          });
          if (res.status === 404) {
            bound?.setLatest(null, null);
            bound?.setUpdatePhase("none");
            return;
          }
          if (!res.ok) throw new Error(`github api ${res.status}`);
          const data = await res.json();
          bound?.setLatest(extractVersion(data.tag_name), data.html_url ?? null);
          bound?.setUpdatePhase("done");
        } catch {
          bound?.setUpdatePhase("error");
        }
      }
    };
  };
  ctx.slots.inject(
    "settings.section",
    () => ctx.slots.register(
      {
        name: "settings.section",
        id: "dsh-app",
        order: 100,
        label: () => "DSH App",
        store,
        locale: "dsh-app",
        inject: injected
      },
      AboutSection
    )
  );
  console.log("[dsh-app-bridge] client loaded: title bar + DSH App settings page");
}

		return module.exports;
	}
});
