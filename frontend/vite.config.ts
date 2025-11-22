import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom"],
  },
  build: {
    // Optimize chunk splitting
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor chunks for better caching
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@tanstack/react-query'],
          'chart-vendor': ['recharts'],
          'pdf-vendor': ['jspdf', 'jspdf-autotable'],
          // date-fns is large, split it out
          'date-vendor': ['date-fns'],
        },
      },
    },
    // Enable minification
    minify: 'esbuild',
    // Optimize chunk size warnings
    chunkSizeWarningLimit: 1000,
    // Enable source maps only in dev
    sourcemap: mode === 'development',
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
    exclude: ['jspdf', 'jspdf-autotable'], // Lazy load these
  },
}));
