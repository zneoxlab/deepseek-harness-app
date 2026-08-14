# 模型预配置（Model Presets）：融合进原始模型配置，不新增界面

## 目标与取舍

把主流模型渠道的**预配置**做进**原始模型配置**（官方 `llm-pi-ai` 模型适配器
持有的设置命名空间，即官方「设置 → 模型」页操作的同一份配置），但**不新增任何
独立设置界面**：

- 官方「设置 → 模型」页的「添加提供方」下拉本来就已经列出全部 pi-ai 内置
  渠道（OpenAI / Anthropic / Gemini / DeepSeek / …），单独再做一个
  「模型预配置」页面只会把用户从原生的添加/填 Key 流程里拽出去 —— 交互割裂。
- 因此预配置下沉到**插件服务端**：`dsh-app` profile **首次启动**时，直接把
  12 个主流渠道的 profile 写入 `llm-pi-ai` 命名空间。之后用户打开官方
  「设置 → 模型」，这些渠道就是**已经配置好的行**，点开只差粘贴 API Key；
  模型目录由 pi-ai 内置目录自动启用，无需手填 baseURL / models。
- 写入走官方服务端设置 seam（`ctx.settings.mutate`，与官方 Models 页保存时
  同一条路径），落在同一份 `$DSH_HOME/settings.yaml` 文档，带完整 schema
  校验与 revision 处理。

参考：[dataelement/dsh-desktop](https://github.com/dataelement/dsh-desktop)
（用 patch-package 改官方 bundle 实现首启渠道选择 + 可搜索提供方网格）。本项目
**不 patch 官方包**：借鉴的是「预配置哪些渠道、什么顺序」的清单，而实现方式
沿用「关于我们」插件的插件机制 —— 这里是 `ctx.settings` 服务端 seam。

## 为什么能这样写：原始模型配置的真相

官方 `dsh` 的模型配置不在某个被锁死的文件里，而是一个**设置命名空间**：

- `llm-pi-ai` 适配器插件（`dsh-llm-pi-ai`，dsh-base bundle 默认加载）注册了
  设置命名空间 `llm-pi-ai`，schema 为 `{ providers: { [route]: profile } }`
- 每个 `profile` 只要写了 `{ displayName, apiKeyEnv }`，加上 pi-ai 内置的
  提供方目录（`@earendil-works/pi-ai/providers/all`），该渠道的**模型列表
  就从内置目录自动解析**，无需手填 baseURL / models
- 官方「设置 → 模型」页（`ui-settings-models`）渲染的正是 `llm.providers`
  目录 + `settings.describe` 命名空间 + `credentials.describe` 的 join；
  用户在该页添加渠道、填 Key 时执行的就是：

  ```ts
  settings.mutate({ ns: 'llm-pi-ai', ops: [{ op: 'set',
    path: ['providers', route], value: { displayName, apiKeyEnv } }] })
  credentials.set({ ref: apiKeyEnv, value })
  ```

所以「预配置」= 插件在首次启动时用**同一套写入**把这些渠道的 profile 先写好，
把「填 Key」这一步留给用户在官方页完成。

## 实现（dsh-app-bridge 插件服务端，`src/server.ts`）

`apply()` 里 `void writeModelPresetsOnce(ctx)`（失败仅记日志，不影响官方页）：

| 环节 | 做法 |
|---|---|
| 写入时机 | 轮询 `ctx.settings.describe()` 直到 `llm-pi-ai` 命名空间出现（loader 并发应用条目，llm-pi-ai 可能在我们的 apply 之后才注册；最多等 20 × 250ms），随后一次性 `settings.mutate` 写入 |
| 首启判定 | **只有**当 `llm-pi-ai` 用户层完全没有 `providers` 键时才写（全新配置）。一旦存在 —— 哪怕是我们自己写的、或用户删光后官方页留下的空 `providers: {}` —— 永不再写 |
| 渠道清单 | 12 个主流渠道（与 dsh-desktop 首启列表一致）：模型厂商 deepseek / openai / anthropic / google / xai / moonshotai-cn / minimax-cn / zai-coding-cn / mistral，聚合平台 openrouter，推理平台 groq / together；全部在 pi-ai 内置目录（已逐一验证 `auth.apiKey`） |
| 写入内容 | `providers/{route}` = `{ displayName, apiKeyEnv: deriveKeyRef(route) }`，`deriveKeyRef` 与官方 Models 页完全一致（如 `MOONSHOTAI_CN_API_KEY`） |
| 运行时不依赖 | 服务端 bundle 不 import 任何 `@deepseek-ai/*` 运行时包（loader 按 realpath 解析 symlink 插件，`profiles/node_modules` 回退目录够不到），只用注入的 `ctx.settings` 服务 + 纯字符串命名空间 |

## 为什么安全

- 不 patch 任何官方 bundle；只调用公开的 `ctx.settings` 服务端 seam，与官方
  Models 页同路径同校验
- 只**首启一次性**预写，且只在用户层**完全没有**任何 providers 时进行 ——
  用户已配置过任何渠道（含删除后留下的空 `providers: {}`）就永久跳过，
  删除的渠道**永远不会复活**，用户自定义的 baseURL / models 永远不会被覆盖
- 写入的是 home 级 `$DSH_HOME/settings.yaml`（与官方 Models 页同一份文档），
  通过官方 seam 持久化，随时可在官方页增删改

## 验证（headless）

1. `cd dsh-app-bridge && node scripts/build.mjs`（server bundle 无运行时
   `@deepseek-ai` import）
2. 建临时 `DSH_HOME` + 最小 profile（bundles: dsh-base, dsh-web-app,
   dsh-app-bridge；`node_modules/dsh-app-bridge` 链接到本仓库），
   `DSH_HOME=… dsh --profile <name> --port 0` 启动
3. 首次启动：日志出现 `model presets: pre-configured 12 mainstream channels`，
   `$DSH_HOME/settings.yaml` 写入 `llm-pi-ai.providers` 12 条
   `{ displayName, apiKeyEnv }`
4. 二次启动：`settings.yaml` mtime 不变（幂等，不重写）
5. 若 `settings.yaml` 已有任何 providers（比如官方页配过一条），预写整体跳过
6. 应用内：官方「设置 → 模型」应列出这 12 个渠道（已配置状态），点开填
   Key 即可；对话模型下拉直接可见这些渠道的内置模型
