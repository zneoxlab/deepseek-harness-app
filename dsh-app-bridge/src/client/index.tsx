/**
 * dsh-app-bridge — client half.
 *
 * Injected into the official Web UI as a client bundle
 * (`/plugins/dsh-app-bridge/client.js`). Three jobs:
 *
 * 1. Fused title bar — the desktop shell window is borderless, so the window
 *    buttons live inside the Web UI as the top strip of the layout:
 *      - macOS: the window uses its native title bar entirely (Titled window +
 *        Transparent style — real system traffic lights, native rounded
 *        corners and shadow); the window appearance follows the in-app theme
 *        via `window_set_theme`.
 *      - Linux: neutral circles (close / minimize / maximize) at the top-left,
 *        title next to them.
 *      - Windows: native-style square caption buttons at the top-right, title
 *        at the left. Windows 11 rounds the whole window automatically
 *        (undecorated + shadow).
 *    The strip doubles as the drag region; double-click maximizes. Injected
 *    only when the page runs inside the Tauri shell
 *    (`window.__TAURI_INTERNALS__` exists); a plain browser keeps its native
 *    title bar. Layout: the bar lives IN the document flow and the official
 *    `#root` shrinks below it. Theme: colors follow the official
 *    `data-ds-dark-theme` body attribute via CSS.
 *
 * 2. Sidebar footer status row — registered into the official
 *    `sidebar.footer.action` slot: a status capsule (colored dot + text) on
 *    the left and the app version on the right of the same row. The official
 *    footer puts the settings row last, so we move the settings row up one
 *    slot and let the status row sink to the very bottom, below the settings
 *    button. On every app startup it auto-checks for a newer App (GitHub
 *    Releases) or dsh CLI (npm) version and, when one exists, floats an
 *    update card above the status row with “Update” / “Not now” buttons
 *    (the hover info popup is a plain card — no bubble arrow).
 *
 * 3. "DSH App" settings page — registered into the official settings panel
 *    through the standard `settings.section` slot (same pattern as the
 *    official ui-theme Appearance feature):
 *      - DSH App about + update check against GitHub Releases;
 *      - dsh CLI info + update management against the npm registry
 *        (check latest, one-click `install_dsh` update, copy command).
 */

import { defineStore } from '@deepseek-ai/dsh-client-runtime/client'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type { BoundActions } from '@deepseek-ai/dsh-client-ui-slots'
import * as React from 'react'
import { createPortal } from 'react-dom'

export const name = 'dsh-app-bridge'

// Declared services: settingsScope guarantees the ui-settings plugin (owner
// of the settings.section slot) is active; `slots` and `locale` are the
// registries our apply() touches. cordis activates us only once all are up.
export const inject = ['connection', 'remote', 'settingsScope', 'locale', 'slots']

declare global {
  interface Window {
    __TAURI_INTERNALS__?: {
      invoke: (cmd: string, args?: unknown) => Promise<unknown>
    }
  }
}

// ---------------------------------------------------------------------------
// Window controls overlay (borderless shell window)
// ---------------------------------------------------------------------------

function tauriInvoke<T = unknown>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const internals = window.__TAURI_INTERNALS__
  if (!internals) return Promise.reject(new Error('not inside the Tauri shell'))
  return internals.invoke(cmd, args ?? {}) as Promise<T>
}

type Platform = 'macos' | 'linux' | 'windows' | 'other'

/** Detect the host OS inside the webview (no IPC plugin needed). */
function detectPlatform(): Platform {
  const ua = navigator.userAgent
  const plat = navigator.platform || ''
  if (/mac/i.test(plat) || /Macintosh/.test(ua)) return 'macos'
  if (/win/i.test(plat) || /Windows NT/.test(ua)) return 'windows'
  if (/linux/i.test(plat) || /Linux/.test(ua)) return 'linux'
  return 'other'
}

const isZh = (): boolean => (navigator.language || '').toLowerCase().startsWith('zh')

/** Small inline SVG glyphs shared by the window buttons. */
const GLYPH_CLOSE =
  '<svg width="8" height="8" viewBox="0 0 8 8"><path d="M1.5 1.5 L6.5 6.5 M6.5 1.5 L1.5 6.5" stroke="rgba(0,0,0,0.55)" stroke-width="1.1" stroke-linecap="round"/></svg>'
const GLYPH_MIN =
  '<svg width="8" height="8" viewBox="0 0 8 8"><path d="M1.5 4 H6.5" stroke="rgba(0,0,0,0.55)" stroke-width="1.1" stroke-linecap="round"/></svg>'
const GLYPH_MAX =
  '<svg width="9" height="9" viewBox="0 0 9 9"><path d="M2.4 3.1 L3.1 2.4 L2.4 2.4 Z" fill="rgba(0,0,0,0.5)"/><path d="M5.9 6.6 L6.6 5.9 L6.6 6.6 Z" fill="rgba(0,0,0,0.5)"/></svg>'
const GLYPH_MIN_WIN =
  '<svg width="10" height="10" viewBox="0 0 10 10"><line x1="0" y1="5" x2="10" y2="5" stroke="currentColor" stroke-width="1"/></svg>'
const GLYPH_MAX_WIN =
  '<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><rect x="0.5" y="0.5" width="9" height="9" stroke="currentColor" stroke-width="1"/></svg>'
const GLYPH_CLOSE_WIN =
  '<svg width="10" height="10" viewBox="0 0 10 10"><line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" stroke-width="1"/><line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" stroke-width="1"/></svg>'

const TITLEBAR_CSS = `
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
/* Linux 左上角圆形按钮（GNOME 风格, 图形常显） */
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
/* Windows 右上角方形按钮（Win11 caption 风格） */
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
/* 官方 UI 缩到标题栏下方（macOS 用原生标题栏, WebView 视口本身不含标题栏,
   #root 保持 100vh 即可） */
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
`

function injectTitleBarStyle(): void {
  if (document.getElementById('dsh-app-tb-style')) return
  const style = document.createElement('style')
  style.id = 'dsh-app-tb-style'
  style.textContent = TITLEBAR_CSS
  document.head.appendChild(style)
}

type StatusListener = (connected: boolean, text: string) => void

/** 轮询 bridge 状态端点, 把结果回调出去（DOM 与 macOS 原生标题栏共用）。 */
function startStatusPoller(onUpdate: StatusListener): void {
  const updateStatus = async (): Promise<void> => {
    let connected = false
    let text: string
    try {
      const res = await fetch('/dsh-app/status', { cache: 'no-store' })
      const data: { ok?: boolean } | null = res.ok ? await res.json().catch(() => null) : null
      if (res.ok && data && data.ok === true) {
        connected = true
        text = isZh() ? '已连接' : 'Connected'
      } else {
        throw new Error('bridge not ok')
      }
    } catch {
      connected = false
      text = isZh() ? '未连接' : 'Disconnected'
    }
    onUpdate(connected, text)
  }
  void updateStatus()
  setInterval(() => void updateStatus(), 5000)
}

/** 跟随应用内主题（官方 UI body[data-ds-dark-theme]）同步窗口外观。 */
function syncWindowTheme(): void {
  const apply = (): void => {
    const dark = document.body.hasAttribute('data-ds-dark-theme')
    void tauriInvoke('window_set_theme', { theme: dark ? 'dark' : 'light' }).catch(() => {})
  }
  apply()
  if (typeof MutationObserver !== 'undefined') {
    new MutationObserver(apply).observe(document.body, {
      attributes: true,
      attributeFilter: ['data-ds-dark-theme'],
    })
  }
}

/** Mount the fused title bar; no-op outside the Tauri shell. */
function mountTitleBar(): void {
  if (document.getElementById('dsh-app-titlebar')) return
  // 浏览器环境（非桌面壳）: 保留原生标题栏
  if (!window.__TAURI_INTERNALS__) return

  const platform = detectPlatform()
  document.body.setAttribute('data-dsh-platform', platform)
  syncWindowTheme()

  // macOS: 完全使用原生标题栏（红绿灯 + 原生标题 + 原生圆角）——
  // 不渲染任何网页条带; 连接状态在侧栏底部状态行显示。
  if (platform === 'macos') return

  injectTitleBarStyle()

  const bar = document.createElement('div')
  bar.id = 'dsh-app-titlebar'

  const makeBtn = (titleAttr: string, svg: string, cls: string): HTMLButtonElement => {
    const btn = document.createElement('button')
    btn.title = titleAttr
    btn.className = cls
    btn.innerHTML = svg
    return btn
  }

  const makeTitle = (): HTMLElement => {
    const title = document.createElement('span')
    title.textContent = 'DeepSeek Harness'
    title.className = 'dsh-tb-title'
    return title
  }

  if (platform === 'windows') {
    // 左: 标题; 右: 方形按钮（Win11 顺序: 最小化 / 最大化 / 关闭）
    const minBtn = makeBtn('最小化', GLYPH_MIN_WIN, 'dsh-tb-btn')
    minBtn.addEventListener('click', () => void tauriInvoke('window_minimize').catch(() => {}))
    const maxBtn = makeBtn('最大化 / 还原', GLYPH_MAX_WIN, 'dsh-tb-btn')
    maxBtn.addEventListener('click', () => void tauriInvoke('window_toggle_maximize').catch(() => {}))
    const closeBtn = makeBtn('关闭', GLYPH_CLOSE_WIN, 'dsh-tb-btn dsh-tb-close')
    closeBtn.addEventListener('click', () => void tauriInvoke('window_close').catch(() => {}))
    bar.append(makeTitle(), minBtn, maxBtn, closeBtn)
  } else {
    // Linux 及其它平台: 左上角圆形按钮 + 标题
    const closeBtn = makeBtn('关闭', GLYPH_CLOSE, 'dsh-tb-circle')
    closeBtn.addEventListener('click', () => void tauriInvoke('window_close').catch(() => {}))
    const minBtn = makeBtn('最小化', GLYPH_MIN, 'dsh-tb-circle')
    minBtn.addEventListener('click', () => void tauriInvoke('window_minimize').catch(() => {}))
    const maxBtn = makeBtn('最大化 / 还原', GLYPH_MAX, 'dsh-tb-circle')
    maxBtn.addEventListener('click', () => void tauriInvoke('window_toggle_maximize').catch(() => {}))
    bar.append(closeBtn, minBtn, maxBtn, makeTitle())
  }

  // 拖拽（mousedown 在非按钮区域时启动窗口拖动）与双击最大化
  bar.addEventListener('mousedown', (e) => {
    const target = e.target as HTMLElement
    if (target.closest('button')) return
    if (e.button === 0) void tauriInvoke('window_start_dragging').catch(() => {})
  })
  bar.addEventListener('dblclick', (e) => {
    const target = e.target as HTMLElement
    if (target.closest('button')) return
    void tauriInvoke('window_toggle_maximize').catch(() => {})
  })

  // 标题栏置于文档流顶部（占位 32/38px），#root 由注入 CSS 收缩
  const root = document.getElementById('root')
  if (root) {
    document.body.insertBefore(bar, root)
  } else {
    document.body.prepend(bar)
  }
}

// ---------------------------------------------------------------------------
// Sidebar footer status row (below the settings button)
// ---------------------------------------------------------------------------

const STATUS_CSS = `
.dsh-status-row {
  box-sizing: border-box;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  /* 上下对称内边距 → 内容垂直居中; 左圆点与设置按钮图标对齐 */
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
/* 断连时红点呼吸闪烁 */
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
/* 右侧只放短版本号（不截断）, 完整信息悬停浮层显示 */
.dsh-status-version {
  flex: none;
  font-family: ui-monospace, Consolas, monospace;
  font-size: 10.5px;
  line-height: 18px;
  color: var(--dsw-alias-label-tertiary);
  white-space: nowrap;
}
/* 悬停卡片: 状态行上方弹出卡片（无箭头, 纯卡片） */
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
/* 折叠侧栏: 只留一个彩色圆点 */
.dsh-status-rail {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px 0;
}
.dsh-status-rail .dsh-status-dot { width: 9px; height: 9px; }

/* 更新提示卡片: 状态行上方浮出（纯卡片, 无箭头; 检测到 App / CLI 新版本时显示） */
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
/* 折叠侧栏（rail）: 卡片脱离侧栏, 固定在视口左下角 */
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
`

function injectStatusStyle(): void {
  if (document.getElementById('dsh-app-status-style')) return
  const style = document.createElement('style')
  style.id = 'dsh-app-status-style'
  style.textContent = STATUS_CSS
  document.head.appendChild(style)
}

/**
 * 官方侧栏底部结构: [footerActions（footer.action 槽）] [settingsArea（设置按钮）]。
 * 用户希望状态行在设置按钮**下面**。**不移动任何 DOM 节点** —— 直接搬节点会
 * 与 React 的 fiber 树冲突（之前 insertBefore 的做法把布局搅乱了）:
 * 这里只给设置行写一个 inline CSS `order: -1`, 让 flex 容器把它渲染在
 * footerActions 之前 —— 状态行视觉上沉底、设置按钮上移一行。
 * inline style 由 JS 一次性写入, 该节点没有 style prop, React 不会重写它;
 * 若某次重渲染重建了节点, 每次 render 后的 effect 会重新补上。
 */
function sinkStatusBelowSettings(): void {
  const status = document.querySelector<HTMLElement>('[data-dsh-app-status]')
  if (!status) return
  // 从状态元素向上找到与 settingsArea 相邻的容器（可能隔一层 slot 包装）
  let row: HTMLElement | null = status.parentElement
  while (row && !row.nextElementSibling) row = row.parentElement
  const settingsArea = row?.nextElementSibling as HTMLElement | null
  if (settingsArea && settingsArea.style.order !== '-1') {
    settingsArea.style.order = '-1'
  }
}

/** 侧栏底部状态行: 左 = 状态胶囊（彩色圆点 + 文字）, 右 = 版本号。 */
function StatusFooterItem({
  wide,
  useStore,
  startupCheck,
  updateCli,
  dismissPrompt,
}: {
  wide?: boolean
  useStore: <S>(sel: (s: AppSettingsState) => S) => S
  startupCheck: () => Promise<void>
  updateCli: () => Promise<void>
  dismissPrompt: (v: boolean) => void
}) {
  const [status, setStatus] = React.useState<{ connected: boolean; text: string }>({
    connected: false,
    text: isZh() ? '检测中…' : 'Checking…',
  })
  const [copied, setCopied] = React.useState(false)
  const [hovered, setHovered] = React.useState(false)
  const [cliFlash, setCliFlash] = React.useState<'ok' | 'fail' | null>(null)

  // 与「App 设置」页共享同一个 store: 启动检测结果 + 应用信息都在里面。
  const info = useStore((s) => s.info)
  const updatePhase = useStore((s) => s.updatePhase)
  const latestVersion = useStore((s) => s.latestVersion)
  const latestUrl = useStore((s) => s.latestUrl)
  const cliPhase = useStore((s) => s.cliPhase)
  const cliLatest = useStore((s) => s.cliLatest)
  const promptDismissed = useStore((s) => s.promptDismissed)

  React.useEffect(() => {
    // 每次启动自动检测 App / CLI 更新（内部保证只跑一次）
    void startupCheck()
    startStatusPoller((connected, text) => setStatus({ connected, text }))
  }, [])

  // 每次渲染后补一次 order（无 DOM 移动, 纯 CSS 排序, 不碰 React fiber 树）
  React.useEffect(() => {
    sinkStatusBelowSettings()
  })

  // CLI 更新完成 / 失败后的短暂反馈（约 5s, 之后随 cliHasNew=false 自然隐藏）
  React.useEffect(() => {
    if (cliPhase === 'updated' || cliPhase === 'failed') {
      setCliFlash(cliPhase === 'updated' ? 'ok' : 'fail')
      const id = setTimeout(() => setCliFlash(null), 5000)
      return () => clearTimeout(id)
    }
    setCliFlash(null)
  }, [cliPhase])

  const zh = isZh()
  const appCurrent = extractVersion(info?.appVersion)
  const appHasNew =
    updatePhase === 'done' && latestVersion !== null && appCurrent !== null && isNewer(latestVersion, appCurrent)
  const dshCurrent = extractVersion(info?.dshVersion)
  const cliHasNew =
    cliPhase === 'done' && cliLatest !== null && dshCurrent !== null && isNewer(cliLatest, dshCurrent)
  const cliBusy = cliPhase === 'updating'
  const updateVisible = !promptDismissed && (appHasNew || cliHasNew || cliBusy || cliFlash !== null)

  const copyInfo = async (): Promise<void> => {
    const parts = [`DeepSeek Harness App v${info?.appVersion ?? '?'}`]
    if (info?.dshVersion) parts.push(`dsh CLI ${info.dshVersion}`)
    if (info?.serviceUrl) parts.push(info.serviceUrl)
    if (await copyText(parts.join(' · '))) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }

  // 更新提示卡片: 检测到 App / CLI 新版本时在左下角状态行位置浮出。
  // 宽侧栏吸附在状态行上方; 折叠侧栏（rail）通过 portal 固定到视口左下角。
  const updateCard = (extraClass: string) => (
    <div
      className={'dsh-status-update' + (extraClass ? ` ${extraClass}` : '')}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="u-title">{zh ? '发现新版本' : 'Updates available'}</div>
      {appHasNew && (
        <div className="u-row">
          <span className="u-name">App</span>
          <span className="u-vers">
            v{appCurrent} → v{latestVersion}
          </span>
          <a
            className="u-btn primary"
            href={latestUrl ?? `${GITHUB_REPO}/releases/latest`}
            target="_blank"
            rel="noreferrer"
          >
            {zh ? '更新' : 'Update'}
          </a>
        </div>
      )}
      {cliHasNew && (
        <div className="u-row">
          <span className="u-name">dsh CLI</span>
          <span className="u-vers">
            {dshCurrent} → {cliLatest}
          </span>
          {info?.dshSource === 'dsh_bin' ? (
            <span className="u-hint">
              {zh ? '由 DSH_BIN 指定，请在终端手动更新' : 'Pinned by DSH_BIN — update manually'}
            </span>
          ) : (
            <button type="button" className="u-btn primary" disabled={cliBusy} onClick={() => void updateCli()}>
              {cliBusy ? (zh ? '更新中…' : 'Updating…') : zh ? '更新' : 'Update'}
            </button>
          )}
        </div>
      )}
      {cliBusy && !cliHasNew && (
        <div className="u-row">
          <span className="u-name">dsh CLI</span>
          <span className="u-hint">{zh ? '正在更新…' : 'Updating…'}</span>
        </div>
      )}
      {cliFlash && (
        <div className="u-row">
          <span className="u-name">dsh CLI</span>
          <span className={'u-hint ' + (cliFlash === 'ok' ? 'ok' : 'warn')}>
            {cliFlash === 'ok'
              ? zh
                ? '更新完成，重启应用后生效'
                : 'Updated — restart the app to take effect'
              : zh
                ? '更新未完成，请到「App 设置」复制命令手动执行'
                : 'Update failed — copy the command in App Settings'}
          </span>
        </div>
      )}
      <div className="u-foot">
        <button type="button" className="u-btn" onClick={() => dismissPrompt(true)}>
          {zh ? '暂不更新' : 'Not now'}
        </button>
      </div>
    </div>
  )

  if (!wide) {
    // 折叠侧栏: 只留彩色圆点; 更新提示固定到视口左下角
    return (
      <>
        <div data-dsh-app-status="1" className="dsh-status-rail" title={status.text}>
          <span
            className="dsh-status-dot"
            data-off={status.connected ? undefined : '1'}
            style={{ background: status.connected ? '#22c55e' : '#ef4444' }}
          />
        </div>
        {updateVisible && createPortal(updateCard('dsh-status-update-rail'), document.body)}
      </>
    )
  }

  return (
    <div
      data-dsh-app-status="1"
      className="dsh-status-row"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => void copyInfo()}
    >
      <span className="dsh-status-left">
        <span
          className="dsh-status-dot"
          data-off={status.connected ? undefined : '1'}
          style={{ background: status.connected ? '#22c55e' : '#ef4444' }}
        />
        <span className="dsh-status-text">{status.text}</span>
      </span>
      {/* 右侧只放短版本号; 完整信息（含服务链接）悬停卡片显示 */}
      <span className="dsh-status-version">
        {copied ? (zh ? '已复制' : 'Copied') : info?.appVersion ? `v${info.appVersion}` : ''}
      </span>
      {hovered && !updateVisible && (
        <div className="dsh-status-tip">
          <div className="t-row">
            <span className="t-k">{zh ? '状态' : 'Status'}</span>
            <span className="t-v">{status.text}</span>
          </div>
          {info?.appVersion !== undefined && info?.appVersion !== null && (
            <div className="t-row">
              <span className="t-k">App</span>
              <span className="t-v">v{info.appVersion}</span>
            </div>
          )}
          {info?.dshVersion && (
            <div className="t-row">
              <span className="t-k">dsh CLI</span>
              <span className="t-v">{info.dshVersion}</span>
            </div>
          )}
          {info?.serviceUrl && (
            <div className="t-row">
              <span className="t-k">{zh ? '服务' : 'Service'}</span>
              <span className="t-v">{info.serviceUrl}</span>
            </div>
          )}
          <div className="t-hint">{zh ? '点击复制以上信息' : 'Click to copy the info above'}</div>
        </div>
      )}
      {updateVisible && updateCard('')}
    </div>
  )
}

// ---------------------------------------------------------------------------
// DSH App settings page (about + update management)
// ---------------------------------------------------------------------------

export interface AppInfoSnapshot {
  appVersion?: string
  dshVersion?: string | null
  dshSource?: string | null
  serviceUrl?: string | null
}

/** dsh-app 的开源仓库（关于页展示 + GitHub Releases 更新源）。 */
export const GITHUB_REPO = 'https://github.com/zneoxlab/deepseek-harness-app'
const GITHUB_LATEST_API = 'https://api.github.com/repos/zneoxlab/deepseek-harness-app/releases/latest'
const NPM_CLI_UPDATE_CMD = 'npm install -g @deepseek-ai/dsh@latest'
const NPM_LATEST_URLS = [
  'https://registry.npmjs.org/@deepseek-ai/dsh/latest',
  'https://registry.npmmirror.com/@deepseek-ai/dsh/latest',
]

/** 「App 设置」页合并状态: 关于/更新（about）+ 桌面偏好（desktop）。 */
interface AppSettingsState {
  // --- 关于 / 更新（原 AboutState） ---
  info: AppInfoSnapshot | null
  updatePhase: 'idle' | 'checking' | 'done' | 'error' | 'none'
  latestVersion: string | null
  latestUrl: string | null
  cliPhase: 'idle' | 'checking' | 'done' | 'error' | 'updating' | 'updated' | 'failed'
  cliLatest: string | null
  // 左下角更新提示卡: 本次会话内是否已被「暂不更新」忽略（每次启动重置）。
  promptDismissed: boolean
  // --- 桌面偏好（原 DesktopState） ---
  settings: DesktopSettings | null
  loading: boolean
  saving: boolean
  saved: boolean
  error: string | null
}

const createAppSettingsStore = () =>
  defineStore<AppSettingsState, {
    adoptInfo(d: AppSettingsState, info: AppInfoSnapshot): void
    setUpdatePhase(d: AppSettingsState, phase: AppSettingsState['updatePhase']): void
    setLatest(d: AppSettingsState, v: string | null, url: string | null): void
    setCliPhase(d: AppSettingsState, phase: AppSettingsState['cliPhase']): void
    setCliLatest(d: AppSettingsState, v: string | null): void
    dismissPrompt(d: AppSettingsState, v: boolean): void
    adopt(d: AppSettingsState, settings: DesktopSettings): void
    setLoading(d: AppSettingsState, v: boolean): void
    setSaving(d: AppSettingsState, v: boolean): void
    setSaved(d: AppSettingsState, v: boolean): void
    setError(d: AppSettingsState, e: string | null): void
  }>({
    init: () => ({
      info: null,
      updatePhase: 'idle',
      latestVersion: null,
      latestUrl: null,
      cliPhase: 'idle',
      cliLatest: null,
      promptDismissed: false,
      settings: null,
      loading: true,
      saving: false,
      saved: false,
      error: null,
    }),
    actions: {
      adoptInfo(d, info) { d.info = info },
      setUpdatePhase(d, phase) { d.updatePhase = phase },
      setLatest(d, v, url) { d.latestVersion = v; d.latestUrl = url },
      setCliPhase(d, phase) { d.cliPhase = phase },
      setCliLatest(d, v) { d.cliLatest = v },
      dismissPrompt(d, v) { d.promptDismissed = v },
      adopt(d, settings) { d.settings = settings; d.loading = false },
      setLoading(d, v) { d.loading = v },
      setSaving(d, v) { d.saving = v },
      setSaved(d, v) { d.saved = v },
      setError(d, e) { d.error = e },
    },
  })

/** Extract a semver from arbitrary `dsh --version` output (keeps prerelease suffix). */
function extractVersion(text: string | null | undefined): string | null {
  if (!text) return null
  const m = /[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.]+)?/.exec(text)
  return m ? m[0] : text
}

/** True when `a` is strictly newer than `b` (loose semver). */
function isNewer(a: string, b: string): boolean {
  const pa = a.replace(/^v/, '').split('.').map((x) => parseInt(x, 10) || 0)
  const pb = b.replace(/^v/, '').split('.').map((x) => parseInt(x, 10) || 0)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] ?? 0
    const y = pb[i] ?? 0
    if (x !== y) return x > y
  }
  return false
}

/** Query the npm registry for the latest `@deepseek-ai/dsh` version (mirror fallback). */
async function fetchNpmLatest(): Promise<string> {
  let lastErr: unknown = new Error('npm registry unreachable')
  for (const url of NPM_LATEST_URLS) {
    try {
      const res = await fetch(url, { cache: 'no-store', headers: { accept: 'application/json' } })
      if (!res.ok) {
        lastErr = new Error(`npm registry ${res.status}`)
        continue
      }
      const data = (await res.json()) as { version?: string }
      const v = extractVersion(data.version)
      if (v) return v
      lastErr = new Error('npm registry response has no version field')
    } catch (err) {
      lastErr = err
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr))
}

/** Clipboard write with a hidden-textarea fallback for older webviews. */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none;'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      ta.remove()
      return ok
    } catch {
      return false
    }
  }
}

const ABOUT_CSS = `
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
`

function injectAboutStyle(): void {
  if (document.getElementById('dsh-app-about-style')) return
  const style = document.createElement('style')
  style.id = 'dsh-app-about-style'
  style.textContent = ABOUT_CSS
  document.head.appendChild(style)
}

interface AboutSectionProps {
  useStore: <S>(sel: (s: AppSettingsState) => S) => S
  t: (key: string, params?: Record<string, unknown>) => string
  checkUpdate: () => Promise<void>
  checkCliUpdate: () => Promise<void>
  updateCli: () => Promise<void>
}

function AboutSection({ useStore, t, checkUpdate, checkCliUpdate, updateCli }: AboutSectionProps) {
  const [copied, setCopied] = React.useState(false)
  const info = useStore((s) => s.info)
  const phase = useStore((s) => s.updatePhase)
  const latest = useStore((s) => s.latestVersion)
  const latestUrl = useStore((s) => s.latestUrl)
  const cliPhase = useStore((s) => s.cliPhase)
  const cliLatest = useStore((s) => s.cliLatest)

  // App 更新监测针对 dsh-app 自身版本（GitHub Releases）
  const appCurrent = extractVersion(info?.appVersion)
  const hasNew = latest !== null && appCurrent !== null && isNewer(latest, appCurrent)
  const upToDate = latest !== null && appCurrent !== null && !isNewer(latest, appCurrent)

  // CLI 更新监测针对本地 dsh 版本（npm registry）
  const dshCurrent = extractVersion(info?.dshVersion)
  const cliHasNew = cliPhase === 'done' && cliLatest !== null && dshCurrent !== null && isNewer(cliLatest, dshCurrent)
  const cliUpToDate = cliPhase === 'done' && cliLatest !== null && dshCurrent !== null && !isNewer(cliLatest, dshCurrent)

  const copyCmd = async (): Promise<void> => {
    if (await copyText(NPM_CLI_UPDATE_CMD)) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }

  return (
    <div className="dsh-app-about">
      <h3>{t('dshApp.about.title')}</h3>
      <div className="rows">
        <div className="row">
          <span className="k">{t('dshApp.about.appVersion')}</span>
          <span className="v">v{info?.appVersion ?? t('dshApp.about.notAvailable')}</span>
        </div>
        <div className="row">
          <span className="k">{t('dshApp.about.repo')}</span>
          <span className="v">
            <a href={GITHUB_REPO} target="_blank" rel="noreferrer" className="dsh-app-link">
              {GITHUB_REPO}
            </a>
          </span>
        </div>
      </div>
      <div className="update">
        <button type="button" onClick={() => void checkUpdate()} disabled={phase === 'checking'}>
          {phase === 'checking' ? t('dshApp.update.checking') : t('dshApp.update.check')}
        </button>
        <span className={'hint' + (hasNew ? ' new' : '')}>
          {phase === 'done' && hasNew
            ? `${t('dshApp.update.new')}: v${latest}`
            : phase === 'done' && upToDate
              ? t('dshApp.update.latest')
              : phase === 'none'
                ? t('dshApp.update.none')
                : phase === 'error'
                  ? t('dshApp.update.error')
                  : ''}
        </span>
        {phase === 'done' && hasNew && (
          <a href={latestUrl ?? GITHUB_REPO + '/releases/latest'} target="_blank" rel="noreferrer" className="dsh-app-link">
            {t('dshApp.update.download')}
          </a>
        )}
      </div>

      <h3 className="sub">{t('dshApp.cli.title')}</h3>
      <div className="rows">
        <div className="row">
          <span className="k">{t('dshApp.cli.version')}</span>
          <span className="v">{dshCurrent ?? t('dshApp.about.notAvailable')}</span>
        </div>
        <div className="row">
          <span className="k">{t('dshApp.cli.source')}</span>
          <span className="v">{info?.dshSource ?? t('dshApp.about.notAvailable')}</span>
        </div>
        <div className="row">
          <span className="k">{t('dshApp.cli.serviceUrl')}</span>
          <span className="v">{info?.serviceUrl ?? t('dshApp.about.notAvailable')}</span>
        </div>
      </div>
      <div className="update">
        <button
          type="button"
          onClick={() => void checkCliUpdate()}
          disabled={cliPhase === 'checking' || cliPhase === 'updating'}
        >
          {cliPhase === 'checking' ? t('dshApp.cli.checking') : t('dshApp.cli.check')}
        </button>
        <span className={'hint' + (cliHasNew ? ' new' : '')}>
          {cliPhase === 'done' && cliHasNew
            ? `${t('dshApp.cli.new')}: v${cliLatest}`
            : cliPhase === 'done' && cliUpToDate
              ? t('dshApp.cli.latest')
              : cliPhase === 'updating'
                ? t('dshApp.cli.updating')
                : cliPhase === 'updated'
                  ? t('dshApp.cli.updated')
                  : cliPhase === 'failed'
                    ? t('dshApp.cli.failed')
                    : cliPhase === 'error'
                      ? t('dshApp.cli.error')
                      : ''}
        </span>
        {cliHasNew && info?.dshSource !== 'dsh_bin' && (
          <button type="button" onClick={() => void updateCli()} disabled={cliPhase === 'updating'}>
            {t('dshApp.cli.update')}
          </button>
        )}
        {cliHasNew && (
          <button type="button" onClick={() => void copyCmd()} className="dsh-app-link-btn">
            {copied ? t('dshApp.cli.copied') : t('dshApp.cli.copy')}
          </button>
        )}
      </div>
      {cliHasNew && info?.dshSource === 'dsh_bin' && (
        <div className="hint new">{t('dshApp.cli.dshBinHint')}</div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Desktop preferences section (P1: connect mode / autostart / notifications / shortcut)
// ---------------------------------------------------------------------------

/** 与 Rust 侧 connect::AppSettings 对应（serde tag="kind", content="url"）。 */
export interface DesktopSettings {
  connect: { kind: 'smart' } | { kind: 'explicit'; url: string }
  autostart: boolean
  notifications_enabled: boolean
  /** 仅窗口未聚焦时弹通知。 */
  notify_only_unfocused: boolean
  /** 需要确认（用户问题 / 权限请求）。 */
  notify_confirm: boolean
  /** 任务完成（回合结束）。 */
  notify_turn_complete: boolean
  /** 出错报警。 */
  notify_errors: boolean
  shortcut: string
}

interface DesktopSectionProps {
  useStore: <S>(sel: (s: AppSettingsState) => S) => S
  t: (key: string, params?: Record<string, unknown>) => string
  load: () => Promise<void>
  save: (next: DesktopSettings) => Promise<void>
}

const DESKTOP_CSS = `
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
`

function injectDesktopStyle(): void {
  if (document.getElementById('dsh-app-desktop-style')) return
  const style = document.createElement('style')
  style.id = 'dsh-app-desktop-style'
  style.textContent = DESKTOP_CSS
  document.head.appendChild(style)
}

interface DesktopSectionProps {
  useStore: <S>(sel: (s: AppSettingsState) => S) => S
  t: (key: string, params?: Record<string, unknown>) => string
  load: () => Promise<void>
  save: (next: DesktopSettings) => Promise<void>
}

function DesktopSection({ useStore, t, load, save }: DesktopSectionProps) {
  const settings = useStore((s) => s.settings)
  const loading = useStore((s) => s.loading)
  const saving = useStore((s) => s.saving)
  const saved = useStore((s) => s.saved)
  const error = useStore((s) => s.error)

  React.useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isExplicit = settings?.connect.kind === 'explicit'
  const [urlDraft, setUrlDraft] = React.useState<string>(isExplicit && settings?.connect.kind === 'explicit' ? settings.connect.url : '')
  const [shortcutDraft, setShortcutDraft] = React.useState<string>(settings?.shortcut ?? 'CmdOrCtrl+Shift+Space')
  const [testSending, setTestSending] = React.useState(false)
  const [testError, setTestError] = React.useState<string | null>(null)

  const sendTestNotification = async (): Promise<void> => {
    setTestSending(true)
    setTestError(null)
    try {
      // kind=test: Rust 侧绕过全部开关与失焦检查, 强制弹出（用于验证通知链路）。
      await tauriInvoke('desktop_notify', {
        kind: 'test',
        title: isZh() ? '测试通知' : 'Test notification',
        body: isZh() ? '桌面通知工作正常！' : 'Desktop notifications are working!',
        reply_id: null,
        session_id: null,
        question_id: null,
        choices: [],
        open_label: isZh() ? '打开 DSH' : 'Open DSH',
      })
    } catch (e) {
      // 失败原因（含系统通知授权状态）直接显示在按钮旁, 便于诊断。
      setTestError(String(e))
    }
    setTimeout(() => setTestSending(false), 1500)
  }

  React.useEffect(() => {
    if (!settings) return
    setUrlDraft(settings.connect.kind === 'explicit' ? settings.connect.url : '')
    setShortcutDraft(settings.shortcut)
  }, [settings])

  if (loading || !settings) {
    return (
      <div className="dsh-app-desktop">
        <h3>{t('dshApp.desktop.title')}</h3>
        <div className="hint">{t('dshApp.desktop.loading')}</div>
      </div>
    )
  }

  const buildNext = (): DesktopSettings => ({
    connect: isExplicit
      ? { kind: 'explicit', url: urlDraft.trim() }
      : { kind: 'smart' },
    autostart: settings.autostart,
    notifications_enabled: settings.notifications_enabled,
    notify_only_unfocused: settings.notify_only_unfocused,
    notify_confirm: settings.notify_confirm,
    notify_turn_complete: settings.notify_turn_complete,
    notify_errors: settings.notify_errors,
    shortcut: shortcutDraft.trim() || 'CmdOrCtrl+Shift+Space',
  })
  const patchAutostart = (autostart: boolean): DesktopSettings => ({ ...settings, autostart })
  const patchNotifications = (notifications_enabled: boolean): DesktopSettings => ({ ...settings, notifications_enabled })
  const patchOnlyUnfocused = (notify_only_unfocused: boolean): DesktopSettings => ({ ...settings, notify_only_unfocused })
  const patchConfirm = (notify_confirm: boolean): DesktopSettings => ({ ...settings, notify_confirm })
  const patchTurn = (notify_turn_complete: boolean): DesktopSettings => ({ ...settings, notify_turn_complete })
  const patchErrors = (notify_errors: boolean): DesktopSettings => ({ ...settings, notify_errors })
  const patchShortcut = (shortcut: string): DesktopSettings => ({ ...settings, shortcut })

  return (
    <div className="dsh-app-desktop">
      <h3>{t('dshApp.desktop.title')}</h3>

      <div className="rows">
        {/* 连接模式 */}
        <div className="row col">
          <span className="k">{t('dshApp.desktop.connect')}</span>
          <div className="opt">
            <input
              id="dsh-app-connect-smart"
              type="radio"
              name="dsh-app-connect"
              checked={!isExplicit}
              onChange={() => void save({ ...settings, connect: { kind: 'smart' } })}
            />
            <label htmlFor="dsh-app-connect-smart">{t('dshApp.desktop.smart')}</label>
            <input
              id="dsh-app-connect-explicit"
              type="radio"
              name="dsh-app-connect"
              checked={isExplicit}
              onChange={() => void save({ ...settings, connect: { kind: 'explicit', url: urlDraft.trim() } })}
            />
            <label htmlFor="dsh-app-connect-explicit">{t('dshApp.desktop.explicit')}</label>
          </div>
          <div className={'hint' + (isExplicit ? ' warn' : '')}>
            {isExplicit ? t('dshApp.desktop.remoteWarn') : t('dshApp.desktop.smartHint')}
          </div>
          {isExplicit && (
            <input
              type="text"
              value={urlDraft}
              placeholder="http://192.168.1.10:3080"
              spellCheck={false}
              onChange={(e) => setUrlDraft(e.target.value)}
              onBlur={() => void save({ ...settings, connect: { kind: 'explicit', url: urlDraft.trim() } })}
            />
          )}
        </div>

        {/* 开机自启 */}
        <div className="row">
          <span className="k">{t('dshApp.desktop.autostart')}</span>
          <div className="opt">
            <input
              id="dsh-app-autostart"
              type="checkbox"
              checked={settings.autostart}
              onChange={(e) => void save(patchAutostart(e.target.checked))}
            />
            <label htmlFor="dsh-app-autostart">{t('dshApp.desktop.autostartHint')}</label>
          </div>
        </div>

        {/* 桌面通知 */}
        <div className="row col">
          <span className="k">{t('dshApp.desktop.notifications')}</span>
          <div className="opt">
            <input
              id="dsh-app-notify"
              type="checkbox"
              checked={settings.notifications_enabled}
              onChange={(e) => void save(patchNotifications(e.target.checked))}
            />
            <label htmlFor="dsh-app-notify">{t('dshApp.desktop.notificationsHint')}</label>
          </div>
          <div className="sub">
            <div className="opt">
              <input
                id="dsh-app-notify-unfocused"
                type="checkbox"
                disabled={!settings.notifications_enabled}
                checked={settings.notify_only_unfocused}
                onChange={(e) => void save(patchOnlyUnfocused(e.target.checked))}
              />
              <label htmlFor="dsh-app-notify-unfocused">{t('dshApp.desktop.notifyOnlyUnfocused')}</label>
            </div>
            <div className="opt">
              <input
                id="dsh-app-notify-confirm"
                type="checkbox"
                disabled={!settings.notifications_enabled}
                checked={settings.notify_confirm}
                onChange={(e) => void save(patchConfirm(e.target.checked))}
              />
              <label htmlFor="dsh-app-notify-confirm">{t('dshApp.desktop.notifyConfirm')}</label>
              <span className="hint">{t('dshApp.desktop.notifyConfirmHint')}</span>
            </div>
            <div className="opt">
              <input
                id="dsh-app-notify-turn"
                type="checkbox"
                disabled={!settings.notifications_enabled}
                checked={settings.notify_turn_complete}
                onChange={(e) => void save(patchTurn(e.target.checked))}
              />
              <label htmlFor="dsh-app-notify-turn">{t('dshApp.desktop.notifyTurn')}</label>
              <span className="hint">{t('dshApp.desktop.notifyTurnHint')}</span>
            </div>
            <div className="opt">
              <input
                id="dsh-app-notify-errors"
                type="checkbox"
                disabled={!settings.notifications_enabled}
                checked={settings.notify_errors}
                onChange={(e) => void save(patchErrors(e.target.checked))}
              />
              <label htmlFor="dsh-app-notify-errors">{t('dshApp.desktop.notifyErrors')}</label>
              <span className="hint">{t('dshApp.desktop.notifyErrorsHint')}</span>
            </div>
            <div className="opt">
              <button
                type="button"
                className="dsh-app-test-btn"
                disabled={!settings.notifications_enabled || testSending}
                onClick={() => void sendTestNotification()}
              >
                {testSending ? t('dshApp.desktop.notifyTestSent') : t('dshApp.desktop.notifyTest')}
              </button>
              <span className="hint">{t('dshApp.desktop.notifyTestHint')}</span>
            </div>
            {testError && <div className="hint warn test-err">{testError}</div>}
          </div>
        </div>

        {/* 全局快捷键 */}
        <div className="row col">
          <span className="k">{t('dshApp.desktop.shortcut')}</span>
          <input
            type="text"
            value={shortcutDraft}
            spellCheck={false}
            onChange={(e) => setShortcutDraft(e.target.value)}
            onBlur={() => void save(patchShortcut(shortcutDraft.trim() || 'CmdOrCtrl+Shift+Space'))}
          />
        </div>
      </div>

      <div className="save-row">
        <button type="button" disabled={saving} onClick={() => void save(buildNext())}>
          {saving ? t('dshApp.desktop.saving') : t('dshApp.desktop.save')}
        </button>
        {saved && <span className="ok">{t('dshApp.desktop.saved')}</span>}
        {error && <span className="err">{t('dshApp.desktop.error')}: {error}</span>}
      </div>
    </div>
  )
}

// Locale dictionaries (namespace 'dsh-app', zh source of truth).
const zh = {
  'dshApp.about.title': '关于 DSH App',
  'dshApp.about.appVersion': 'DSH App 版本',
  'dshApp.about.repo': '开源地址',
  'dshApp.about.notAvailable': '未检测到',
  'dshApp.update.check': '检查更新',
  'dshApp.update.checking': '正在检查…',
  'dshApp.update.latest': '已是最新版本',
  'dshApp.update.new': '发现新版本',
  'dshApp.update.download': '前往下载',
  'dshApp.update.none': '暂无已发布版本',
  'dshApp.update.error': '检查失败，请检查网络后重试',
  'dshApp.cli.title': 'dsh CLI',
  'dshApp.cli.version': 'CLI 版本',
  'dshApp.cli.source': 'CLI 来源',
  'dshApp.cli.serviceUrl': '服务地址',
  'dshApp.cli.check': '检查 CLI 更新',
  'dshApp.cli.checking': '正在检查…',
  'dshApp.cli.latest': 'CLI 已是最新',
  'dshApp.cli.new': '发现新版本',
  'dshApp.cli.update': '一键更新',
  'dshApp.cli.updating': '正在更新…',
  'dshApp.cli.updated': '更新完成，重启应用后生效',
  'dshApp.cli.failed': '更新未完成，请复制命令手动执行',
  'dshApp.cli.copy': '复制更新命令',
  'dshApp.cli.copied': '已复制',
  'dshApp.cli.dshBinHint': 'CLI 由 DSH_BIN 指定，请在终端手动更新',
  'dshApp.cli.error': '检查失败，请检查网络后重试',
  'dshApp.desktop.title': '桌面设置',
  'dshApp.desktop.loading': '正在读取设置…',
  'dshApp.desktop.connect': '连接模式',
  'dshApp.desktop.smart': '智能模式（自动探测/自启）',
  'dshApp.desktop.explicit': '显式连接',
  'dshApp.desktop.smartHint': '优先复用本机 3080 带桌面桥的实例，否则自动拉起 dsh web。',
  'dshApp.desktop.remoteWarn': '连接远程/容器实例：仅限可信网络，建议使用 HTTPS。',
  'dshApp.desktop.url': '服务地址',
  'dshApp.desktop.autostart': '开机自启',
  'dshApp.desktop.autostartHint': '登录后静默启动（驻留托盘，不弹窗）',
  'dshApp.desktop.notifications': '桌面通知',
  'dshApp.desktop.notificationsHint': '回合完成 / 权限请求 / 服务事件',
  'dshApp.desktop.notifyOnlyUnfocused': '仅窗口未聚焦时通知',
  'dshApp.desktop.notifyConfirm': '需要确认',
  'dshApp.desktop.notifyConfirmHint': '用户问题 / 权限请求（通知卡片带选项按钮）',
  'dshApp.desktop.notifyTurn': '任务完成',
  'dshApp.desktop.notifyTurnHint': 'Agent 回合结束',
  'dshApp.desktop.notifyErrors': '出错报警',
  'dshApp.desktop.notifyErrorsHint': '运行错误 / 服务退出',
  'dshApp.desktop.notifyTest': '发送测试通知',
  'dshApp.desktop.notifyTestSent': '已发送',
  'dshApp.desktop.notifyTestHint': '立即弹一条测试通知，验证系统通知链路',
  'dshApp.desktop.shortcut': '全局快捷键',
  'dshApp.desktop.save': '保存',
  'dshApp.desktop.saving': '保存中…',
  'dshApp.desktop.saved': '已保存',
  'dshApp.desktop.error': '保存失败',
}
const en = {
  'dshApp.about.title': 'About DSH App',
  'dshApp.about.appVersion': 'DSH App version',
  'dshApp.about.repo': 'Source code',
  'dshApp.about.notAvailable': 'Not detected',
  'dshApp.update.check': 'Check for updates',
  'dshApp.update.checking': 'Checking…',
  'dshApp.update.latest': 'Up to date',
  'dshApp.update.new': 'New version available',
  'dshApp.update.download': 'Download',
  'dshApp.update.none': 'No releases published yet',
  'dshApp.update.error': 'Check failed — verify your network and retry',
  'dshApp.cli.title': 'dsh CLI',
  'dshApp.cli.version': 'CLI version',
  'dshApp.cli.source': 'CLI source',
  'dshApp.cli.serviceUrl': 'Service URL',
  'dshApp.cli.check': 'Check CLI update',
  'dshApp.cli.checking': 'Checking…',
  'dshApp.cli.latest': 'CLI is up to date',
  'dshApp.cli.new': 'New version available',
  'dshApp.cli.update': 'Update',
  'dshApp.cli.updating': 'Updating…',
  'dshApp.cli.updated': 'Updated — restart the app to take effect',
  'dshApp.cli.failed': 'Update did not complete — copy the command and run it manually',
  'dshApp.cli.copy': 'Copy command',
  'dshApp.cli.copied': 'Copied',
  'dshApp.cli.dshBinHint': 'CLI is pinned by DSH_BIN — update it manually in your terminal',
  'dshApp.cli.error': 'Check failed — verify your network and retry',
  'dshApp.desktop.title': 'Desktop',
  'dshApp.desktop.loading': 'Loading settings…',
  'dshApp.desktop.connect': 'Connect mode',
  'dshApp.desktop.smart': 'Smart (auto-detect / auto-start)',
  'dshApp.desktop.explicit': 'Explicit URL',
  'dshApp.desktop.smartHint': 'Reuses a local bridged instance on port 3080 when available, otherwise starts dsh web automatically.',
  'dshApp.desktop.remoteWarn': 'Remote / container instances: trusted network only — HTTPS recommended.',
  'dshApp.desktop.url': 'Service URL',
  'dshApp.desktop.autostart': 'Launch at login',
  'dshApp.desktop.autostartHint': 'Start silently after login (tray only, no window)',
  'dshApp.desktop.notifications': 'Desktop notifications',
  'dshApp.desktop.notificationsHint': 'Turn completion / permission requests / service events',
  'dshApp.desktop.notifyOnlyUnfocused': 'Only when the window is unfocused',
  'dshApp.desktop.notifyConfirm': 'Needs confirmation',
  'dshApp.desktop.notifyConfirmHint': 'User questions / permission requests (with option buttons on the card)',
  'dshApp.desktop.notifyTurn': 'Task complete',
  'dshApp.desktop.notifyTurnHint': 'Agent turn finished',
  'dshApp.desktop.notifyErrors': 'Errors',
  'dshApp.desktop.notifyErrorsHint': 'Runtime errors / service exited',
  'dshApp.desktop.notifyTest': 'Send test notification',
  'dshApp.desktop.notifyTestSent': 'Sent',
  'dshApp.desktop.notifyTestHint': 'Fire a test notification now to verify the system notification chain',
  'dshApp.desktop.shortcut': 'Global shortcut',
  'dshApp.desktop.save': 'Save',
  'dshApp.desktop.saving': 'Saving…',
  'dshApp.desktop.saved': 'Saved',
  'dshApp.desktop.error': 'Save failed',
}

// ---------------------------------------------------------------------------
// Desktop notification bridge: official event streams → desktop_notify
// ---------------------------------------------------------------------------

/**
 * 官方事件流（P1-design.md §1 的 events.mux / events.host 路径）→ 桌面通知。
 * 监听两个 WebSocket 下行流, 把"需要确认 / 任务完成 / 出错报警"三类事件通过
 * `desktop_notify` 命令交给 Rust 侧（开关 + 失焦检查都在 Rust 做, 前端只上报）。
 * 仅在 Tauri 壳内启动（window.__TAURI_INTERNALS__ 存在）, 纯浏览器不建连。
 */

interface QuestionFrameItem {
  id: string
  question: string
  detail?: string
  header?: string
  options?: Array<{ label: string; description?: string }>
  multiSelect?: boolean
}

function truncateText(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max)}…` : s
}

function startNotificationBridge(): void {
  const internals = window.__TAURI_INTERNALS__
  if (!internals) return
  const host = window.location.host
  if (!host) return

  const invokeNotify = (payload: Record<string, unknown>): void => {
    internals.invoke('desktop_notify', payload).catch(() => {
      /* 通知失败不打扰 UI */
    })
  }

  const zh = isZh()
  const openLabel = zh ? '打开 DSH' : 'Open DSH'
  const none = { reply_id: null, session_id: null, question_id: null, choices: [] as string[] }

  // 去重 / 冷却: 同一确认请求只通知一次; 错误与回合完成做最小冷却合并。
  const seenQuestions = new Set<string>()
  const seenApprovals = new Set<string>()
  const sessionRunning = new Map<string, boolean>()
  let lastTurnAt = 0
  let lastErrorAt = 0

  const connect = (path: string, onFrame: (env: { rpcId?: string; payload?: unknown }) => void): void => {
    const open = (): void => {
      let sock: WebSocket
      try {
        sock = new WebSocket(`ws://${host}${path}`)
      } catch {
        setTimeout(open, 5000)
        return
      }
      sock.onmessage = (ev) => {
        try {
          onFrame(JSON.parse(ev.data as string) as { rpcId?: string; payload?: unknown })
        } catch {
          /* 忽略无法解析的帧 */
        }
      }
      sock.onclose = () => setTimeout(open, 5000)
      sock.onerror = () => {
        try {
          sock.close()
        } catch {
          /* ignore */
        }
      }
    }
    open()
  }

  // mux 流: 用户问题 / 权限请求 / 流错误
  connect('/api/events.mux', (env) => {
    const frame = env.payload as
      | { type: 'question/requested'; sessionId: string; questions: QuestionFrameItem[] }
      | { type: 'approval/requested'; approvalId: string; toolName: string; reason?: string }
      | { type: 'stream/error'; error: { message?: string } }
      | undefined
    if (!frame) return

    switch (frame.type) {
      case 'question/requested': {
        const rpcId = env.rpcId
        if (!rpcId || seenQuestions.has(rpcId)) return
        seenQuestions.add(rpcId)
        const qs = frame.questions ?? []
        // 单问题 + 单选 + 选项 ≤ 3 → 通知卡片直接带选项按钮（macOS）;
        // 其余情况只给"打开 DSH"按钮, 用户在窗口里确认。
        const q = qs.length === 1 ? qs[0] : undefined
        const options = q?.options ?? []
        const choices =
          q && !q.multiSelect && options.length > 0 && options.length <= 3
            ? options.map((o) => o.label)
            : []
        invokeNotify({
          kind: 'confirm',
          title: zh ? '需要你的确认' : 'Confirmation needed',
          body: q ? truncateText(q.question, 160) : zh ? '有新的确认请求' : 'New confirmation request',
          reply_id: rpcId,
          session_id: frame.sessionId,
          question_id: q ? q.id : null,
          choices,
          open_label: openLabel,
        })
        break
      }
      case 'approval/requested': {
        if (seenApprovals.has(frame.approvalId)) return
        seenApprovals.add(frame.approvalId)
        invokeNotify({
          kind: 'confirm',
          title: zh ? '权限请求' : 'Permission request',
          body: frame.reason
            ? `${frame.toolName} — ${truncateText(frame.reason, 120)}`
            : frame.toolName,
          ...none,
          open_label: openLabel,
        })
        break
      }
      case 'stream/error': {
        const now = Date.now()
        if (now - lastErrorAt < 10_000) return
        lastErrorAt = now
        invokeNotify({
          kind: 'error',
          title: zh ? '出错报警' : 'Error alert',
          body: truncateText(frame.error?.message ?? 'stream error', 160),
          ...none,
          open_label: openLabel,
        })
        break
      }
    }
  })

  // host 流: 会话运行状态（回合完成） / agent 错误
  connect('/api/events.host', (env) => {
    const frame = env.payload as
      | { type: 'host/session-status'; sessionId: string; running: boolean }
      | { type: 'host/agent-error'; sessionId: string; message: string }
      | undefined
    if (!frame) return

    switch (frame.type) {
      case 'host/session-status': {
        const prev = sessionRunning.get(frame.sessionId) ?? false
        sessionRunning.set(frame.sessionId, frame.running)
        // 仅在 true → false 转换时通知（一轮结束）; 基线帧/重复帧忽略。
        if (prev && !frame.running) {
          const now = Date.now()
          if (now - lastTurnAt < 5_000) return // 多个会话同时结束 → 合并成一条
          lastTurnAt = now
          invokeNotify({
            kind: 'turn_complete',
            title: zh ? '任务完成' : 'Task complete',
            body: zh ? 'Agent 回合已完成，点击查看结果。' : 'Agent turn finished — click to view the result.',
            ...none,
            open_label: openLabel,
          })
        }
        break
      }
      case 'host/agent-error': {
        const now = Date.now()
        if (now - lastErrorAt < 10_000) return
        lastErrorAt = now
        invokeNotify({
          kind: 'error',
          title: zh ? '出错报警' : 'Error alert',
          body: truncateText(frame.message ?? 'agent error', 160),
          ...none,
          open_label: openLabel,
        })
        break
      }
    }
  })

  console.log('[dsh-app-bridge] notification bridge: listening on events.mux / events.host')
}

// ---------------------------------------------------------------------------
// Plugin entry
// ---------------------------------------------------------------------------

export function apply(ctx: ClientContext): void {
  // 1) Fused title bar.
  mountTitleBar()

  // 共享 store（状态行与「App 设置」页同一实例）: 更新检测结果 + 应用信息。
  const store = createAppSettingsStore()
  let bound: BoundActions<typeof store> | undefined
  let currentInfo: AppInfoSnapshot | null = null
  let currentDesktop: DesktopSettings | null = null
  let startupChecked = false

  const refreshInfo = async (): Promise<void> => {
    const internals = window.__TAURI_INTERNALS__
    if (!internals) return
    try {
      const info = (await internals.invoke('app_info', {})) as AppInfoSnapshot
      currentInfo = info
      bound?.adoptInfo(info)
    } catch {
      /* shell IPC unavailable — the rows stay "not detected" */
    }
  }

  // --- 更新检测 / 更新动作（「App 设置」页与左下角状态卡共用） ---

  /** 检查 dsh-app 自身更新（GitHub Releases 最新 tag 与本地版本对比）。 */
  const runAppCheck = async (actions: BoundActions<typeof store>): Promise<void> => {
    actions.setUpdatePhase('checking')
    try {
      const res = await fetch(GITHUB_LATEST_API, {
        cache: 'no-store',
        headers: { accept: 'application/vnd.github+json' },
      })
      if (res.status === 404) {
        // 仓库还没有发布任何 release
        actions.setLatest(null, null)
        actions.setUpdatePhase('none')
        return
      }
      if (!res.ok) throw new Error(`github api ${res.status}`)
      const data = (await res.json()) as { tag_name?: string; html_url?: string }
      actions.setLatest(extractVersion(data.tag_name), data.html_url ?? null)
      actions.setUpdatePhase('done')
    } catch {
      actions.setUpdatePhase('error')
    }
  }

  /** 检查 dsh CLI 更新（npm registry, 镜像回退）。 */
  const runCliCheck = async (actions: BoundActions<typeof store>): Promise<void> => {
    actions.setCliPhase('checking')
    try {
      const latest = await fetchNpmLatest()
      actions.setCliLatest(latest)
      actions.setCliPhase('done')
    } catch {
      actions.setCliPhase('error')
    }
  }

  /** 一键更新 dsh CLI（install_dsh + 轮询版本变化确认）。 */
  const runCliUpdate = async (actions: BoundActions<typeof store>): Promise<void> => {
    actions.setCliPhase('updating')
    const before = extractVersion(currentInfo?.dshVersion)
    try {
      await tauriInvoke('install_dsh', { lang: navigator.language })
    } catch {
      actions.setCliPhase('failed')
      return
    }
    // install_dsh 在后台线程执行: 轮询 app_info 直到本地 CLI 版本变化或超时。
    const deadline = Date.now() + 90_000
    for (;;) {
      await new Promise((resolve) => setTimeout(resolve, 2000))
      await refreshInfo()
      const after = extractVersion(currentInfo?.dshVersion)
      if (after !== null && after !== before) {
        actions.setCliPhase('updated')
        return
      }
      if (Date.now() > deadline) {
        actions.setCliPhase('failed')
        return
      }
    }
  }

  // 2) 侧栏底部状态行（footer.action 槽, 设置按钮上移一行, 状态沉底）:
  //    每次启动自动检测 App / CLI 更新, 有新版本时在左下角浮出更新卡片。
  injectStatusStyle()
  ctx.slots.inject('sidebar.footer.action', () =>
    ctx.slots.register(
      {
        name: 'sidebar.footer.action',
        id: 'dsh-app-status',
        order: 100,
        store,
        inject: (actions) => {
          bound = actions
          void refreshInfo()
          return {
            startupCheck: async () => {
              if (startupChecked) return
              startupChecked = true
              try {
                await refreshInfo()
              } catch {
                /* 拿不到版本信息就跳过本次检测 */
              }
              await Promise.all([runAppCheck(actions), runCliCheck(actions)])
            },
            updateCli: () => runCliUpdate(actions),
            dismissPrompt: (v: boolean) => actions.dismissPrompt(v),
          }
        },
      },
      StatusFooterItem,
    ),
  )

  // 3) 「App 设置」页（official settings.section slot）:
  //    关于/更新 + 桌面偏好合并为单一设置区块。
  injectAboutStyle()
  injectDesktopStyle()
  ctx.effect(() => ctx.locale.register('dsh-app', { zh, en }), 'dsh-app-bridge: about dictionaries')

  const injected = (actions: BoundActions<typeof store>): {
    checkUpdate: () => Promise<void>
    checkCliUpdate: () => Promise<void>
    updateCli: () => Promise<void>
    load: () => Promise<void>
    save: (next: DesktopSettings) => Promise<void>
  } => {
    bound = actions
    void refreshInfo()
    return {
      checkUpdate: () => runAppCheck(actions),
      checkCliUpdate: () => runCliCheck(actions),
      updateCli: () => runCliUpdate(actions),
      // --- 桌面偏好 ---
      load: async () => {
        bound?.setLoading(true)
        try {
          const s = await tauriInvoke<DesktopSettings>('get_settings')
          currentDesktop = s
          bound?.adopt(s)
        } catch (e) {
          bound?.setError(String(e))
          bound?.setLoading(false)
        }
      },
      save: async (next: DesktopSettings) => {
        bound?.setSaving(true)
        bound?.setSaved(false)
        bound?.setError(null)
        // 连接目标变化时, 保存成功后立即重连到新目标（"校验可达后保存并导航"）。
        const targetChanged =
          currentDesktop !== null &&
          JSON.stringify(currentDesktop.connect) !== JSON.stringify(next.connect)
        try {
          await tauriInvoke('save_settings', { settings: next })
          currentDesktop = next
          bound?.adopt(next)
          bound?.setSaved(true)
          if (targetChanged) {
            try {
              await tauriInvoke('dsh_connect')
            } catch {
              /* 导航失败由 dsh_connect 的错误态兜底 */
            }
          }
        } catch (e) {
          bound?.setError(String(e))
        } finally {
          bound?.setSaving(false)
        }
      },
    }
  }

  // 组合组件: 关于/更新 + 桌面偏好, 共用一个 store 的 useStore。
  const AppSettingsSection = ({
    useStore,
    t,
    checkUpdate,
    checkCliUpdate,
    updateCli,
    load,
    save,
  }: {
    useStore: <S>(sel: (s: AppSettingsState) => S) => S
    t: (key: string, params?: Record<string, unknown>) => string
    checkUpdate: () => Promise<void>
    checkCliUpdate: () => Promise<void>
    updateCli: () => Promise<void>
    load: () => Promise<void>
    save: (next: DesktopSettings) => Promise<void>
  }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <AboutSection
        useStore={useStore}
        t={t}
        checkUpdate={checkUpdate}
        checkCliUpdate={checkCliUpdate}
        updateCli={updateCli}
      />
      <DesktopSection useStore={useStore} t={t} load={load} save={save} />
    </div>
  )

  ctx.slots.inject('settings.section', () =>
    ctx.slots.register(
      {
        name: 'settings.section',
        id: 'dsh-app',
        order: 100,
        label: () => (isZh() ? 'App 设置' : 'App Settings'),
        store,
        locale: 'dsh-app',
        inject: injected,
      },
      AppSettingsSection,
    ),
  )

  // 4) 桌面通知桥: 官方事件流 → desktop_notify（仅 Tauri 壳内生效）。
  startNotificationBridge()

  console.log('[dsh-app-bridge] client loaded: fused title bar + App settings page + startup update prompt + notification bridge')
}
