# Explicit initializer follow-up

The v2 experimental patch adds a mandatory version (2) and an initializers array. Every entry contains a host semantic role and a bounded integer value. The contract is exact: one initializer per introduced role, with none for retained, renamed, removed or unknown roles. The host verifies domain membership after reconstructing and admitting the entire candidate. The Worker re-evaluates the complete migrated state before the host checks the base and epoch and publishes it. Failed candidates leave the current artifact and state intact. The domain checks cannot establish that a legal integer is the value requested by the user. Independent numeric and default oracles remain necessary.

The existing versionless packet remains available for archived replay. Full regeneration remains the reference. Both protocols share the new transaction and migration logic. Host role identification still depends on the lab's trusted task vocabulary. The initial frame used to derive the candidate contract must pass the existing provisional evaluation as well as the final evaluation. The experiment does not broaden that admission rule.

## Counterexamples and regression suite

The browser tests load the original two water-json patch packets directly from their committed records. Replaying the old packet reproduces the exact saved publication at 4 minutes and 2 L/min. Applying the same operations under v2 with the explicit rate initializer 3 publishes at 4 minutes and 3 L/min with 12 litres remaining. Tests check missing, extra, duplicate, fractional, out-of-domain and retained-role initializers, unknown versions, stale bases, concurrent publication, exact rollback, renamed fields and reordered choices. A separate fixture illustrates that an explicitly supplied 2 is legal but fails the independent task requirement.

## Paired validation protocol

Two fresh water-json trajectories per arm use seeds 1701 and 1702, three turns per trajectory, the original prompts and origins, the same 2,048-token cap, one diagnostic repair, and alternating arm order. Full and patch-v2 independently receive the same origin and requested interaction sequence. Later inputs reflect each arm's actual published history. The patch system prompt supplies the host role vocabulary and versioned response schema. The independent task oracle is never sent to the model. The first turn must retain 4 elapsed minutes and start the rate at 3. The next turn uses the explicit 4 L/min interaction. The audit separately checks all 28 time/rate combinations and the requested plot or removal. A failed second turn leaves its usable artifact active for the third request.

The paired directory preserves the initial pilot. Updating its served dist directory invalidated worker asset URLs in already open pages. Worker-failure attempts and associated timing are excluded from comparative evidence. The paired-fixed directory is a fresh collection on one immutable build directory. Only this collection enters the comparison. During fixed collection both seed lanes ran concurrently. Provider latency varies and billed currency cost is unavailable.

## Credential-free verification

Run from apps/genui-lab with the pinned dependencies and Chromium installed.

```sh
npm run build
out=evidence/initializer-v2
tmp=$(mktemp -d)
node generation/efficiency/revision-run.mjs dist "$out/paired-fixed" --initializer-study --offline
node generation/efficiency/revision-run.mjs dist evidence/goal-2b3/revisions --offline
GENUI_PROVIDER_PREFLIGHT=openai GENUI_REPORT="$tmp/tests.json" EFFICIENCY_AUDIT_DIR="$out/paired-fixed" EFFICIENCY_AUDIT_REPORT="$tmp/behavior.json" npm test
```

Compare the independent behavior file with behavior.json. The replay verifies stored requests' outcomes, published identities, frames, migrations, exact rollback and subsequent selections. The regression report's durations depend on the host. initializer-report.mjs aggregates the stored usage and timing over all attempts; per-correct-turn ratios include failed calls and repairs in the numerator.

The beginning of fixed collection overlapped the tail of the excluded pilot. Dedicated build assets eliminate the changing-file failure, while provider queuing and host contention still limit latency attribution. build-sha256.txt records the served revision page and its bundle assets.

## Results on the fixed build

| Measure | Full regeneration | Patch v2 |
|---|---:|---:|
| Correct first-turn defaults | 2/2 | 2/2 |
| First-pass correct / requested turns | 4/6 | 4/6 |
| Final correct / requested turns | 4/6 | 4/6 |
| Complete correct trajectories | 0/2 | 0/2 |
| Provider calls, including repairs | 8 | 8 |
| Input tokens / correct turn | 2,813.5 | 2,558.5 |
| Completion tokens / correct turn | 2,416.25 | 2,274.75 |
| End-to-end elapsed seconds / correct turn | 46.28 | 43.28 |

Both arms initialized the rate to 3, retained 4 elapsed minutes, and published the requested final drained-volume metric. All four plot turns hit the token cap even after repair. Each failed turn retained its preceding artifact and rate selection. On the eight published turns, the numeric audit checked all 28 time/rate combinations (224 combinations overall). On turn 3 the final metrics were correct, although there was no prior delivered plot available to remove. The patch origin had no surrounding commentary. Its prose stayed empty throughout. Full-arm prose continued to describe the selected drain rate accurately. This sample gives no evidence about stale inherited prose on a nonempty patch origin.

These results reproduce the targeted default fix. Both strategies delivered identical numbers of correctness-qualified turns. Two seeds on one task provide insufficient evidence of a general cost or latency advantage. See comparison.json for the denominators, individual output histories and timing totals.
