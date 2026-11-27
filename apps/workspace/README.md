# Thinkspace workspace

Run from the repository root with Node 26.7.0 and npm. The local Web application uses the GenUI Lab's locked dependencies and a separate Vite entry. The trusted server binds to the IPv4 loopback interface.

```sh
npm ci --prefix apps/genui-lab
(cd apps/genui-lab && npx --no-install vite build --config workspace.config.mjs)
node --env-file=.env apps/workspace/server.mjs
```

Open [the workspace](http://127.0.0.1:4178). Supply an authorized OpenAI API credential in the server environment as `OPENAI_API_KEY` or use the lab's ignored `.env` with `OPENAI_TOKEN`. Omit the env-file argument when using an exported variable. The live adapter uses the experimental gpt-6.2-sol configuration and requires access to that model. The default database is `~/.thinkspace/workspaces.sqlite`. Set `THINKSPACE_DB` to use a different local file. Local workspace records include conversation content and submitted context in plaintext.

## Walk through the review scenario

1. Create **Architecture Exploration**. Ask for a short comparison of Native Hybrid, Tauri and Electron.
2. Request the B03 matrix using the following message.

   > Build an interactive weighted comparison of Native Hybrid [9,8,7], Tauri [7,8,8], and Electron [6,4,10]. The three criteria are native experience, lightweight runtime, delivery efficiency. Start with integer weights 40,25,35. Normalize by their sum, rank descending, and show no ranking if all weights are zero. Scores are synthetic.

3. Change the native-experience weight to zero. Inspect the ranking, then choose **Open as workspace artifact**. The artifact is accessible from its own graph node.
4. Select the original conversation and choose **Branch here** under the first assistant message. The branch contains only the historical prefix through that answer.
5. Choose **New conversation**. In **Context inspector**, include a snapshot of the original exploration or an individual message, then include the artifact. Inspect the compiled data. Ask for a synthesis. Expand **Submitted context** under the answer to inspect the historical manifest.
6. Open the artifact node. Ask it to clarify its synthetic-score assumptions in the UI while retaining all existing controls, domains, bindings and calculations. A rejected revision displays a diagnostic. Change the request and retry.
7. Drag a node. Close the browser and stop the server. Restart the same command, reopen the workspace and inspect the graph, artifact revision, weights and references.

## Verification

```sh
(cd apps/genui-lab && npx --no-install vite build --config workspace.config.mjs)
node --test apps/workspace/*.test.mjs
cd apps/genui-lab
npx --no-install playwright install chromium
npm run build
GENUI_PROVIDER_PREFLIGHT=openai npm test
npx --no-install vite build --config workspace.config.mjs
node workspace/journey.mjs /tmp/thinkspace-deterministic-review
node --env-file=../../.env workspace/journey.mjs /tmp/thinkspace-live-review --live
```

Use fresh output directories. The deterministic runner supplies a test provider through the server constructor. The live runner uses four real remote requests with synthetic task material. Each starts a separate local database and browser profile, captures the stages and compares workspace records across a backend restart. The deterministic runner also exercises rejection and injects an over-budget persisted source before a final restore. The application never serves the test runner or its fixture.

[Evidence and limitations](evidence/README.md) · [Architecture proposal](../../docs/architecture/adr/0006-integrated-walking-skeleton.md)
