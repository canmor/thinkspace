# Goal 2B.2 experiment 1

Use frozen Sol arm G and the four saved B04 deliveries (two protocols × seeds 1701 and 1702). These runs condition on existing deliveries. Evaluate three sequential revisions per conversation. Use the full last delivered artifact, actual observed state and prior conversation. If revision delivery fails, retain the last usable artifact and disclose the failure to the next turn. Allow one diagnostic repair per turn. Keep provider and resource limits from arm G. Keep the mounted prior artifact separate from the candidate until acceptance. Capture frames, selections, screenshots, raw attempts and timings.

Test domestic and international, Economy and Business, standard and Gold at 10–40 kg. Inspect charge/allowance and both fees when requested. Score curve existence and numeric correctness separately. Capture the initial render before changing selections. Use observed bindings to drive controls. Leave ambiguous mappings pending.

Native ChatGPT is an experience comparator. Use a fresh product conversation per task and the exact B01/B02/B04 prompts from v2/plan.mjs, followed in B04 by the three changes in plan.mjs. Supply matching selection information in plain language when native controls are unavailable. Capture visible outputs and exposed model label. Keep account details out of evidence. On each side ask an independent reader to explain a perpendicular dot product, trace context-budget ownership, or locate the effect of the policy change. Record answer, elapsed time, representation preference and reasons independently of model scores. Pair the first OpenUI seed with the first native conversation; do not select by quality.

## Reproduction

From apps/genui-lab, run npm ci and npm run build with the pinned Chromium installed. Run `node generation/b05/run.mjs evidence/goal-2b2 --offline` to reproduce every attempt and retained state. Create a fresh output directory and run `node generation/b05/audit.mjs evidence/goal-2b2 <output-directory>` to exercise the submitted controls and compare outputs. For a new paid run supply a fresh directory to run.mjs. The captured signed-out product output in native-rendered.txt is synthetic benchmark content only. Native app versions, pricing and seeds are unobserved.

See the [architecture review addendum](review-addendum.md) for limitations and the paired reviewer session.
