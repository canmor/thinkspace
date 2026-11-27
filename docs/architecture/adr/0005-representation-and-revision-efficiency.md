# ADR 0005 · Representation and revision efficiency

**Status: Proposed for architecture review.** Scope is the local Goal 2B.3 generative UI lab.

## Accepted existing capabilities

The restricted OpenUI Lang and json-render adapters, host-owned component catalog, isolated Worker, complete-specification admission, bounded integer controls and rollback to the last admitted artifact remain the experimental controls. OpenUI is the primary protocol candidate. json-render supplies a comparison with different expression and binding semantics.

## Experimental extensions

Chart uses an opt-in line component. The Worker evaluates bounded data using the existing protocol expressions. Trusted React code generates axis labels, paths, legend, selection markers and a data table. The schema accepts no generated callbacks, format strings, external URLs or HTML rendering hooks. Experiment B uses the baseline catalog throughout.

For revisions, the model can add, replace or remove complete named OpenUI declarations or json-render elements. A packet identifies an artifact and its base revision. A fresh Worker reconstructs and admits the entire candidate, derives its controls, runs it at initial and migrated values, and enforces the same execution limits as a fresh generation. An epoch check prevents superseded candidates from publishing. A live interaction invalidates outstanding publication attempts. Both revision arms use the same host migration algorithm.

A host role vocabulary identifies controls by task; categorical values migrate by unambiguous option labels. Ambiguous roles, invalid domains and incompatible values reject the candidate. Removed and introduced roles are recorded. This experiment used a bounded synthetic vocabulary and cannot establish general semantic identity.

## Validated representation improvements

Among the 12 matched equivalent deliveries, the median UTF-8 source decreased from 1,646.5 bytes with Graphic to 464.5 with Chart. All 27 delivered visualizations passed the complete data-series and unit probes. Chart delivered 15/20 versus 12/20, with fewer repair calls (10 versus 14). The median episode duration was 10.34 versus 31.47 seconds. Two seeds per task, overlapping calls and a fixed budget limit generalization. Five of eight B05 Chart episodes still failed to deliver. [Full visualization report](../../../apps/genui-lab/evidence/goal-2b3/visual-findings.md)

## Validated revision results

Incremental revisions used 43,929 completion tokens across 48 turns versus 49,350 with full regeneration. Median end-to-end time decreased from 6.67 to 5.44 seconds. Successful publication increased from 40 to 41, while both arms completed 11 of 16 trajectories. All 15 failed turns retained the previous artifact and state. All 81 published versions preserved existing selections; two incremental versions initialized a new field incorrectly. Prefer testing an explicit new-field initialization contract over promoting the current packet. [Controlled revision report](../../../apps/genui-lab/evidence/goal-2b3/revision-findings.md)

## Alternatives considered

- **Named declaration or element replacement** reuses addressable units in each source format. It permits a root child-list update and a field rename without a new intermediate representation. Large SVG declarations still need complete replacement.
- **Component-only replacement** cannot express OpenUI helper and state declarations independently. A change to a business rule can affect several components.
- **AST edits** can express smaller changes inside an expression, at the cost of exposing parser node identities and version-specific tree structure to the model. There was no measured need to add AST operations in this trial.
- **Document patching** supports nested updates in JSON, while OpenUI uses source text. Positional array edits add ambiguity after a prior change. General-purpose patching and revision scripting were rejected for this experiment.
- **A neutral representation** would require translators and another security and maintenance boundary. Direct reconstruction into each existing admission pipeline was sufficient.
- **Piecewise chart data** could shorten dense plateau and threshold curves. A compact set of knots with fixed interpolation merits separate review if explicit arrays remain costly. General iteration, callbacks and an unrestricted evaluator remain outside scope.

## Residual risks and unverified assumptions

Host role mappings can incorrectly identify business semantics. A bounded candidate may pass admission while presenting a wrong value, missing chart or misleading label. Automatic tests cover finite domains and fixture-specific SVG encodings. Publication is process-local and atomic at the validated frame boundary; the study does not demonstrate durable storage transactions or recovery from arbitrary host renderer bugs. Native product comparisons, cognitive benefit and reader preferences require independent observation.

D3 line generation adds two runtime packages and two type packages. Chart also adds layout, accessibility and formatting maintenance. The installed npm graph reported two high and four low advisories across six existing package entries; none named the added D3 packages. The dependency lock remained pinned for comparison. Security preflights exercise the experimental boundary and do not constitute production certification.

## Proposed next milestone

Keep full regeneration available as the reference implementation. Review the bounded Chart contract, real accessible data-table use, long labels and units with independent participants. Require stable author-defined state-role identifiers and explicit semantics for changed domains before generalizing revision migration. Re-evaluate the measured trade-offs on held-out tasks before promoting either extension to the accepted catalog or protocol.

## Architecture review disposition

The review accepted the conservative direction. Full regeneration remains the default and reference. Chart remains opt-in alongside SVG. The paired reduction in median size was 71.8% on the three simpler tasks. B05 yielded no equivalent SVG delivery. Human accessibility assessment and dependency advisory triage precede any catalog promotion.

Correctness-qualified delivery on the recorded numeric, domain and default checks was **40/48 full versus 39/48 incremental**. Correct initialization was **16/16 versus 14/16**. The two json-render water cases failed under both patch seeds and passed under both full seeds. Publication, retention and rollback retain their original denominators. Independent human semantic success remains unmeasured.

### Proposed initialization contract · P1 before patch promotion

The current packet changes declarations or elements. Reconstruction clears the candidate envelope state, json-render supplies the control minimum, and migration copies the candidate value for an introduced role. This path cannot convey a requested non-minimum initial value. Both saved water counterexamples exercised it.

A separately versioned, artifact-only packet should carry explicit initializers keyed by stable semantic role. After reconstructing and admitting the candidate, the host compares the old and new role contracts. Require exactly one initializer for each introduced role and zero for retained, renamed or removed roles. Reject unknown, duplicate, missing or ambiguous roles. Retain compatible prior values across renames and domain changes, resolving categorical choices by identity. Reject incompatible existing values. Validate each new value against its candidate domain, assemble the complete state, run complete admission and evaluation, and publish only if the base and epoch still match. Any failure retains the prior artifact and state. A valid in-range number still needs an independent oracle to establish agreement with the requested default.

Acceptance cases for that future version include an explicit non-minimum default, an omitted or extra initializer, a retained-field override, a rename with reordered choices, an invalid default, concurrent or stale submissions, and exact rollback. Replay both archived water cases under the original packet and test their corrected counterparts separately. The current patch covers artifact-only changes. If retained prose becomes stale or contradicts a revision, use full regeneration. The follow-up should audit that commentary, distinguish requested changes from semantic drift, and report first-pass, correctness-qualified and complete-trajectory delivery plus tokens and latency per correct turn. The architecture review did not promote the initializer design or either experimental extension.
