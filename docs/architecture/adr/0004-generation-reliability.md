# ADR 0004 — Restricted generation reliability

**Status** Proposed for human architecture review, 2026-11-27. ADR 0003 remains the accepted experimental baseline. Scope is local and single-user.

## Decision requested

Retain the versioned structural transport for further local evaluation. Keep OpenUI Lang Restricted Profile as the primary candidate and json-render as the comparison. Keep the catalog, admission controller, Worker CSP and execution budgets fixed. The host validates the complete envelope before presenting ordered blocks and admits at most one live UI. The trusted Node client alone holds the provider credential. A larger model output allowance changes only collection. Rejection of any block withholds the complete response.

## Evidence

Every core arm contained 20 matched episodes across five tasks, two protocols and two seeds. Each holdout arm contained 12 episodes across three previously unseen tasks. Core success requires intent, domain and applicable behavioral checks to pass. Presentation and representation choice are scored separately.

| Arm and single change | Core first delivery | Core final delivery | Core success | Holdout final delivery | Holdout success |
|---|---:|---:|---:|---:|---:|
| A · legacy H1 | 2/20 | 4/20 | 3/20 | — | — |
| B · structural transport | 4/20 | 4/20 | 4/20 | — | — |
| C · output cap 768 → 2048 | 7/20 | 7/20 | 4/20 | — | — |
| D · semantic grounding | 6/20 | 6/20 | 4/20 | 4/12 | 4/12 |
| E · diverse examples | 7/20 | 7/20 | 3/20 | 8/12 | 8/12 |
| F · full GPT-4.1 snapshot | 6/20 | 6/20 | 1/20 | 9/12 | 9/12 |

Structural transport improved first-pass transport validity from 2/20 to 9/20. Its paired treatment includes changing both wire syntax and provider decoding. Increasing the output cap reduced truncated core attempts from seven to one and added three delivered responses. Core success stayed at four. Across 156 episodes and 260 calls, estimated token cost was USD 0.506, including 104 repairs. Costs are estimates using recorded cached and uncached usage. Per-protocol results, paired wins and losses, token counts, median call latency, repair costs and rejection diagnostics are available in the [summary](../../../apps/genui-lab/evidence/goal-2b1/summary.json).

## Failure modes and residual risk

- **Generation and harness.** Across all attempts, inner-specification failures included 23 invalid or duplicate declarations, 11 unexpected-field diagnostics and 11 syntax-balance diagnostics. The constrained outer object leaves the inner source as model-authored text. Ambiguity about whether a failure originated in the prompt or model remains.
- **Semantic and behavioral.** Arm F delivered four BYOK definitions and all four missed the requested model-provider credential meaning. An admitted baggage calculator offered the requested domains yet returned 32 kg for a case whose independent allowance was 23 kg. Missing interactions receive an unevaluated mapping score. One stronger-model baggage calculator passed. No B03 ranking artifact passed in F.
- **Generalization.** The stronger model passed five of eight interactive holdout episodes and all four book-gutter episodes. No tested response triggered the literal example-copy detector. That detector cannot exclude subtler imitation. The two seeds and three holdouts provide insufficient evidence for a general quality or model ranking.
- **Expressiveness.** The hand-authored baseline establishes feasible ranking and baggage interactions. Failed generations for those tasks do not establish a missing execution capability. The ordered envelope supports commentary surrounding one UI. Independent interactive blocks and arbitrary plotting remain outside this experiment.
- **Evaluation.** Two historical cohorts of 90 were re-scored separately with 15 core passes for OpenAI and zero for the local cohort. Deterministic behavior probes and conceptual checklists have different coverage. Unassessed presentation is NE. Six holdout definitions received an assistant readability assessment. No independent human judgments are available.
- **Isolation.** All 23 browser regression and security checks passed under the model-enabled configuration and offline replay reproduced recorded outcomes. These tests cover the local deployment. They provide no production isolation certification.

## Recommendation

Request independent assessment using the blinded packets, especially for conceptual fidelity and presentation. Then test clearer inner-language signatures and diagnostic wording against a newly frozen corpus. Retain separate measurement of domain and mapping failures. The results do not support adopting a more expensive model across tasks. Goal 2C and product integration require a separate architecture decision.

[Experiment and replay instructions](../../../apps/genui-lab/generation/v2/README.md) · [Rubric](../../../apps/genui-lab/generation/v2/rubric.md) · [Scored judgments and counterexamples](../../../apps/genui-lab/evidence/goal-2b1/scored-v2.json)
