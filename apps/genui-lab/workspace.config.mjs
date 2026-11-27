import { defineConfig } from "vite";
export default defineConfig({
  root: "workspace",
  worker: {
    rollupOptions: {
      output: { entryFileNames: "assets/restricted-worker.js" },
    },
  },
  build: { outDir: "../dist-workspace", emptyOutDir: true },
});
