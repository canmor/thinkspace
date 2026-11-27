# Evaluation Rubric v2.0

The unit is a complete episode after at most one diagnostic-only repair. Also score first-attempt delivery. Every axis uses pass, fail, not applicable (NA), or not evaluated (NE). NE and NA never count as passes.

| Axis | Pass | Failure and missing evidence |
|---|---|---|
| Transport | Complete supported envelope, within UTF-8 limits, valid block and state structure | Refusal, cutoff, invalid JSON/header, unknown block, excessive size fail. No provider response is NE. |
| Specification | Every submitted UI is admitted and produces a valid initial frame | Rejected UI fails. Text-only is NA; unparseable transport is NE. |
| Intent | Addresses the requested subject and produces the requested artifact or explanation | Missing interaction, irrelevant examples and merely restating the prompt fail. Undelivered is NE. |
| Domain fidelity | Requested entities, assumptions, options, domains and rules are preserved; factual explanation is accurate | Invented categories, changed limits, contradictory rules or wrong meaning fail. Unresolved semantics are NE. |
| Behavior | For requested interaction, a replayed artifact matches independent expected outputs for defined input states | Wrong mappings or runtime errors fail. Missing interaction is scored under intent; its mapping is NE. Conceptual tasks are NA. |
| Presentation | Visible text and controls are legible, understandable and identify the quantities | Obscuring the answer with source, conflicting labels or irrelevant widgets fail. No visual/reader inspection is NE. |
| Modality | Plain text suffices for a definition; interactive requests receive usable controls | Separate from factual correctness. Text or a useful diagram is acceptable for B01/B02. |

Core success requires delivered output, intent and domain passes, plus behavioral pass where interaction is required. Report presentation and modality separately. Core success does not imply human approval. Rates include denominators. For unavailable outputs score only what was observable. Semantic reviews identify the assessor and rationale. Store blinded review materials separately from model/arm identifiers and prior judgments. Independent reviewers must enter their own judgments before consulting the key.
