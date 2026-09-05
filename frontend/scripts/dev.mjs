import { createServer } from 'vite'
import { viteOptions } from './vite-options.mjs'

const server = await createServer({
  ...viteOptions,
  server: { port: 3000, strictPort: false },
})

await server.listen()
server.printUrls()
