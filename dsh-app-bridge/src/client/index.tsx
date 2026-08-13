/**
 * dsh-app-bridge — client half.
 *
 * Injected into the official Web UI as a client bundle
 * (`/plugins/dsh-app-bridge/client.js`). Two jobs:
 *
 * 1. Fused title bar — the desktop shell window is borderless
 *    (`decorations: false`), so the Windows minimize / maximize / close
 *    buttons, the drag area and a live connection dot live inside the Web UI.
 *    Injected only when the page runs inside the Tauri shell
 *    (`window.__TAURI_INTERNALS__` exists); a plain browser keeps its native
 *    title bar. Layout: the bar lives IN the document flow (36px) and the
 *    official `#root` shrinks to `calc(100vh - 36px)`. Theme: colors follow
 *    the official `data-ds-dark-theme` body attribute via CSS.
 *
 * 2. "DSH App" settings page — registered into the official settings panel
 *    through the standard `settings.section` slot (same pattern as the
 *    official ui-theme Appearance feature): about info (app version, dsh CLI
 *    version/source, service URL) plus a dsh CLI update check against the
 *    npm registry.
 */

import { defineStore } from '@deepseek-ai/dsh-client-runtime/client'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type { BoundActions } from '@deepseek-ai/dsh-client-ui-slots'
import * as React from 'react'

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
// Title bar (borderless shell window)
// ---------------------------------------------------------------------------

function tauriInvoke(cmd: string): void {
  const internals = window.__TAURI_INTERNALS__
  if (!internals) return
  internals.invoke(cmd, {}).catch(() => {})
}

const TITLEBAR_HEIGHT = 36

const STYLE_CSS = `
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
`

function injectStyle(): void {
  if (document.getElementById('dsh-app-tb-style')) return
  const style = document.createElement('style')
  style.id = 'dsh-app-tb-style'
  style.textContent = STYLE_CSS
  document.head.appendChild(style)
}

function mountTitleBar(): void {
  if (document.getElementById('dsh-app-titlebar')) return
  // 浏览器环境（非桌面壳）: 保留原生标题栏
  if (!window.__TAURI_INTERNALS__) return

  injectStyle()

  const bar = document.createElement('div')
  bar.id = 'dsh-app-titlebar'
  bar.setAttribute('data-tauri-drag-region', '')

  const logo = document.createElement('img')
  logo.src = '/favicon.svg'
  logo.alt = ''
  logo.draggable = false
  logo.style.cssText = 'width:16px;height:16px;margin:0 8px 0 12px;'

  const title = document.createElement('span')
  title.textContent = 'DeepSeek Harness'
  title.className = 'dsh-tb-title'

  const makeBtn = (titleAttr: string, svg: string, cls: string): HTMLButtonElement => {
    const btn = document.createElement('button')
    btn.title = titleAttr
    btn.className = cls
    btn.innerHTML = svg
    return btn
  }

  const minBtn = makeBtn(
    '最小化',
    '<svg width="10" height="10" viewBox="0 0 10 10"><line x1="0" y1="5" x2="10" y2="5" stroke="currentColor" stroke-width="1"/></svg>',
    'dsh-tb-btn',
  )
  minBtn.addEventListener('click', () => tauriInvoke('window_minimize'))

  const maxBtn = makeBtn(
    '最大化 / 还原',
    '<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><rect x="0.5" y="0.5" width="9" height="9" stroke="currentColor" stroke-width="1"/></svg>',
    'dsh-tb-btn',
  )
  maxBtn.addEventListener('click', () => tauriInvoke('window_toggle_maximize'))

  const closeBtn = makeBtn(
    '关闭',
    '<svg width="10" height="10" viewBox="0 0 10 10"><line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" stroke-width="1"/><line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" stroke-width="1"/></svg>',
    'dsh-tb-btn dsh-tb-close',
  )
  closeBtn.addEventListener('click', () => tauriInvoke('window_close'))

  // 连接状态（探测 bridge server 端的 /dsh-app/status，5 秒轮询）
  const status = document.createElement('span')
  status.className = 'dsh-tb-status'
  const dot = document.createElement('span')
  dot.style.cssText =
    'width:7px;height:7px;border-radius:50%;background:#9ca3af;flex:none;transition:background 0.2s;'
  const statusLabel = document.createElement('span')
  statusLabel.textContent = '检测中…'
  status.append(dot, statusLabel)

  const updateStatus = async (): Promise<void> => {
    try {
      const res = await fetch('/dsh-app/status', { cache: 'no-store' })
      const data: { ok?: boolean } | null = res.ok ? await res.json().catch(() => null) : null
      if (res.ok && data && data.ok === true) {
        dot.style.background = '#22c55e'
        statusLabel.textContent = '已连接'
        return
      }
      throw new Error('bridge not ok')
    } catch {
      dot.style.background = '#ef4444'
      statusLabel.textContent = '未连接'
    }
  }
  void updateStatus()
  setInterval(() => void updateStatus(), 5000)

  bar.append(logo, title, status, minBtn, maxBtn, closeBtn)

  // 拖拽（mousedown 在非按钮区域时启动窗口拖动）与双击最大化
  bar.addEventListener('mousedown', (e) => {
    const target = e.target as HTMLElement
    if (target.closest('button')) return
    if (e.button === 0) tauriInvoke('window_start_dragging')
  })
  bar.addEventListener('dblclick', (e) => {
    const target = e.target as HTMLElement
    if (target.closest('button')) return
    tauriInvoke('window_toggle_maximize')
  })

  // 标题栏置于文档流顶部（占位 36px），#root 由注入 CSS 收缩
  const root = document.getElementById('root')
  if (root) {
    document.body.insertBefore(bar, root)
  } else {
    document.body.prepend(bar)
  }
}

// ---------------------------------------------------------------------------
// DSH App settings page (about + update check)
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

interface AboutState {
  info: AppInfoSnapshot | null
  updatePhase: 'idle' | 'checking' | 'done' | 'error' | 'none'
  latestVersion: string | null
  latestUrl: string | null
}

const createAboutStore = () =>
  defineStore<AboutState, {
    adoptInfo(d: AboutState, info: AppInfoSnapshot): void
    setUpdatePhase(d: AboutState, phase: AboutState['updatePhase']): void
    setLatest(d: AboutState, v: string | null, url: string | null): void
  }>({
    init: () => ({ info: null, updatePhase: 'idle', latestVersion: null, latestUrl: null }),
    actions: {
      adoptInfo(d, info) { d.info = info },
      setUpdatePhase(d, phase) { d.updatePhase = phase },
      setLatest(d, v, url) { d.latestVersion = v; d.latestUrl = url },
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

const ABOUT_CSS = `
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
`

function injectAboutStyle(): void {
  if (document.getElementById('dsh-app-about-style')) return
  const style = document.createElement('style')
  style.id = 'dsh-app-about-style'
  style.textContent = ABOUT_CSS
  document.head.appendChild(style)
}

interface AboutSectionProps {
  useStore: <S>(sel: (s: AboutState) => S) => S
  t: (key: string, params?: Record<string, unknown>) => string
  checkUpdate: () => Promise<void>
}

function AboutSection({ useStore, t, checkUpdate }: AboutSectionProps) {
  const info = useStore((s) => s.info)
  const phase = useStore((s) => s.updatePhase)
  const latest = useStore((s) => s.latestVersion)
  const latestUrl = useStore((s) => s.latestUrl)

  const dshCurrent = extractVersion(info?.dshVersion)
  // 更新监测针对 dsh-app 自身版本（GitHub Releases）
  const appCurrent = extractVersion(info?.appVersion)
  const hasNew = latest !== null && appCurrent !== null && isNewer(latest, appCurrent)
  const upToDate = latest !== null && appCurrent !== null && !isNewer(latest, appCurrent)

  return (
    <div className="dsh-app-about">
      <h3>{t('dshApp.about.title')}</h3>
      <div className="rows">
        <div className="row">
          <span className="k">{t('dshApp.about.appVersion')}</span>
          <span className="v">v{info?.appVersion ?? t('dshApp.about.notAvailable')}</span>
        </div>
        <div className="row">
          <span className="k">{t('dshApp.about.dshVersion')}</span>
          <span className="v">{dshCurrent ?? t('dshApp.about.notAvailable')}</span>
        </div>
        <div className="row">
          <span className="k">{t('dshApp.about.dshSource')}</span>
          <span className="v">{info?.dshSource ?? t('dshApp.about.notAvailable')}</span>
        </div>
        <div className="row">
          <span className="k">{t('dshApp.about.serviceUrl')}</span>
          <span className="v">{info?.serviceUrl ?? t('dshApp.about.notAvailable')}</span>
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
    </div>
  )
}

// Locale dictionaries (namespace 'dsh-app', zh source of truth).
const zh = {
  'dshApp.about.title': '关于 DSH App',
  'dshApp.about.appVersion': 'DSH App 版本',
  'dshApp.about.dshVersion': 'dsh CLI 版本',
  'dshApp.about.dshSource': 'CLI 来源',
  'dshApp.about.serviceUrl': '服务地址',
  'dshApp.about.repo': '开源地址',
  'dshApp.about.notAvailable': '未检测到',
  'dshApp.update.check': '检查更新',
  'dshApp.update.checking': '正在检查…',
  'dshApp.update.latest': '已是最新版本',
  'dshApp.update.new': '发现新版本',
  'dshApp.update.download': '前往下载',
  'dshApp.update.none': '暂无已发布版本',
  'dshApp.update.error': '检查失败，请检查网络后重试',
}
const en = {
  'dshApp.about.title': 'About DSH App',
  'dshApp.about.appVersion': 'DSH App version',
  'dshApp.about.dshVersion': 'dsh CLI version',
  'dshApp.about.dshSource': 'CLI source',
  'dshApp.about.serviceUrl': 'Service URL',
  'dshApp.about.repo': 'Source code',
  'dshApp.about.notAvailable': 'Not detected',
  'dshApp.update.check': 'Check for updates',
  'dshApp.update.checking': 'Checking…',
  'dshApp.update.latest': 'Up to date',
  'dshApp.update.new': 'New version available',
  'dshApp.update.download': 'Download',
  'dshApp.update.none': 'No releases published yet',
  'dshApp.update.error': 'Check failed — verify your network and retry',
}

// ---------------------------------------------------------------------------
// Plugin entry
// ---------------------------------------------------------------------------

export function apply(ctx: ClientContext): void {
  // 1) Fused title bar.
  mountTitleBar()

  // 2) DSH App settings page (official settings.section slot).
  injectAboutStyle()
  ctx.effect(() => ctx.locale.register('dsh-app', { zh, en }), 'dsh-app-bridge: about dictionaries')

  const store = createAboutStore()
  let bound: BoundActions<typeof store> | undefined

  const refreshInfo = async (): Promise<void> => {
    const internals = window.__TAURI_INTERNALS__
    if (!internals) return
    try {
      const info = (await internals.invoke('app_info', {})) as AppInfoSnapshot
      bound?.adoptInfo(info)
    } catch {
      /* shell IPC unavailable — the rows stay "not detected" */
    }
  }

  const injected = (actions: BoundActions<typeof store>): { checkUpdate: () => Promise<void> } => {
    bound = actions
    void refreshInfo()
    return {
      checkUpdate: async () => {
        bound?.setUpdatePhase('checking')
        try {
          // GitHub Releases 更新源：最新 release 的 tag_name 与本地版本对比。
          const res = await fetch(GITHUB_LATEST_API, {
            cache: 'no-store',
            headers: { accept: 'application/vnd.github+json' },
          })
          if (res.status === 404) {
            // 仓库还没有发布任何 release
            bound?.setLatest(null, null)
            bound?.setUpdatePhase('none')
            return
          }
          if (!res.ok) throw new Error(`github api ${res.status}`)
          const data = (await res.json()) as { tag_name?: string; html_url?: string }
          bound?.setLatest(extractVersion(data.tag_name), data.html_url ?? null)
          bound?.setUpdatePhase('done')
        } catch {
          bound?.setUpdatePhase('error')
        }
      },
    }
  }

  ctx.slots.inject('settings.section', () =>
    ctx.slots.register(
      {
        name: 'settings.section',
        id: 'dsh-app',
        order: 100,
        label: () => 'DSH App',
        store,
        locale: 'dsh-app',
        inject: injected,
      },
      AboutSection,
    ),
  )

  console.log('[dsh-app-bridge] client loaded: title bar + DSH App settings page')
}
