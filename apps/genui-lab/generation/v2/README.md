# Reproducing Goal 2B.1

From apps/genui-lab, install the locked dependencies and the Playwright Chromium revision. Read protocol.md for the frozen contrasts and rubric.md for scoring. The two inner protocols, component catalog, resource limits and runtime are inherited from ADR 0003. schema.json describes only the outer wire contract. The trusted host applies additional aggregate byte, state and block-count checks. All UI blocks go through the existing Worker admission entry point before any response is displayed.

Offline verification uses the saved provider responses, including refusals and incomplete results. It requires local Chromium and permission to bind a loopback port. Run in order:

```sh
npm ci
npx playwright install chromium
npm run build
node --test generation/v2/*.test.mjs
node generation/v2/baseline.mjs
node generation/v2/baseline-probes.mjs
node generation/v2/audit.mjs
node generation/v2/report.mjs
```

The scores, key-separated reviewer packets and raw outputs live under evidence/goal-2b1. To inspect one response, open replay.html on the local preview server, choose the wire format and protocol in its episode record, and paste the complete raw assistant content. Each attempt contains the full provider reply separately from the assistant content.

For a fresh paid experiment run `node generation/v2/run.mjs` from apps/genui-lab. The runner creates a fresh directory under runs, builds the deployment and reruns the provider-configured regressions before reading OPENAI_TOKEN from the repository-root .env. SIGINT cancels collection. Matched seeds control the comparison but cannot guarantee identical provider responses. Audit accepts a run directory argument. The aggregate report also requires the baseline-v2.json in that directory.
