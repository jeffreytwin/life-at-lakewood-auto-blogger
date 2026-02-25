import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/life-at-lakewood-auto-blogger/',
  plugins: [react()],
  server: {
    open: true,
  },
});
