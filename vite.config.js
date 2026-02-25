import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: '/life-at-lakewood-auto-blogger/',
  plugins: [react(), tailwindcss()],
  server: {
    open: true,
  },
});
