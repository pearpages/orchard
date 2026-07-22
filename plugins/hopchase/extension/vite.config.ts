/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.config'

export default defineConfig({
  // crx() is skipped under Vitest: it needs a full extension build context
  plugins: process.env.VITEST ? [react()] : [react(), crx({ manifest })],
  server: {
    port: 5174,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
