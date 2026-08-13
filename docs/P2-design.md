# P2 设计：设置融合 + 菜单栏融合（DSH 官方 Web UI 内嵌桌面能力）

## 目标

把 dsh-app 的桌面能力（自启/通知/快捷键/连接模式）融合进**官方 Web UI**：

1. **设置融合**：官方"设置"页出现独立的"dsh-app"区块，与官方设置同风格、同交互
2. **菜单栏融合**：官方侧边栏/顶栏出现 dsh-app 入口（连接状态指示 + 快速开关），不再需要独立窗口菜单

## 架构：官方插件注入 + HTTP 桥

```
┌───────────────────── dsh-app (Tauri/Rust 壳) ─────────────────────┐
│  spawn `dsh web --patch ./dsh-app-bridge/cordis.patch.yml --port 0`│
│          │                                                         │
│          ▼                                                         │
│  dsh web 服务端 (Node)                                             │
│   └─ 加载 dsh-app-bridge 插件 (cordis)                             │
│        ├─ server 端 apply(ctx):                                    │
│        │   • ctx.settings.register('dshApp', schema)               │
│        │     → 官方设置页自动出现 "dsh-app" 命名空间表单            │
│        │   • 提供本地 HTTP API: http://127.0.0.1:<port>/dsh-app/   │
│        │     (自启/通知/快捷键 读写)                                │
│        └─ client 端 (浏览器 bundle):                               │
│             • dsh.client 声明 → /plugins/dsh-app-bridge/client.js  │
│             • apply(ctx) → ctx.slots.register('settings.section')  │
│               → 官方设置页导航区出现 "dsh-app" 区块                 │
│             • ctx.slots.register('sidebar.*')                      │
│               → 官方侧边栏出现 dsh-app 入口                        │
│                                                                     │
│  Rust 侧:                                                           │
│   • spawn 时带 --patch 注入插件                                     │
│   • 本地 HTTP 服务 (dsh-app-shell-api) 供插件回调:                  │
│     GET  /api/settings  → Rust 读取当前设置                         │
│     POST /api/settings  → Rust 应用设置 (自启/通知/快捷键)          │
└─────────────────────────────────────────────────────────────────────┘
```

## 数据流（双向）

**Web UI → 桌面壳**（设置生效）：
用户改设置 → client 组件 → `ctx.settings.update('dshApp', patch)`
→ server 端监听 `settings/updated` → HTTP POST → Rust 执行
（开机自启注册 / 通知开关 / 快捷键注册）

**桌面壳 → Web UI**（状态展示）：
Rust 状态变化（如托盘点击）→ HTTP → server 端 emit 事件
→ client 端订阅 → UI 更新连接状态徽标

## 关键机制（源码确认）

| 机制 | 位置 | 用法 |
|---|---|---|
| 插件注入 | `dsh web --patch <yml>` | patch 里 `insert` 本地插件 |
| settings 注册 | `ctx.settings.register(ns, schema)` | 官方设置页自动渲染命名空间表单 |
| client bundle | package.json `dsh.client` + `exports["./client"]` | 浏览器端插件，经 `/plugins/<id>/client.js` 注入 |
| slots 注册 | `ctx.slots.register({name:'settings.section',...}, Comp)` | 官方设置页新增区块 |
| 侧边栏插槽 | `sidebar.*`（ui-sidebar 声明） | 官方侧边栏新增入口 |

## 交付物

- `dsh-app-bridge/` — cordis 插件包（server + client 双端）
  - `package.json`（dsh.bundle + dsh.client 声明）
  - `cordis.patch.yml`（插入插件行）
  - `src/server.ts`（settings 注册 + HTTP 回调）
  - `src/client/*.tsx`（设置区块组件 + 侧边栏入口）
  - 构建产物 `lib/`
- Rust 侧：spawn 时注入 patch + 提供本地 HTTP API
- 验证：`dsh web --patch` 手动起服务 → 浏览器看设置页出现"dsh-app"区块

## 风险与注意

- 本地插件 client bundle 需要构建（`pnpm build` 或直接提供构建产物）
- `dsh.client` 扫描按 entry name 解析 package.json —— 本地插件需要可被 `require.resolve`
- 客户端 bundle 的 `dsh.client.inject` 需要声明依赖的 client 服务（slots/locale/runtime）
- 官方 Web UI 升级不破坏我们的 slots 注册（接缝稳定：settings.section 等是公开契约）
