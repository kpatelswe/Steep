import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const api = "http://localhost:3000";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: Object.fromEntries(["/api", "/r", "/d", "/f", "/unsubscribe", "/jobs", "/health"].map((p) => [p, { target: api, changeOrigin: false }])),
  },
  build: { outDir: "dist", sourcemap: false },
});
