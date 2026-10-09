/// <reference types="vitest/config" />
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // relative base: works on GitHub Pages subpaths and plain VPS roots
  base: './',
  plugins: [vue()],
  build: {
    rolldownOptions: {
      output: {
        // game data changes rarely: own chunk so app updates don't bust its cache
        codeSplitting: { groups: [{ name: 'data', test: /src[\\/]data[\\/].*\.json/ }] },
      },
    },
    // data chunk is ~1.8 MB raw / ~145 kB gzip by design
    chunkSizeWarningLimit: 2000,
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
  },
})
