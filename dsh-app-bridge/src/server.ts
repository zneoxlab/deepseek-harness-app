/**
 * dsh-app-bridge — server half.
 *
 * Loaded by the `dsh-app` profile's bundle layer. Its only job is to mark
 * the instance: the desktop shell probes GET /dsh-app/status to decide
 * whether a running dsh web on 127.0.0.1:3080 carries the desktop bridge
 * (and therefore has the fused title bar) or is a plain user-started web.
 */

import type { Context } from '@deepseek-ai/cordis'

export const name = 'dsh-app-bridge'

export const inject = ['webServer']

export function apply(ctx: Context): void {
  ctx.webServer.register({
    kind: 'route',
    path: '/dsh-app/status',
    handler: (_req, res) => {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ ok: true, plugin: name }))
    },
  })

  console.log('[dsh-app-bridge] loaded (title bar bridge marker)')
}
