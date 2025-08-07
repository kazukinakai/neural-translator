/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/setup-tests.ts'],
    globals: true,
    css: true,
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 5000,
    reporters: ['verbose'],
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    retry: 1,
    isolate: true,
    // React 19 compatibility
    environmentOptions: {
      jsdom: {
        resources: 'usable'
      }
    }
  },
})