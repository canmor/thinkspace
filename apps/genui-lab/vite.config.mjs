import { defineConfig } from "vite";
export default defineConfig({
  plugins: [
    {
      name: "offline-render-policy",
      apply: "build",
      transformIndexHtml() {
        return [
          {
            tag: "meta",
            attrs: {
              "http-equiv": "Content-Security-Policy",
              content:
                "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'none'; img-src 'none'; object-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'",
            },
            injectTo: "head-prepend",
          },
        ];
      },
    },
  ],
});
