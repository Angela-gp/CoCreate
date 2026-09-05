import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export const viteOptions = {
  configFile: false,
  base: './',
  plugins: [
    react(),
    nodePolyfills({
      include: ['buffer', 'process'],
      globals: { Buffer: true, global: true, process: true },
    }),
  ],
  build: { target: 'es2020', chunkSizeWarningLimit: 1600 },
}
