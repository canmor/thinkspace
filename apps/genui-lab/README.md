# GenUI protocol feasibility lab

The current lab runs OpenUI Lang 1.2.0 and json-render 0.23.2 in bounded Workers. Both feed a shared React catalog. The Goal 1 baseline used the upstream React renderers. Use the task buttons to compare panes. Each pane has independent inputs and a raw specification. Save snapshot stores one revision in browser storage and exposes portable JSON under Artifact and context. Paste that JSON in a fresh browser context, choose the matching task and protocol, and select Import snapshot. Each artifact includes its specification, input state, typed semantic outputs and provenance.

## Reproduce

From the repository root, using Node 26.7.0 on macOS arm64:

```sh
cd apps/genui-lab
npm ci --ignore-scripts --no-audit --no-fund
npx playwright install chromium --only-shell
npm run build
npm test
npx vite preview --host 127.0.0.1
```

The tests start their own production preview on port 4187. The production build carries the offline content security policy. Vite development mode is for trusted source development. Package-lock records exact transitive versions and integrity digests. The pinned browser is Chromium headless shell revision 1255.

## Goal 1.5 admission and runtime

Use Raw specification → Revised specification → Admit revision in either pane. Each candidate goes through the same controller as initial load, snapshot import and restore. A successful revision starts a new session with its admitted defaults. Compile-time resource settings and compatibility versions live in [policy.ts](src/admission/policy.ts). The production preview serves a response CSP on the worker asset itself. Use this preview for containment tests.

The [Goal 1.5 report](evidence/goal-1.5/results.json), screenshots, state and timing samples are separate from the original evidence. The [new programs](tests/corpora/novel) are outside the application's fixture glob. [Admission tests](tests/admission.spec.ts) include a deterministic generated corpus and trusted fault injection. The upstream feasibility findings, policy, resource limits and readiness recommendation are recorded in [ADR 0002](../../docs/architecture/adr/0002-generated-spec-admission.md). Acorn 8.15.0 (MIT) provides strict syntax inspection. Its [license](licenses/acorn.txt) is preserved.

## Goal 1 baseline evidence

- [Baseline Playwright report](evidence/results.json) covers six task/protocol pairs and two boundary tests. Screenshots capture both panes at default state. Each task/protocol prefix in [evidence](evidence) has a screenshot, initial and final snapshots and a timing sample.
- The B04 oracle enumerates four fare and membership combinations across 31 weights. The test checks the allowance, fee, rectangle width and circle position after every change. B03 checks defaults, three one-hot settings, zero and a changed setting with tied scores. [Independent oracles](tests/oracles.mjs) and [browser assertions](tests/lab.spec.mjs).
- Timing measures test-driver wall time from navigation through task selection and visibility. B04 also records driver round trips including assertions. One Chromium run per fixture cannot estimate population latency. No generation, model tokens or model repair costs apply.
- Error reports preserve the missing browser installation, the initial OpenUI empty-diagnostic callback bug, the lost OpenUI variable bindings on restore and a test comparator field-name mismatch. The OpenUI adapter translates dollar-prefixed store keys in both directions. Raw reports may contain timing and machine-specific paths when regenerated.
- The [architecture review](../../docs/architecture/adr/0001-genui-protocol-feasibility.md) records classifications, limits and the proposed decision. Human cognitive tests, blind visual comparison and a weighted product-quality score are pending human evaluation.

## Sources and licenses

The adapters use the published package sources recorded in the lockfile. The json-render prop resolver recursively resolves named computations and state expressions. Its React provider registers functions, components and input bindings. Both packages ship the Apache License 2.0. [Official repository and documentation](https://github.com/vercel-labs/json-render)

OpenUI's React renderer initializes dollar-prefixed bindings from initialState, and publishes the store snapshot on updates. Its language core implements Sum and Sort. Both 1.2.0 packages ship the MIT license. [Official repository](https://github.com/thesysdev/openui) · [Reactive state](https://www.openui.com/docs/openui-lang/reactive-state)

Apps SDK UI 0.2.2 supplies the version Badge in the host. The common input, scalar, table and SVG components belong to this lab. The package includes an MIT license with OpenAI's copyright notice. [Official repository](https://github.com/openai/apps-sdk-ui) · [License texts from installed packages](licenses)
