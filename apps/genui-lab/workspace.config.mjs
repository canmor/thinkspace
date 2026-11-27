import { defineConfig } from "vite";
export default defineConfig({
  root: "workspace",
  build: { outDir: "../dist-workspace", emptyOutDir: true },
});
