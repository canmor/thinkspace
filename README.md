# Thinkspace

**Think with AI. Beyond the conversation.**

An AI Thinking Workspace for complex problem solving: graph-based conversation, generative UI and composable context.

Handoff baseline: 2026-11-27. Product discovery, not an implemented system. Start with [Goal 1](docs/spikes/genui-lab/goal-01.md); review evidence before Goal 2. This package is self-contained and does not require the originating chat.

## Reading order
- [Product](docs/product/vision.md)
- [Architecture](docs/architecture/overview.md)
- [Conversation](docs/architecture/conversation.md), [Context](docs/architecture/context.md), [GenUI](docs/architecture/genui.md), [Artifacts](docs/architecture/artifacts.md)
- [Decision log](docs/architecture/decisions.md)
- [Spike specification](docs/spikes/genui-lab/specification.md), [Benchmark](docs/spikes/genui-lab/benchmark.md), [Evaluation](docs/spikes/genui-lab/evaluation.md)
- [Goal 1](docs/spikes/genui-lab/goal-01.md), [Goal 2](docs/spikes/genui-lab/goal-02.md)
- [References](docs/references/research.md), [UI concepts](docs/references/ui-concepts.md), [Open questions](docs/open-questions.md)
- [Agent instructions](AGENTS.md)

## Goal 1 evidence

[Run the local protocol lab](apps/genui-lab/README.md) and review the [proposed feasibility decision](docs/architecture/adr/0001-genui-protocol-feasibility.md).

## Goal 1.5 evidence

[Generated specification admission, trust boundaries and Goal 2 readiness](docs/architecture/adr/0002-generated-spec-admission.md).

## Goal 2A evidence

[Restricted generation results and architecture review](docs/architecture/adr/0003-restricted-generation.md) · [Run or replay the experiments](apps/genui-lab/generation/README.md).

[Goal 2B.1 findings and architecture review](docs/architecture/adr/0004-generation-reliability.md) · [Offline replay and evaluation](apps/genui-lab/generation/v2/README.md)

[Goal 2B.2 multi-turn and native presentation findings](apps/genui-lab/evidence/goal-2b2/findings.md) · [Standalone Rubric 2.1](apps/genui-lab/generation/v2/rubric-2.1.md)

[Goal 2B.3 representation and revision experiments (accepted local baseline, ADR 0005)](docs/architecture/adr/0005-representation-and-revision-efficiency.md) · [Replay instructions](apps/genui-lab/generation/efficiency/README.md)

## Integrated workspace

[Run the Goal 3 walking skeleton](apps/workspace/README.md) to explore an architecture decision with a real model, branch the conversation, promote an interactive artifact and reuse its selected state as context. [Architecture review proposal](docs/architecture/adr/0006-integrated-walking-skeleton.md)
