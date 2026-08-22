import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

const humaProxy = {
  target: "http://172.20.0.4:8000",
  changeOrigin: true,
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/auth": humaProxy,
      "/user": humaProxy,
      "/network": humaProxy,
      "/organization": humaProxy,
      "/organization-user": humaProxy,
      "/schema": humaProxy,
      "/node-definition": humaProxy,
      "/workflow-definition": humaProxy,
      "/workflow": humaProxy,
      "/workflow-action": humaProxy,
      "/pipeline-definition": humaProxy,
      "/record": humaProxy,
      "/file": humaProxy,
      "/healthz": humaProxy,
      "/readyz": humaProxy,
    },
  },
})
