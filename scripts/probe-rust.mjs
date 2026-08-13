// Probe rust-lang dist server reachability and fetch stable toolchain info.
async function main() {
  const url = "https://static.rust-lang.org/dist/channel-rust-stable.toml";
  const res = await fetch(url, { headers: { "User-Agent": "dsh-check" } });
  console.log("status:", res.status);
  const text = await res.text();
  console.log("len:", text.length);
  const m = text.match(/\[pkg\.rust\][\s\S]*?version = "([^"]+)"/);
  console.log("stable version:", m ? m[1] : "not found");

  // Find the windows-msvc x86_64 target line
  const targetRe = /\[pkg\.rust\.target\.x86_64-pc-windows-msvc\][\s\S]*?url = "([^"]+)"/;
  const tm = text.match(targetRe);
  console.log("win x86_64 msvc url:", tm ? tm[1] : "not found");
}

main().catch((e) => {
  console.log("ERR:", e.message);
  process.exit(1);
});
