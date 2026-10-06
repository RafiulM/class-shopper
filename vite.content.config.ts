import { resolve } from 'node:path'
import { defineConfig } from 'vite'

const fromRoot = (path: string) => resolve(import.meta.dirname, path)

// Content scripts cannot use ES module imports, so this bundles one IIFE file.
export default defineConfig({
  resolve: {
    alias: {
      '@': fromRoot('src'),
    },
  },
  build: {
    emptyOutDir: false,
    copyPublicDir: false,
    lib: {
      entry: fromRoot('src/content/main.ts'),
      formats: ['iife'],
      name: 'JevContent',
      fileName: () => 'content.js',
    },
  },
})
