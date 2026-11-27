import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openStore } from "./store.mjs";
import { validateWorkspace } from "./integrity.mjs";
import { generate } from "./generate.mjs";
const baseline = JSON.parse(
  readFileSync(
    new URL("./evidence/acceptance-final/journey.json", import.meta.url),
  ),
).workspace;
test("legacy workspace opens; invalid identities, references and version contracts fail at both SQLite boundaries", (t) => {
  const directory = mkdtempSync(join(tmpdir(), "ws-review-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const path = join(directory, "test.db"),
    store = openStore(path),
    db = new DatabaseSync(path);
  t.after(() => {
    db.close();
    store.close();
  });
  store.save(baseline, 0);
  assert.deepEqual(store.read(baseline.id).value, baseline);
  for (const damage of [
    (w) => {
      w.artifacts[0].catalog = "unknown";
    },
    (w) => {
      w.artifacts[0].protocol = "unknown";
    },
    (w) => {
      w.artifacts[0].policy = "unknown";
    },
    (w) => {
      w.conversations[1].parent.message = "missing";
    },
    (w) => {
      w.artifacts = [];
    },
    (w) => {
      w.conversations[0].messages[1].content = "broken";
    },
    (w) => {
      w.conversations[0].id = w.conversations[1].id;
    },
    (w) => {
      w.conversations.at(-1).references[0].values = [{}];
    },
    (w) => {
      w.conversations.at(-1).references[0].source = "missing";
    },
  ]) {
    const bad = structuredClone(baseline);
    damage(bad);
    assert.throws(() => store.save(bad, 1));
    db.prepare("UPDATE workspace SET document=? WHERE id=?").run(
      JSON.stringify(bad),
      bad.id,
    );
    assert.throws(() => store.read(bad.id));
  }
});
test("provider exception retains attributed request and retry diagnosis", async () => {
  validateWorkspace(baseline);
  const result = await generate(
    baseline,
    baseline.conversations[0],
    "Retryable example",
    async () => {
      throw Error("Provider offline");
    },
  );
  assert.equal(result.status, "retryable-error");
  assert.equal(result.diagnostic, "Provider offline");
  assert.equal(result.messages.at(-1).content, "Retryable example");
  assert.deepEqual(
    JSON.parse(result.messages[1].content).context,
    result.context,
  );
});
