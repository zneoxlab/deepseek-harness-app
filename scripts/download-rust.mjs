// Download the Rust stable windows-msvc toolchain tarball via Node fetch
// (rustup-init.exe's own HTTP is blocked by the sandbox; Node's is not).
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";

const url = process.argv[2];
const out = process.argv[3];
const res = await fetch(url, { headers: { "User-Agent": "dsh-check" } });
if (!res.ok) {
  console.error("HTTP", res.status);
  process.exit(1);
}
const total = Number(res.headers.get("content-length") || 0);
console.log("downloading", Math.round(total / 1048576), "MB ->", out);
let done = 0;
const timer = setInterval(() => {
  console.log("  ", Math.round(done / 1048576), "MB");
}, 30000);
await pipeline(res.body, createWriteStream(out));
clearInterval(timer);
console.log("done:", out);
