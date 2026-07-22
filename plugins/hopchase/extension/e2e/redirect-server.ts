import http from 'node:http'
import type { AddressInfo } from 'node:net'

export interface RedirectServer {
  port: number
  url: string
  close: () => Promise<void>
}

/**
 * Serves the redirect shapes the specs need:
 *   /chain/a → 301 → /chain/b → 302 → /chain/c (200, canonical elsewhere)
 *   /loop/1 ⇄ /loop/2 (302 loop)
 *   /meta → 200 with a 0s meta refresh to /final
 *   /js   → 200 with location.replace('/final')
 *   /final → 200
 */
export async function startRedirectServer(): Promise<RedirectServer> {
  const server = http.createServer((req, res) => {
    const redirect = (status: number, location: string) => {
      res.writeHead(status, { location })
      res.end()
    }
    const html = (body: string) => {
      res.writeHead(200, { 'content-type': 'text/html' })
      res.end(`<!doctype html><html><head>${body}</head><body>ok</body></html>`)
    }
    switch (req.url) {
      case '/chain/a':
        return redirect(301, '/chain/b')
      case '/chain/b':
        return redirect(302, '/chain/c')
      case '/chain/c':
        return html('<title>Landed</title><link rel="canonical" href="/canonical-target">')
      case '/loop/1':
        return redirect(302, '/loop/2')
      case '/loop/2':
        return redirect(302, '/loop/1')
      case '/meta':
        return html('<title>Meta</title><meta http-equiv="refresh" content="0;url=/final">')
      case '/js':
        return html('<title>Js</title><script>location.replace("/final")</script>')
      case '/final':
        return html('<title>Final</title>')
      default:
        res.writeHead(404)
        return res.end()
    }
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo
  return {
    port,
    url: `http://127.0.0.1:${port}/`,
    close: () =>
      new Promise((resolve, reject) => {
        // Chromium holds keep-alive sockets; close() alone would wait on them.
        server.closeAllConnections()
        server.close((error) => (error ? reject(error) : resolve()))
      }),
  }
}
