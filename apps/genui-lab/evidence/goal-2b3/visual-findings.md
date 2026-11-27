# Experiment A · Representation

On the 12 matched pairs in which both arms delivered (harbor, kiln, archive × two protocols × two seeds), the median delivered specification was 464.5 UTF-8 bytes for Chart and 1,646.5 for Graphic. Three additional B05 Chart episodes delivered. Neither protocol delivered a B05 Graphic at this budget. Across 40 episodes, 27 delivered artifacts passed the complete-series audit at every audited input state. B05 included all 31 points at each of 248 combinations and a separate selected-weight indicator. SVG calibrations were transcribed after collection from displayed axis ticks. Frozen business answer keys predate generation.

| Measure | Graphic | Chart |
|---|---:|---:|
| First pass / episodes | 6/20 | 10/20 |
| Delivered / episodes | 12/20 | 15/20 |
| Truncated calls / all calls | 15/34 | 9/30 |
| Input tokens, all calls | 37,339 | 33,294 |
| Completion tokens, including repairs | 50,911 | 31,041 |
| Reasoning tokens | 33,949 | 20,367 |
| Estimated visible tokens (completion less reasoning) | 16,962 | 10,674 |
| Repair calls / repair completion tokens | 14 / 21,783 | 10 / 14,619 |
| Median provider call latency | 22.19 s | 12.80 s |
| Median episode latency including repairs | 31.47 s | 10.34 s |

Offline production-render probes measured roughly 0.4 ms median from surface invocation to layout effect in both arms. Three fresh page loads per delivered artifact used local Chromium. Browser navigation and provider latency are excluded from these render probes. Physical display paint and human perception were unmeasured. The live collection server's build directory was refreshed during the run. The contemporaneous frame and the independently rebuilt replay frame matched on every delivered sample. Original wall-clock timings retain the concurrent workload and cannot isolate network or host contention.

## Representation trade-offs

The trusted component supplies axes, legend, line styles and an accessible data table. Generated SVGs varied from connected lines to isolated circles. These are observations from the saved artifacts. Independent human observations remain pending. Compare only functionally eligible pairs in the reader exercise.

Explicit x arrays and complete numeric series worked for irregular harbor measurements. Existing arithmetic and references expressed reactive values without passing a function into the renderer. SVG paths compactly expressed piecewise-linear data in the kiln case: a horizontal segment represented the plateau. Chart requires explicit samples, including repeated plateau values. B05 still truncated in five of eight Chart episodes, including all four json-render episodes. The restricted operations Sum, Sort and Rank have different purposes and cannot construct a derived row for each x coordinate. A separately reviewed, bounded knot-and-interpolation data form is a candidate for dense piecewise curves. No new collection operation was enabled.

The implementation adds a pinned D3 line generator and its path dependency, a seven-field schema, protocol admission switches, fixed-scale rendering logic and accessibility markup. Host code owns all accessors and formatting. One frame permits at most 120 series values, each series has at most 40 points, and a chart has at most three series. Existing aggregate frame and Worker budgets still apply. Maintenance includes D3 licenses, two protocol adapters, axis layout, unit semantics, assistive technology and regression coverage. Long axis labels and decimal rounding merit human inspection. Adding Chart to the accepted catalog remains a review decision.

The small, selected task set and two seeds limit generalization. Provider usage exposes reasoning tokens but supplies no separate authoritative visible-token count. Retain the estimates and actual UTF-8 byte sizes separately. Billing and independent reader preference remain unknown.
