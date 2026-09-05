import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [react(), nodePolyfills({ include: ['buffer', 'process'], globals: { Buffer: true, global: true, process: true } })],
  server: { port: 5273, strictPort: false },
  build: { target: 'es2020', chunkSizeWarningLimit: 1600 },
})
