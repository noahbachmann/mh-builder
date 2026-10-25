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
        codeSplitting: {
          groups: [
            // lazy, own chunks: Monsters page, crafting materials; both use items
            { name: 'monster-data', test: /src[\\/]data[\\/]monsters\.json/, priority: 2 },
            { name: 'crafting-data', test: /src[\\/]data[\\/]crafting\.json/, priority: 2 },
            { name: 'item-data', test: /src[\\/]data[\\/]items\.json/, priority: 2 },
            { name: 'data', test: /src[\\/]data[\\/].*\.json/ },
            // ~300 tiny lazy SVG components: one request instead of one each
            { name: 'icons', test: /src[\\/]assets[\\/]icons[\\/]/ },
          ],
        },
      },
    },
    // data chunk is ~2.1 MB raw / ~185 kB gzip by design (bowgun ammo configs: ~0.2 MB raw)
    chunkSizeWarningLimit: 2200,
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
  },
})
