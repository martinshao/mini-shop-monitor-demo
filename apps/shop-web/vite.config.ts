import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // 本地监控验证时直接消费 SDK 源码，避免 workspace 包 dist 滞后导致调试日志丢失。
      "@mini-shop-monitor/monitor-sdk": fileURLToPath(
        new URL("../../packages/monitor-sdk/src/index.ts", import.meta.url)
      )
    }
  },
  build: {
    // 生产构建保持压缩，但不启用 drop_console，保留 SDK 中用于验证采集时序的 console.info。
    minify: "esbuild"
  },
  server: {
    port: 3000,
    proxy: {
      "/api": "http://localhost:4100"
    }
  }
});
