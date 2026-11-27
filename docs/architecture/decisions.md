# Decision log
Accepted = explicit product agreement, not technical verification. Proposed = recommendation; Validate = experimental question; Deferred = outside current phase.

| ID | Status | Decision / rationale |
|---|---|---|
| P-01 | Accepted | Graph conversation + Intelligent/Generative UI + composable context: core direction |
| P-02 | Proposed | AI Thinking Workspace positioning, Think with AI tagline, power user focus |
| A-01 | Proposed | Workspace-centric modular monolith; avoid Chat-centric coupling and event-sourcing overhead |
| A-02 | Proposed | Topic-level graph + linear messages, immutable branch anchors |
| A-03 | Proposed | Context compilation separated from history; direct references; merge via synthesis |
| A-04 | Proposed | Artifact identity/version/state/provenance separated |
| A-05 | Proposed | Provider ports and local-first storage |
| A-06 | Validate | Official SIWC eligibility, usage, commercial rules; BYOK fallback |
| UI-01 | Proposed | Web Lab React/TS/Vite, reuse Apps SDK UI |
| UI-02 | Validate | json-render vs OpenUI Lang, free SVG, reactivity, state persistence |
| UI-03 | Proposed | Declarative UI first, executable sandbox later |
| UI-04 | Validate | React Flow, Tauri vs Electron vs native hybrid, performance and licenses |
| UI-05 | Deferred | Pure native renderer, desktop packaging in Lab, custom DSL |
| ENG-01 | Proposed | Evidence-first Goal 1 no LLM; review before Goal 2 |
| ENG-02 | Deferred | Knowledge graph, RAG, cross-device sync, collaboration, commercial rollout |

Alternatives considered: chat-centric faster initial delivery but context/artifact coupling; event-driven runtime useful for streaming but full event sourcing premature. Native rendering maximizes system fidelity but reduces Web ecosystem reuse; native shell + Web content balances; Electron consistent Chromium with resource tradeoffs; Tauri uses system WebView and requires compatibility tests. No final shell or protocol selection.

2026-11-27 · UI-02 evidence and proposed protocol direction are recorded in [ADR 0001](adr/0001-genui-protocol-feasibility.md). Human architecture review is pending.

2026-11-27 · OpenUI Lang is conditionally accepted as the primary candidate and json-render is retained for comparison. [ADR 0002](adr/0002-generated-spec-admission.md) supersedes the fixture-only admission proposal. Its restricted runtime and Goal 2 readiness assessment await human review.

2026-11-27 · ADR 0002 conditionally accepted for Goal 2A only. [ADR 0003](adr/0003-restricted-generation.md) records the restricted generation results, residual risks and proposed next experiment. Human architecture review is pending.

[ADR 0004 — Restricted generation reliability](adr/0004-generation-reliability.md) records the conditional architecture review, revised scoring and Sol reference configuration for the next local experiment.

Goal 2B.2 exercised ADR 0004's approved local scope. The selected Sol configuration delivered one of four complete three-revision trajectories. Keep the existing execution and admission limits for review. Native render captures and a separate reader worksheet are available for independent assessment. [Evidence and limitations](../../apps/genui-lab/evidence/goal-2b2/findings.md)

2026-11-27 · Goal 2B.3 architecture review closed. [ADR 0005](adr/0005-representation-and-revision-efficiency.md) records the accepted local baseline and the decision to direct future GenUI optimization through real Thinkspace product scenarios.

Goal 3 · [ADR 0006](adr/0006-integrated-walking-skeleton.md) proposes the local Web, SQLite and GenUI integration for product-experience and architecture review.
