/**
 * dsh-app-bridge — server half.
 *
 * Two jobs:
 *
 * 1. Mark the instance: the desktop shell probes GET /dsh-app/status to decide
 *    whether a running dsh web on 127.0.0.1:3080 carries the desktop bridge
 *    (and therefore has the fused title bar) or is a plain user-started web.
 *
 * 2. Fuse the model pre-configuration INTO the original model configuration:
 *    on the first boot of the `dsh-app` profile — i.e. while the official
 *    `llm-pi-ai` settings namespace still has NO user-configured provider at
 *    all — pre-write the mainstream model channels (DeepSeek / OpenAI /
 *    Anthropic / Google Gemini / OpenRouter / xAI / Moonshot / MiniMax /
 *    Zhipu GLM / Mistral / Groq / Together) into it, through the exact same
 *    `settings.mutate` path the official "设置 → 模型" page uses when you add a
 *    provider. The channels then show up there as already-configured routes
 *    with their built-in model catalogs enabled; the user only fills the API
 *    key, entirely inside the official page. No separate settings UI.
 *
 *    Safety:
 *      - Only ever runs on a virgin model configuration: the moment the user
 *        layer carries a `providers` key — even an empty one, which is what
 *        the official delete flow leaves behind — pre-writes stop forever, so
 *        channels the user removed are never re-added, and a user who already
 *        configured any provider (in any profile, the settings document is
 *        home-level) keeps their config untouched.
 *      - Goes through the official settings seam, so the write lands in the
 *        same `$DSH_HOME/settings.yaml` document the Models page writes, with
 *        full schema validation and revision handling.
 */

import type { Context } from '@deepseek-ai/cordis'

export const name = 'dsh-app-bridge'

export const inject = ['webServer', 'settings']

/** The official settings namespace that holds the model configuration. */
const MODELS_NS = 'llm-pi-ai'

/** Mirror of the official Models page `deriveKeyRef` (e.g. `MOONSHOTAI_CN_API_KEY`). */
function deriveKeyRef(provider: string): string {
  return `${provider.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}_API_KEY`
}

interface ModelPreset {
  /** Provider route id in the llm-pi-ai configurable-provider directory. */
  route: string
  /** Friendly display name written into the profile. */
  displayName: string
}

const preset = (route: string, displayName: string): ModelPreset => ({ route, displayName })

/**
 * Mainstream channels pre-configured into the original model configuration.
 * Every route ships in the pi-ai built-in catalog (verified `auth.apiKey`),
 * so a `{ displayName, apiKeyEnv }` profile is enough — models resolve from
 * the catalog automatically, same list as the dsh-desktop onboarding.
 */
export const MODEL_PRESETS: ModelPreset[] = [
  // 模型厂商 (model developers)
  preset('deepseek', 'DeepSeek'),
  preset('openai', 'OpenAI'),
  preset('anthropic', 'Anthropic'),
  preset('google', 'Google Gemini'),
  preset('xai', 'xAI'),
  preset('moonshotai-cn', 'Moonshot / Kimi'),
  preset('minimax-cn', 'MiniMax'),
  preset('zai-coding-cn', '智谱 GLM'),
  preset('mistral', 'Mistral AI'),
  // 模型聚合平台 (aggregators)
  preset('openrouter', 'OpenRouter'),
  // 推理服务平台 (inference platforms)
  preset('groq', 'Groq'),
  preset('together', 'Together AI'),
]

/**
 * First-run model pre-configuration. No-op once the llm-pi-ai user layer
 * carries a `providers` key (configured by us on the first boot or by the
 * user through the official page — either way the presets are done for good)
 * or when the llm-pi-ai adapter is absent.
 *
 * The loader applies tree entries concurrently, so the llm-pi-ai namespace
 * may not be registered yet when this plugin applies — poll briefly until it
 * appears before judging the virgin state.
 */
async function writeModelPresetsOnce(ctx: Context): Promise<void> {
  let modelsNs: { ns: string; user?: unknown } | undefined
  for (let attempt = 0; attempt < 20 && modelsNs === undefined; attempt++) {
    modelsNs = ctx.settings.describe().find((entry) => entry.ns === MODELS_NS)
    if (modelsNs === undefined) await new Promise((resolve) => setTimeout(resolve, 250))
  }
  // Adapter absent (llm-pi-ai never loaded) — nothing to pre-configure.
  if (modelsNs === undefined) return
  const user = modelsNs.user
  // User layer already has a providers key (even an empty dict after the user
  // deleted every channel through the official page) — never touch it again.
  if (typeof user === 'object' && user !== null && Object.prototype.hasOwnProperty.call(user, 'providers')) {
    return
  }

  await ctx.settings.mutate(
    MODELS_NS,
    MODEL_PRESETS.map((preset) => ({
      op: 'set' as const,
      path: ['providers', preset.route],
      value: { displayName: preset.displayName, apiKeyEnv: deriveKeyRef(preset.route) },
    })),
  )
  console.log(
    `[dsh-app-bridge] model presets: pre-configured ${MODEL_PRESETS.length} mainstream channels into ${MODELS_NS} — fill API keys under Settings → Models`,
  )
}

export function apply(ctx: Context): void {
  ctx.webServer.register({
    kind: 'route',
    path: '/dsh-app/status',
    handler: (_req, res) => {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ ok: true, plugin: name }))
    },
  })

  void writeModelPresetsOnce(ctx).catch((error: unknown) => {
    console.log(
      '[dsh-app-bridge] model presets pre-write failed — official Settings → Models remains fully usable',
      error,
    )
  })

  console.log('[dsh-app-bridge] loaded (title bar bridge marker + first-run model presets)')
}
