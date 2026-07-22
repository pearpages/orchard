import http from 'node:http'
import type { AddressInfo } from 'node:net'

export interface EchoServer {
  port: number
  url: string
  close: () => Promise<void>
}

/** Echoes the request headers back as a JSON body and sets a canned x-canary response header. */
export async function startEchoServer(): Promise<EchoServer> {
  const server = http.createServer((req, res) => {
    res.setHeader('x-canary', 'original')
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify(req.headers))
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
