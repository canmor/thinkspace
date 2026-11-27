# Goal 2A · Restricted generation

Run commands in apps/genui-lab. Node 26.7.0, Chromium headless shell 1255, exact model and dependency identities are recorded in each manifest.

```sh
npm ci --ignore-scripts --no-audit --no-fund
npx playwright install chromium --only-shell
npm run build
node --test generation/provider.test.mjs
```

## Generate

Place OPENAI_TOKEN in the repository-root .env. The trusted CLI reads only this value from that file for the fixed api.openai.com HTTPS endpoint. Run the five-task benchmark, or use a single custom prompt:

```sh
GENUI_PROVIDER=openai npm run generate
GENUI_PROVIDER=openai GENUI_PROTOCOL=oui GENUI_VARIANT=H2 GENUI_PROMPT='Explain minutes and hours with an adjustable duration.' npm run generate
```

Each run performs its live CSP and regression preflight before generation. Leave port 4187 available. A fresh timestamped directory under runs holds the manifest, preflight and episode files. An optional first command-line argument selects a fresh output directory. For a benchmark there are at most 180 provider calls, each capped at 768 output tokens. Ctrl-C cancels outstanding client requests. Incomplete content is recorded and never sent for execution. Generation and repairs receive only the versioned messages built by the harness. Inspect the retained messages alongside each original response.

For the optional local cohort, download the macOS arm64 binary archive from llama.cpp release b12810 and the official Q4_K_M weights from Qwen revision f86cb2c1fa58255f8052cc32aeede1b7482d4361. Verify the archive SHA-256 911e158dfc97d386b24101543dc9f7be50db09220f8ed80a63e1ddc0b7e119f7. The runner checks the extracted binary and GGUF hashes. Set GENUI_LLAMA_SERVER and GENUI_WEIGHTS to their absolute paths and run npm run generate. Leave port 4193 available. Weights are Apache-2.0 and llama.cpp is MIT. [Official binary release](https://github.com/ggml-org/llama.cpp/releases/tag/b12810) · [Official model and license](https://huggingface.co/Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF/tree/f86cb2c1fa58255f8052cc32aeede1b7482d4361)

## Replay without a model

```sh
npm run build
npm run replay -- evidence/goal-2a/openai
npm run replay -- evidence/goal-2a
npm run report -- evidence/goal-2a/openai
npm run report -- evidence/goal-2a
```

Replay starts a local production preview on an available loopback port. It checks every recorded disposition, accepted frame and text, and exercises generated controls using the independent B03 and B04 oracles. Provider-length truncations retain their terminal rejection without executing the partial source. Reporting combines the replay audit with the recorded semantic review. For a new corpus, review all delivered responses before using the report command.

To inspect an individual completed output, run npx vite preview --host 127.0.0.1, open /replay.html, select the protocol and paste the raw output. The same restricted client handles both interactive and automated replay. The page has no provider API or credentials.

## Evidence

| Evidence | OpenAI | Local Qwen |
|---|---|---|
| Pinned environment | [manifest](../evidence/goal-2a/openai/manifest.json) | [manifest](../evidence/goal-2a/manifest.json) |
| Model-enabled regression and security | [preflight](../evidence/goal-2a/openai/preflight.json) | [preflight](../evidence/goal-2a/preflight.json) |
| All prompts, outputs, repairs and diagnostics | [episodes](../evidence/goal-2a/openai/episodes) | [episodes](../evidence/goal-2a/episodes) |
| Replay and functional oracle outcomes | [audit](../evidence/goal-2a/openai/audit.json) | [audit](../evidence/goal-2a/audit.json) |
| Delivered-content semantic assessment | [review](../evidence/goal-2a/openai/semantic-review.json) | [review](../evidence/goal-2a/semantic-review.json) |
| Metrics including repair cost | [summary](../evidence/goal-2a/openai/summary.json) | [summary](../evidence/goal-2a/summary.json) |

[Example of the fully correct generated B04 explorer](../evidence/goal-2a/openai/B04-H2-oui-1703.png) · [Local example-copy failure](../evidence/goal-2a/B01-H2-oui-1701.png)

[Architecture decision and findings](../../../docs/architecture/adr/0003-restricted-generation.md) · [Provider cancellation and collection tests](../evidence/goal-2a/provider-tests.tap)
