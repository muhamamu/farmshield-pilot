import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Avoid Windows realpath failures in synced workspace folders.
  resolve: { preserveSymlinks: process.platform === 'win32' },
  build: {
    outDir: "dist/client",
    rollupOptions: {
      output: {
        manualChunks(id) {
          const modulePath = id.replaceAll('\\', '/');
          if (modulePath.includes('/node_modules/leaflet/')) return 'leaflet';
          if (modulePath.includes('/node_modules/@supabase/')) return 'supabase';
          if (modulePath.includes('/node_modules/@phosphor-icons/')) return 'phosphor-icons';
          if (/\/node_modules\/(react|react-dom|scheduler)\//.test(modulePath)) return 'react-vendor';
        },
      },
    },
  },
  optimizeDeps: {
    include: ["react", "react-dom/client"],
  },
  server: {
    proxy: { "/api": "http://127.0.0.1:4180" },
    host: "0.0.0.0",
    allowedHosts: ["terminal.local"],
    warmup: {
      clientFiles: ["./src/main.jsx"],
    },
  },
  plugins: [react()],
});
