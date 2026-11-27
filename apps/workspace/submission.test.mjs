import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { DatabaseSync } from "node:sqlite";
import { serve } from "./server.mjs";
import { compile } from "./domain.mjs";

test("HTTP generation checks the exact stored snapshot before calling the provider", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "submission-"));
  const path = join(directory, "test.sqlite"),
    calls = [];
  const server = await serve({
    path,
    port: 0,
    provider: async (messages) => {
      calls.push(messages);
      return { raw: "ok" };
    },
  });
  const db = new DatabaseSync(path);
  t.after(async () => {
    db.close();
    await new Promise((resolve) => server.close(resolve));
    await rm(directory, { recursive: true, force: true });
  });
  const origin = "http://127.0.0.1:" + server.address().port;
  const w = JSON.parse(
    await readFile(
      new URL("./evidence/pr4-review/journey.json", import.meta.url),
    ),
  ).workspace;
  function store(doc) {
    db.prepare("INSERT OR REPLACE INTO workspace VALUES(?,1,?)").run(
      doc.id,
      JSON.stringify(doc),
    );
  }
  function request(doc, node = doc.conversations.at(-1), refinement) {
    return fetch(origin + "/api", {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: JSON.stringify({
        op: "generate",
        id: doc.id,
        revision: 1,
        node: node.id,
        context: compile(doc, node),
        instruction: "Summarize",
        refinement,
      }),
    });
  }
  const snapshot = (doc) =>
    doc.conversations
      .at(-1)
      .references.find((r) => r.representation === "artifact").values[0];
  for (const change of [
    (v) => {
      v.projection = [];
    },
    (v) => {
      v.state.a = 999;
    },
    (v) => {
      v.source = "incorrect";
    },
  ]) {
    const bad = structuredClone(w);
    change(snapshot(bad));
    store(bad);
    assert.equal((await request(bad)).status, 400);
  }
  const changed = structuredClone(w);
  snapshot(changed).projection = [];
  store(changed);
  assert.equal((await request(w)).status, 400);
  const bad = structuredClone(w),
    art = bad.artifacts[0];
  art.state.a = 999;
  store(bad);
  assert.equal(
    (
      await request(bad, bad.conversations[0], {
        id: art.id,
        revision: art.revision,
        source: art.source,
        state: art.state,
      })
    ).status,
    400,
  );
  assert.equal(calls.length, 0);
  for (const doc of [
    w,
    JSON.parse(
      await readFile(
        new URL("./evidence/acceptance-final/journey.json", import.meta.url),
      ),
    ).workspace,
  ]) {
    store(doc);
    assert.equal(snapshot(doc).revision, 1);
    assert.equal(doc.artifacts[0].revision, 2);
    const response = await request(doc);
    assert.equal(response.status, 200, await response.text());
    const envelope = JSON.parse(calls.at(-1)[1].content).context;
    assert.deepEqual(
      envelope.included.find((e) => e.representation === "artifact").values,
      [snapshot(doc)],
    );
  }
  assert.equal(calls.length, 2);
});
