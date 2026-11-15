import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Относительные пути: статика из dist/ встаёт на любой хостинг, в том числе в подпапку.
  base: './',
  build: {
    // Phaser сам по себе ~1.2 МБ — это нормально для игры, не предупреждаем.
    chunkSizeWarningLimit: 1600,
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
