// 极简 i18n：根据本机语言（navigator.language）自适应中英文。
// 规则：zh* → 中文，其余 → English。

export type Lang = "zh" | "en";

let cached: Lang | null = null;

export function detectLang(): Lang {
  if (cached) return cached;
  const raw = (typeof navigator !== "undefined" ? navigator.language : "") || "";
  cached = raw.toLowerCase().startsWith("zh") ? "zh" : "en";
  return cached;
}

/** 根据当前语言取文案。 */
export function t(zh: string, en: string): string {
  return detectLang() === "zh" ? zh : en;
}

/** 语言切换（测试/预览用，也可用于设置面板）。 */
export function setLangForTest(lang: Lang) {
  cached = lang;
}

// ---------------------------------------------------------------------------
// 错误码本地化：Rust 侧返回 `[CODE] english message`，前端按语言翻译 CODE，
// 未知 CODE 或无法解析时回退显示原文。
// ---------------------------------------------------------------------------

/** 已知错误码的中英文案表。 */
const ERROR_MESSAGES: Record<string, { zh: string; en: string }> = {
  DSH_NOT_FOUND: {
    zh: "未找到 dsh CLI。请先安装：npm install -g @deepseek-ai/dsh，或设置 DSH_BIN 指向 dsh 可执行文件。",
    en: "The dsh CLI was not found. Install it with `npm install -g @deepseek-ai/dsh` or set DSH_BIN to point at a dsh executable.",
  },
  SPAWN_FAILED: {
    zh: "启动 dsh web 失败。请检查 dsh 安装是否完整，或设置 DSH_BIN 指向正确的可执行文件。",
    en: "Failed to start dsh web. Check your dsh installation, or point DSH_BIN at a working executable.",
  },
  CONNECT_TIMEOUT: {
    zh: "等待 dsh web 就绪超时（30 秒）。请检查 dsh 是否能正常运行。",
    en: "Timed out waiting for dsh web to be ready (30s). Check that dsh can run normally.",
  },
  CONNECT_IO: {
    zh: "无法连接到 DeepSeek Harness Web UI。请检查网络与端口占用。",
    en: "Cannot reach the DeepSeek Harness web UI. Check your network and port availability.",
  },
  MOCK_NO_SERVER: {
    zh: "（模拟模式 DSH_APP_MOCK=no-server）已强制模拟自启失败。",
    en: "(Mock mode DSH_APP_MOCK=no-server) Spawn failure simulated on purpose.",
  },
  MOCK_MISSING_CLI: {
    zh: "（模拟模式 DSH_APP_MOCK=missing-cli）已强制模拟未安装 dsh CLI。",
    en: "(Mock mode DSH_APP_MOCK=missing-cli) Missing CLI simulated on purpose.",
  },
  NODE_TOO_OLD: {
    zh: "Node 版本过低：dsh 需要 node:zlib 的 zstd 支持（Node ≥ v22.15.0）。请在引导页点击「升级 Node」。",
    en: "Node is too old: dsh needs node:zlib zstd support (Node ≥ v22.15.0). Click “Upgrade Node” on the setup page.",
  },
};

/** 解析 `[CODE] message` 格式，返回错误码；无法解析返回 null。 */
export function parseErrorCode(raw: string): string | null {
  const m = /^\[([A-Z_]+)\]/.exec(raw.trim());
  return m ? m[1] : null;
}

/** 把 Rust 侧错误字符串本地化。 */
export function localizeError(raw: string): string {
  const code = parseErrorCode(raw);
  if (code && ERROR_MESSAGES[code]) {
    return ERROR_MESSAGES[code][detectLang()];
  }
  return raw;
}
