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

## GPT-6.2 Sol follow-up

Run `node generation/v2/run.mjs runs/sol-repeat gpt-6.2-sol` in a fresh directory. This repeats arm F's tasks, seeds, prompts, output cap and repair policy using Sol. The API rejected the original sampling temperature. Sol uses its default temperature and top-p, and its completion-token cap includes reasoning tokens. The model ID is the provider alias returned by the API. Use `node generation/v2/audit.mjs runs/sol-repeat` and `node generation/v2/compare-sol.mjs runs/sol-repeat` for offline scoring against the frozen F results. Cost is unpriced for Sol. The first incompatible request diagnostics are preserved in evidence/goal-2b1-sol; the completed experiment is in evidence/goal-2b1-sol-default.

## Post-review rubric 2.1

From apps/genui-lab, run both offline audits and then the aggregate:

```sh
node generation/v2/audit.mjs evidence/goal-2b1
node generation/v2/audit.mjs evidence/goal-2b1-sol-default
node generation/v2/review-summary.mjs
```

Read evaluation-reviewed.json and summary-reviewed.json for revised judgments. Historical report.mjs reads the frozen rubric 2.0 evaluation. Under 2.1 conceptual checklists for B01/B02 are candidate evidence only. Interaction probes measure specified outputs; additional metrics, uncertain labels and explanatory claims require independent content review. Missing oracle evidence is NE. Assess presentation and modality separately. For Sol, replay each review-cases.json entry, record the opaque case ID, reviewer, rubric version, seven axis ratings and rationale in a separate scorecard. All current independent scorecards are unfilled.
