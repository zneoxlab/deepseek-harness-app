// Download the local dsh web favicon for use as the app icon.
const fs = await import("node:fs");
const url = process.argv[2];
const out = process.argv[3];
const res = await fetch(url, { headers: { "User-Agent": "dsh-check" } });
if (!res.ok) {
  console.error("HTTP", res.status);
  process.exit(1);
}
const text = await res.text();
fs.writeFileSync(out, text, "utf8");
console.log("saved", out, text.length, "bytes");
console.log("first 300 chars:", text.slice(0, 300));
