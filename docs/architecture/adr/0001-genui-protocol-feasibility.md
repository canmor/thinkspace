# ADR 0001 · Goal 1 protocol feasibility

**Proposed for human architecture review · 2026-11-27.** Prefer OpenUI Lang with a host-owned SVG catalog, state codec, artifact validator and context projection for a subsequent reviewed experiment. Keep json-render as a comparison adapter. OpenUI expresses the benchmark's conditional arithmetic, sum and descending sort in its fixture. json-render required registered calculation functions for this implementation. The evidence supports local deterministic interaction and replay over the reviewed inputs. Arbitrary generated programs need a separate admission and resource-budget design before adoption.

## Capability matrix

N = native protocol feature exercised. E = documented extension point used. C = lab-owned implementation. U = unverified. Effort is described by the implementation needed; elapsed engineering effort was not instrumented.

| Capability | json-render 0.23.2 | OpenUI Lang 1.2.0 | Evidence and implementation cost |
|---|---|---|---|
| Composition | N element references; E registry | N component calls; E library | B02–B04 use shared visual components through distinct adapters |
| Free SVG subset | E + C | E + C | B02 freely lays out group, paths, text. B04 adds rect and circle. Catalog validates attributes and constructs individual React elements |
| Reactive SVG | N nested computed props | N expressions in shape objects | B04 circle cx and rect width across all 124 input states |
| Derived state and conditions | E arithmetic functions, C positive excess | N arithmetic and ternaries | B04 boundary and fee assertions. Other native json-render conditions were not compared |
| Aggregation, sorting and ties | E named computation, C ranking | N Sum, arithmetic and Sort | B03 independently checks scores and order with six weight vectors. Generic map/filter unverified |
| State export | N change callback + C scalar snapshot | N store callback + C variable-name mapping | Initial and final JSON for every task/protocol |
| Restore | N provider seed + C host | N initialState + C binding codec | Reload and separate clean browser contexts; original fixture and version required |
| Context projection | C | C | Components publish semantic outputs. B03 scores and B04 amounts remain numeric. Host includes inputs, rules and provenance |
| Security | C bounded import, strict SVG, offline CSP | Same host boundary | Unknown or modified specs rejected before invocation. Host action declarations, invalid SVG, excessive expressions and unrecognized state exercised. General untrusted-program validation U |

## Decision boundaries

- The six fixtures cover manually composed protocol feasibility. Six successful renders do not estimate the probability of correct generated UI. The conditional fee and the ranking calculations are local. The lab invokes no model.
- The artifact import gate compares the entire source against its reviewed fixture, limits the envelope to 32,000 code units, validates version and restricts state to expected scalar fields and ranges. This provides a finite program set. Independent restoration works within a matching renderer and catalog. Unseen programs, cross-version migration and a portable catalog distribution mechanism remain unsupported.
- The SVG vocabulary covers one level of grouping, four leaf elements, bounded coordinates and restricted path commands. No external references or event attributes are exposed. Neither a general SVG sanitizer nor either upstream renderer's unrestricted execution surface was evaluated. The host exposes no tool provider, actions, desktop bridge or filesystem API.
- The spike uses only primitives needed by the three tasks and one Apps SDK UI host control. Benchmark-specific components, an application expression language and an inference harness would obscure the comparison. Neither a full 20-primitive library nor the visual fidelity of a larger design system has been validated.
- The small sample supports direct functional comparisons. Visual evidence is available for review. Representation fitness, human comprehension, conversational integration, multi-turn stability and model efficiency have no measured scores here.
- Accepting the proposed direction requires a human decision about expressiveness, admission of new specs and renderer lifecycle. Goal 2 requires separate review.

[Lab, reproduction commands, source and evidence](../../../apps/genui-lab/README.md)
