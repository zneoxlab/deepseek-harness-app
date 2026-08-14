// src/server.ts
var name = "dsh-app-bridge";
var inject = ["webServer", "settings"];
var MODELS_NS = "llm-pi-ai";
function deriveKeyRef(provider) {
  return `${provider.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}_API_KEY`;
}
var preset = (route, displayName) => ({ route, displayName });
var MODEL_PRESETS = [
  // 模型厂商 (model developers)
  preset("deepseek", "DeepSeek"),
  preset("openai", "OpenAI"),
  preset("anthropic", "Anthropic"),
  preset("google", "Google Gemini"),
  preset("xai", "xAI"),
  preset("moonshotai-cn", "Moonshot / Kimi"),
  preset("minimax-cn", "MiniMax"),
  preset("zai-coding-cn", "\u667A\u8C31 GLM"),
  preset("mistral", "Mistral AI"),
  // 模型聚合平台 (aggregators)
  preset("openrouter", "OpenRouter"),
  // 推理服务平台 (inference platforms)
  preset("groq", "Groq"),
  preset("together", "Together AI")
];
async function writeModelPresetsOnce(ctx) {
  let modelsNs;
  for (let attempt = 0; attempt < 20 && modelsNs === void 0; attempt++) {
    modelsNs = ctx.settings.describe().find((entry) => entry.ns === MODELS_NS);
    if (modelsNs === void 0) await new Promise((resolve) => setTimeout(resolve, 250));
  }
  if (modelsNs === void 0) return;
  const user = modelsNs.user;
  if (typeof user === "object" && user !== null && Object.prototype.hasOwnProperty.call(user, "providers")) {
    return;
  }
  await ctx.settings.mutate(
    MODELS_NS,
    MODEL_PRESETS.map((preset2) => ({
      op: "set",
      path: ["providers", preset2.route],
      value: { displayName: preset2.displayName, apiKeyEnv: deriveKeyRef(preset2.route) }
    }))
  );
  console.log(
    `[dsh-app-bridge] model presets: pre-configured ${MODEL_PRESETS.length} mainstream channels into ${MODELS_NS} \u2014 fill API keys under Settings \u2192 Models`
  );
}
function apply(ctx) {
  ctx.webServer.register({
    kind: "route",
    path: "/dsh-app/status",
    handler: (_req, res) => {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true, plugin: name }));
    }
  });
  void writeModelPresetsOnce(ctx).catch((error) => {
    console.log(
      "[dsh-app-bridge] model presets pre-write failed \u2014 official Settings \u2192 Models remains fully usable",
      error
    );
  });
  console.log("[dsh-app-bridge] loaded (title bar bridge marker + first-run model presets)");
}
export {
  MODEL_PRESETS,
  apply,
  inject,
  name
};
