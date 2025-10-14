import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5000,
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Disable minification to reduce resource usage
    minify: false,
    rollupOptions: {
      output: {
        // Disable code splitting to reduce complexity
        manualChunks: undefined,
      },
      // Reduce parallelization
      maxParallelFileOps: 1,
    },
    // Reduce memory usage
    chunkSizeWarningLimit: 2000,
    sourcemap: false,
  },
});
