import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests",
  workers: 1,
  timeout: 120000,
  use: {
    baseURL: "http://127.0.0.1:4187",
    viewport: { width: 1340, height: 900 },
  },
  webServer: {
    command:
      "npx --no-install vite preview --host 127.0.0.1 --port 4187 --strictPort",
    url: "http://127.0.0.1:4187",
  },
  reporter: [
    ["list"],
    [
      "json",
      {
        outputFile: process.env.GENUI_REPORT || "test-results/regressions.json",
      },
    ],
  ],
});
