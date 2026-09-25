import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setup.js'],
    env: {
      VITE_API_BASE_URL: 'http://localhost:5000/api',
    },
    server: {
      deps: {
        inline: ['axios'],
      },
    },
  },
});
