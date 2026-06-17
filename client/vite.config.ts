import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5175,
    strictPort: true,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3015',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Raise the warning threshold to reflect app-code-only bundle (vendor chunks are now split)
    // The remaining ~672 KB index chunk is app routes/pages — requires React.lazy() for further splitting
    chunkSizeWarningLimit: 700,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              // React core runtime — smallest, highest priority
              name: 'vendor-react',
              test: /node_modules[\\/](?:react|react-dom|react-router|react-router-dom)[\\/]/,
              priority: 40,
            },
            {
              // Tabler icons — very large icon library, split separately
              name: 'vendor-icons',
              test: /node_modules[\\/]@tabler[\\/]/,
              priority: 30,
            },
            {
              // Chart.js and react-chartjs-2
              name: 'vendor-charts',
              test: /node_modules[\\/](?:chart\.js|react-chartjs-2)[\\/]/,
              priority: 20,
            },
            {
              // xlsx — large spreadsheet library
              name: 'vendor-xlsx',
              test: /node_modules[\\/]xlsx[\\/]/,
              priority: 20,
            },
            {
              // Socket.io client
              name: 'vendor-socket',
              test: /node_modules[\\/]socket\.io-client[\\/]/,
              priority: 15,
            },
            {
              // All remaining node_modules
              name: 'vendor-misc',
              test: /node_modules[\\/]/,
              priority: 10,
            },
          ],
        },
      },
    },
  },
});