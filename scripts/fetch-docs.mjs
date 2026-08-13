// Fetch DSH docs via raw.githubusercontent.com (Node fetch works where git doesn't).
async function main() {
  const files = process.argv.slice(2);
  for (const f of files) {
    try {
      const url = "https://raw.githubusercontent.com/deepseek-ai/deepseek-harness/master/" + f;
      const res = await fetch(url, { headers: { "User-Agent": "dsh-check" } });
      if (!res.ok) {
        console.log("=== " + f + " === HTTP " + res.status);
        continue;
      }
      const t = await res.text();
      console.log("=== " + f + " (" + t.length + " chars) ===");
      const start = Number(process.env.DOC_SKIP || 0);
      const len = Number(process.env.DOC_LEN || 4500);
      console.log(t.slice(start, start + len));
      console.log("\n---END---\n");
    } catch (e) {
      console.log("=== " + f + " === ERR " + e.message);
    }
  }
}
main();
