# Goal 2B.3 experiment replay

Run these commands from apps/genui-lab using the pinned npm lockfile and the Chromium revision installed by the pinned Playwright package. The build uses only local modules. Live runs use GPT-6.2 Sol, two requested seeds (1701, 1702), a 2,048 completion-token cap, provider-default sampling, structured responses, no streaming, no storage, and at most one diagnostic repair per turn. Seeds are provider requests, not guarantees of deterministic generation. Server-side model weights are unversioned.

## Credential-free replay

```sh
npm ci
npx playwright install chromium
npm run build
records=evidence/goal-2b3
scratch=$(mktemp -d)
node generation/efficiency/visual-audit.mjs dist "$records/visual" "$scratch/visual-audit.json"
node generation/efficiency/render-audit.mjs dist "$records/visual" "$scratch/render-audit.json"
node generation/efficiency/revision-preflight.mjs dist "$scratch/revision-preflight.json"
node generation/efficiency/revision-run.mjs dist "$records/revisions" --offline
EFFICIENCY_AUDIT_DIR="$records/revisions" EFFICIENCY_AUDIT_REPORT="$scratch/revision-audit.json" GENUI_REPORT="$scratch/regressions.json" GENUI_PROVIDER_PREFLIGHT=openai npm test
```

The offline transaction runner replays each stored model output, rejects absent records and compares the original base, published snapshot, diagnostic, migration and selected state at each turn. The independent tests derive expected business values from the task answer keys, separate from adapter evaluation. Render timings depend on the host and may differ. Open the saved screenshots or use the replay page to interact with a captured response. Paste the attempt's raw field into Ordered blocks v2, select its recorded protocol, and open replay.html?profile=chart-experiment for Chart. For a successful patch, paste the after.raw field of its turn record into the default replay page.

## Paid collection

Use a fresh directory for each collection. The host provider runner reads the existing repository-local credential. Credentials are never passed to the page, Worker, or generated code. Keep one build directory immutable per live experiment. Invoke visual-run.mjs with the new output directory from the lab working directory (it serves dist). Invoke revision-run.mjs with a separately built Vite output directory and another new record directory. The scripts reuse saved attempts on resume. Retain any interrupted samples and disclose replayed timing on resume.

## Evidence interpretation

Attempt files preserve prompts, raw provider replies, usage, timing and diagnostics. Turn files identify the base and published version and retain both complete snapshots. A blocked change keeps its old revision number; a subsequent turn can therefore request turn 3 against base 1. Selection files show whether the requested interaction occurred. A publication counts as delivered even when the independent behavioral audit later finds a defect. Full and patch arms preserve host-mapped interaction state using the same migration algorithm. Each arm receives its own current artifact and the same prior user requirements, so contexts can diverge after a failed turn.

The visual comparison uses counterbalanced modality order within each lane. The revision comparison alternates arm order by seed and task. Four lanes ran concurrently in each experiment, and the two experiments overlapped in wall-clock time. Provider queues, response caching and host load may affect latency. Report raw input including the artifact and repair context. The completion-minus-reasoning estimate is an approximation of visible tokens. For ongoing human review use reader-session.md.
