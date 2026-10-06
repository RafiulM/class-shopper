import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const fromRoot = (path: string) => resolve(import.meta.dirname, path)

// Extension pages + background service worker. The content script is built
// separately (vite.content.config.ts) because it must be a classic script.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fromRoot('src'),
    },
  },
  build: {
    rolldownOptions: {
      input: {
        sidepanel: fromRoot('src/sidepanel/index.html'),
        options: fromRoot('src/options/index.html'),
        welcome: fromRoot('src/welcome/index.html'),
        background: fromRoot('src/background/index.ts'),
      },
      output: {
        // manifest.json points at background.js, so its name must stay stable.
        entryFileNames: (chunk) => (chunk.name === 'background' ? 'background.js' : 'assets/[name]-[hash].js'),
      },
    },
  },
})
