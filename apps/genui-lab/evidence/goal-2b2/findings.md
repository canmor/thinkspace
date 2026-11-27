# Goal 2B.2 — refinement and presentation

The four saved Sol B04 calculators underwent three successive revisions each. Seven of twelve revisions produced admitted replacements. All seven preserved the preceding selections and returned the expected allowance and applicable fees across 248 states each (1,736 checks). Both delivered second-turn charts and the delivered third-turn chart matched the independently calculated fees across the eight fare, status and route combinations and 31 weights. The evaluator reads the displayed tick calibration for these specific charts. These results do not validate arbitrary chart encodings.

| Requested revision | OpenUI delivered | json-render delivered | Required mapping passed | Entire requested sequence delivered to date |
|---|---:|---:|---:|---:|
| Route and allowance | 2/2 | 2/2 | 4/4 | 4/4 |
| Fee curve | 2/2 | 0/2 | 2/4 | 2/4 |
| Old and new policies | 1/2 | 0/2 | 1/4 | 1/4 |

Five final revisions exhausted the 2,048-token cap despite the permitted repair. Each retained the preceding UI. The full trajectory succeeded for OpenUI seed 1702 only. Independent variation during the audit included all routes. During generation, json-render seed 1701 used a numeric route control; the scripted selection of International matched named options only, so that conversation continued on Domestic. Four selected and already-delivered B04 origins limit generalization.

**Collection.** The trusted client requested gpt-6.2-sol with provider-default sampling and seeds 1701/1702. There were 18 recorded responses including six repairs, 40,716 input tokens, 29,651 completion tokens and median provider latency of 31.729 seconds. Billed cost is unknown. An initial screenshot helper attempted an inline stylesheet; CSP blocked it. The experiment resumed using image cropping and reused the saved completion. Interrupted in-flight requests without a received response are excluded from token and latency totals. The model-enabled deployment passed all 23 regressions. Every saved attempt and the retained live states can be replayed offline.

## What was visible in the paired samples

These are assistant observations of the rendered artifacts. Each native task was collected in a fresh signed-out ChatGPT web conversation. The product exposed no exact model/version or billing data. The B04 thread continued through all three B05 changes. Native and lab do not share a known model, prompt harness, styling or state transport. The comparison measures the product experience as delivered.

- **B01.** The lab places negative projection beside the perpendicular case, with both diagrams visible at once. The native response first gives the formula and variable definitions, then offers a visualization, a negative-projection example, a summary table and a comprehension check. The native material affords more practice; time to understand either representation remains unmeasured.
- **B02.** The lab leads with a compact branching diagram. The three dark boxes have no readable labels in the captured image, so the reader must map them to the prose below. Native ChatGPT names the three owners up front and labels ownership cards, then continues through API and failure-boundary examples. Its ten-section treatment makes the initial overview easy to locate but adds reading distance for a reader seeking one responsibility.
- **B04/B05.** The native explorer separated allowance, excess weight and fee and later added a shared chart, accessible data table, old/new fee cards and a difference. Its initial Economy/Gold/38 kg selection showed 28 kg allowance and $150. Revision one returned to non-Gold/23 kg while claiming selections were preserved. Revision two reset the selected International route to Domestic. In the paired OpenUI run, the calculator retained Economy/Gold/International/38 kg, showing 30 kg allowance and $120 alongside the curve. The third revision truncated, leaving the old calculator visible without a new-policy fee. The other OpenUI trajectory delivered the requested two-policy view.
- **Interpretation.** The local host supplied actual control state to Sol on each turn. The native workflow used product UI interaction and ordinary follow-ups. State retention therefore measures the end-to-end systems. No independent human comprehension timings, ratings or preferences have been collected. [Reader worksheet](reviewer.md)

[Per-turn behavioral results](behavior.json) · [Frozen experiment](../../generation/b05/protocol.md) · [Standalone rubric](../../generation/v2/rubric-2.1.md)
