import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "react",
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/prices": "http://localhost:3002",
      "/api": "http://localhost:3002",
      "/health": "http://localhost:3002",
    },
  },
});
