import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    strictPort: true
  },
  build: {
    target: 'es2022'
  },
  ssr: {
    resolve: {
      // Match Node's ESM resolution for React Router's conditional exports.
      externalConditions: ['node', 'module-sync']
    }
  }
});
