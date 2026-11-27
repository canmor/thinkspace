# Review evidence

All conversations here are synthetic review tasks. The journey files contain model message bodies, returned envelope text, measured provider latency, compiled manifests, provenance, immutable snapshots and the restored workspace document. Credentials and transport authorization headers are excluded.

| Run | Observation |
|---|---|
| [Real provider journey](review-live/journey.json) | Four gpt-6.2-sol calls completed in 7.43, 11.96, 7.67 and 10.44 seconds. From the newly created workspace screenshot through comparison and interactive matrix took 20.32 seconds. The local slider action and observed table update took 11 ms. These are single browser observations. |
| [Deterministic browser acceptance](acceptance-final/journey.json) | Fixture-backed provider responses exercised the same UI, server, Worker and storage paths. The test verified the exact submitted manifest, state continuity, revision rejection, graph movement, restart equality and Worker network denial. |
| [Lab regression summary](lab-results.json) | 35 Chromium tests passed with the provider security preflight enabled. |
| Domain and adapter tests | Four Node tests cover anchored/deduplicated context, missing required snapshots, byte budget, migration ambiguity, the provider boundary and SQLite restart/write conflicts. |

The final live artifact ranked Tauri (8.00), Electron (7.50) and Native Hybrid (7.42) at weights 0, 25, 35. The initial matrix, revised content and restored controls can be inspected side by side.

[Workspace](review-live/01-workspace.png) · [Comparison](review-live/02-comparison.png) · [Generated matrix](review-live/03-matrix.png) · [Promoted state](review-live/04-promoted.png) · [Branch](review-live/05-branch.png) · [Composed context](review-live/06-context.png) · [Revision](review-live/07-revision.png) · [Restored workspace](review-live/09-restored.png)

## Failures and recovery

- A malformed deterministic revision failed admission. Its diagnostic and failed raw generation remain in the deterministic record, alongside the unchanged last usable revision. [Rejected revision](acceptance-final/08-rejection.png)
- A separately injected over-budget source in local storage failed admission when the artifact reopened. The focused view exposed the error and mounted zero sliders. [Corrupt restore](acceptance-final/10-corrupt-restore.png)
- The first graph drag test found the artifact outside the visible canvas after nodes were added. It timed out with zero stored manual positions. Refitting on graph membership changes fixed the failed drag and the subsequent restart comparison. [Before](layout-regression/before.png) · [After](acceptance-final/09-restored.png)

The tests establish browser and storage behavior for this scenario. Ease of branching, cognitive benefit, comparative architecture quality and perceived latency require observed user sessions. Renderer preflight and version checks cannot establish the correctness of arbitrary model-generated calculations.
