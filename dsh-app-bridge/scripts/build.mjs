/**
 * dsh-app-bridge build: compiles server + client halves.
 *
 * Client bundle contract (from @deepseek-ai/dsh-client-modules):
 *   window.__ModuleLoader__.load({
 *     id: "<package-name>",
 *     factory: (require) => { var module = { exports: {} }; ...; return module.exports }
 *   })
 *
 * esbuild produces a plain CJS script; we wrap that script body inside the
 * factory so the loader-injected `require` resolves any externals and the
 * wrapper's `module` / `exports` locals carry the plugin's exports.
 *
 * Externals (React + the @deepseek-ai/* client packages) are resolved by the
 * shell module table: `defineStore` comes from dsh-client-runtime, JSX from
 * the seeded react/jsx-runtime. Same shape as the official ui-theme bundle.
 *
 * Server bundle: plain ESM (dsh web runs Node; resolved via package exports).
 * Only a type-only cordis import, so nothing needs bundling.
 */
import { build } from "esbuild";
import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const libDir = root + "lib";
if (!existsSync(libDir)) mkdirSync(libDir, { recursive: true });

const PKG_ID = "dsh-app-bridge";

// ---- client bundle ---------------------------------------------------------
await build({
  entryPoints: ["src/client/index.tsx"],
  outfile: libDir + "/client.raw.js",
  bundle: true,
  format: "cjs",
  platform: "browser",
  target: "es2020",
  jsx: "automatic",
  external: ["react", "react-dom", "@deepseek-ai/*"],
  define: { "process.env.NODE_ENV": '"production"' },
  logLevel: "info",
});

const raw = readFileSync(libDir + "/client.raw.js", "utf8");

const wrapped = `window.__ModuleLoader__.load({
\tid: ${JSON.stringify(PKG_ID)},
\tfactory: (require) => {
\t\tvar module = { exports: {} };
\t\tvar exports = module.exports;
${raw}
\t\treturn module.exports;
\t}
});
`;
writeFileSync(libDir + "/client.js", wrapped);
console.log("client bundle OK (" + wrapped.length + " bytes, wrapped)");

// Sanity: externals must resolve through the shell module table only.
const requires = raw.match(/require\("[^"]+"\)/g) ?? [];
const allowed = (spec) =>
  spec === "react" ||
  spec === "react-dom" ||
  spec.startsWith("react/") || // react/jsx-runtime etc. — shell seeds
  spec.startsWith("@deepseek-ai/");
const bad = requires.filter((r) => !allowed(r.slice(9, -1)));
if (bad.length > 0) {
  console.error("client bundle has unexpected requires:", bad);
  process.exit(1);
}
console.log("external requires:", requires.length ? requires.join(", ") : "none");

// ---- server bundle ---------------------------------------------------------
await build({
  entryPoints: ["src/server.ts"],
  outfile: "lib/server.js",
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node20",
  define: { "process.env.NODE_ENV": '"production"' },
  logLevel: "info",
});
console.log("server bundle OK");
writeFileSync(libDir + "/.built", new Date().toISOString());
