// src/server.ts
var name = "dsh-app-bridge";
var inject = ["webServer"];
function apply(ctx) {
  ctx.webServer.register({
    kind: "route",
    path: "/dsh-app/status",
    handler: (_req, res) => {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true, plugin: name }));
    }
  });
  console.log("[dsh-app-bridge] loaded (title bar bridge marker)");
}
export {
  apply,
  inject,
  name
};
