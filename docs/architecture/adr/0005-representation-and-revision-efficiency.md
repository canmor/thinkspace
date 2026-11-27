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
