import { createReadStream, existsSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, resolve } from 'node:path'

const root = resolve('dist')
const port = Number(process.env.PORT ?? 3002)
const types = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
}

createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname)
  const requested = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '')
  let file = resolve(join(root, requested))

  if (!file.startsWith(root) || !existsSync(file)) file = join(root, 'index.html')
  response.setHeader('Content-Type', types[extname(file)] ?? 'application/octet-stream')
  createReadStream(file).pipe(response)
}).listen(port, '127.0.0.1', () => {
  console.log(`Local: http://localhost:${port}/`)
})
