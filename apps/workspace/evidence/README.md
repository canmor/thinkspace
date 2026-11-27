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

## PR 4 follow-up

The [deterministic review run](pr4-review/journey.json) branches from the UI-bearing assistant message, changes the independent artifact state, and checks the branch's original weight before and after regeneration. It opens both revision provenance views, removes and recaptures the artifact snapshot, and checks the submitted representations in order (history, conversation, artifact). A separate SQLite corruption injection exercises snapshot capture before mounting the damaged artifact. Capture displays a diagnostic, disables submission and leaves the provider invocation counter unchanged. Six Node tests and all 35 GenUI Lab tests passed. The live-provider evidence above belongs to the original review baseline.

[Inherited matrix](pr4-review/05-branch.png) · [Selected sources](pr4-review/06-context.png) · [Revision provenance](pr4-review/07-revision.png) · [Restored artifact](pr4-review/09-restored.png)

## Final provider submission gate

The HTTP regression bypasses the UI and exercises the real submission route against a temporary SQLite database. Five rejected submissions produced zero provider calls: forged projection, invalid state, mismatched source, changed content under the same SQLite revision, and invalid refinement target state. Two valid revision-1 snapshots reached the spy after the artifact had advanced to revision 2, including the original legacy representation. The spy received the saved snapshot unchanged.

The final deterministic browser run exercised synthesis and refinement through this backend gate. The capture waits for both source references to finish persisting. [Selected sources](submission-gate/06-context.png) · [Browser journey record](submission-gate/journey.json). The real-provider measurements remain those of the earlier baseline.
