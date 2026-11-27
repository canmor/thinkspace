# ADR 0003 · Restricted generation experiment

**Decision under review.** ADR 0002 is conditionally accepted for a single-user local experiment. Retain OpenUI Lang as the primary candidate and json-render as the comparison. Keep the admitted profile, catalog and Worker policy fixed. The measured end-to-end success rate warrants another harness experiment before broader use. Goal 2C requires new human approval.

## Experiment and trust boundary

The trusted Node CLI sends the synthetic task and the versioned harness to a provider. The OpenAI cohort used the official Chat Completions endpoint with a pinned model snapshot, no tools, no storage request and up to 768 output tokens per call. The CLI reads only OPENAI_TOKEN from the repository-root .env into its process. The local comparison used the official Qwen GGUF model through a pinned llama.cpp server on loopback with a private temporary API key. The app offers no HTTP generation route. Neither provider receives fixture sources, behavioral oracle code, expected scores, user files or snapshot history.

The provider client bounds its response body at 65,536 bytes, refuses redirects, sets a deadline and supports cancellation using an AbortSignal. A complete stop response goes to the trusted host; a length-limited response is recorded and rejected. The host checks UTF-8 source and transport-envelope sizes before postMessage. The Worker independently validates both and applies the existing admission policy. Plain text is rendered as React text. A rejected attempt can receive one repair with its original output and diagnostic. Behavioral findings never enter repairs. Ctrl-C aborts the client request and stops owned processes; provider-side billing for a request already underway is outside this control.

Before the first inference in each cohort, the actual deployment passed all 21 regression and security cases, including the page CSP and an independent Worker CSP against that provider's origin. Snapshots retain an ordered component list with ordinal positions, complete props and scalar state. This representation distinguishes repeated metric labels and multiple text blocks. The legacy label-keyed output map is a convenience view and can overwrite duplicate labels. Consumers needing all semantic values must use the ordered list.

## Findings

Five tasks × three harnesses × two protocols × three matched seeds gave 90 episodes per provider. H0 contains the restricted grammar and catalog. H1 adds presentation policy. H2 adds one unrelated duration-conversion example. The same prompts, token ceiling, temperature, top-p, seeds and repair limit were used within each comparison. Repeats are exploratory and may be highly correlated.

| Endpoint measure | OpenAI GPT-4.1 mini | Local Qwen2.5-Coder 1.5B Q4_K_M |
|---|---:|---:|
| First complete response passing wire and surface syntax | 21/90 | 15/90 |
| First response delivered, including TEXT | 20/90 | 0/90 |
| Final response delivered | 25/90 | 21/90 |
| Final UI admitted / final complete UI submissions | 3/28 | 17/52 |
| B03/B04 functional successes / interactive tasks | 3/36 | 0/36 |
| Semantic errors / delivered responses | 10/25 | 21/21 |
| End-to-end task success | 15/90 | 0/90 |
| B06 delivered as text / B06 episodes | 4/18 | 1/18 |
| Provider calls, including repairs | 160 | 180 |
| Repair calls | 70 | 90 |

| Harness / protocol | OpenAI final delivered | OpenAI task successes | Qwen final delivered | Qwen task successes |
|---|---:|---:|---:|---:|
| H0 / OpenUI | 1/15 | 0/15 | 0/15 | 0/15 |
| H0 / json-render | 0/15 | 0/15 | 0/15 | 0/15 |
| H1 / OpenUI | 4/15 | 2/15 | 1/15 | 0/15 |
| H1 / json-render | 2/15 | 2/15 | 3/15 | 0/15 |
| H2 / OpenUI | 12/15 | 6/15 | 9/15 | 0/15 |
| H2 / json-render | 6/15 | 5/15 | 8/15 | 0/15 |

All 340 collected attempts reproduced their recorded decision offline; accepted UI frames and text were compared to their recorded contents. The three OpenAI H2/OpenUI B04 programs passed all 124 domain cases apiece. Two added an unsupported First fare; one also invented Silver membership. Only one delivered exactly the requested explorer. No B03 episode delivered a working decision matrix. The Goal 1.5 reviewed B03 fixtures still pass on both protocols, establishing that this task fits the profile.

All four delivered OpenAI B06 text answers explained encryption-key custody. The benchmark asks about bringing a user-owned inference API key and paying the provider. Choosing a text surface and grounding the definition are independent judgments. Every local model UI that passed admission reproduced the unrelated duration-converter example.

## Failure classification and next experiment

| Class | Observation | Recommended adjustment |
|---|---|---|
| Model generation | Malformed JSON, unresolved references, incomplete or truncated source. The 768-token ceiling affected both protocol comparisons. | Measure output-length distributions and test a separately versioned budget. |
| Harness contract | OpenAI often put its answer on the same line as TEXT. The parser expects a standalone header. The local model copied the H2 demonstration. | Make the response envelope structural, demonstrate both modalities and separate example content from task inputs. Freeze and rerun before changing the policy. |
| Restricted profile expressiveness | The profile lacks arbitrary nested layouts, formatters, indexing and general iteration. Named numeric expressions and ranked tables suffice for the reviewed tasks. | Document the supported alternatives. No evidence here requires expansion of the execution profile. |
| Admission implementation | The differential tests matched supported pinned ASTs; malformed examples were rejected. No confirmed false rejection was identified in this run. | Retain original diagnostics and add regression cases for any independently confirmed parser discrepancy. |
| Runtime | Across both cohorts no post-admission runtime failures were observed. OpenAI had 35/38 complete UI submissions rejected during admission; Qwen had 61/78. | Preserve the Worker boundary and separate admission diagnostics from render and mutation failures. |
| Semantic or behavioral | Extra policy classes, incorrect BYOK meaning, inert prose promising interaction, and irrelevant but valid examples. | Validate source-grounded domains and semantic outputs with independent checks. Do not send expected answers back to the model. |
| Presentation | A delivered text response printed proposed UI source and referred to a nonexistent slider. Duplicate labels can make a scalar summary incomplete. | Evaluate modality, legibility and ordered semantic outputs independently of parse success. |

The unsupported-capability metric is a lower bound based on explicit denial diagnostics. Earlier wire or syntax failures can mask more unsupported constructs. Surface-syntax scoring checks a complete response, correct wire header, parseable optional state, and parseable JSON or one-line expressions. It does not run code. Semantic judgments cover final delivered responses and were reviewed by the implementing assistant against the task rubric; a blinded human assessment remains outstanding. Task success also requires the independent interactive oracle on B03/B04. The reports give numerators, denominators, latency, input/output tokens, provider cost estimates and repair cost by task, harness and protocol.

The OpenAI run used 100,184 input and 41,059 output tokens, including 4,352 cached input tokens, with median call latency 2.945 s. Estimated standard API cost was USD 0.10446, including USD 0.05035 for repairs. Prices are estimates, not an invoice. The local model incurred no API charge; wall time, hardware and energy are separate. GPT-4.1 mini is marked deprecated by OpenAI. Reproduction of inference depends on continued access to that snapshot; recorded output can always be replayed with the pinned runtime. [OpenAI model, snapshot and pricing](https://developers.openai.com/api/docs/models/gpt-4.1-mini)

Residual risks include provider nondeterminism, correlated small samples, a single tested browser and no hard per-artifact heap or main-thread render deadline. No conclusion about production isolation or ChatGPT parity follows from this experiment. [Reproduction and evidence](../../../apps/genui-lab/generation/README.md)
