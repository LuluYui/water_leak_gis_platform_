/* eslint-disable import/no-extraneous-dependencies */
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  esbuild: {
    supported: {
      "top-level-await": true,
    },
  },
  server: {
    host: "0.0.0.0",
    hmr: {
      clientPort: 5173,
      host: "localhost",
    },
    watch: {
      usePolling: true,
    },
  },
});
