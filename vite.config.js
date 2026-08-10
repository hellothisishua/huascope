import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/',
  define: {
    'import.meta.env.VITE_TMDB_KEY': JSON.stringify('02c952df054afb8ca11440a0f84b080a'),
  },
});
