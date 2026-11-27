import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { workspace, append, branch } from "./domain.mjs";
import { openStore } from "./store.mjs";
test("restart restores branch, anchor and positions and rejects a stale writer", (t) => {
  const directory = mkdtempSync(join(tmpdir(), "thinkspace-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const path = join(directory, "workspace.sqlite");
  const w = workspace("Architecture Exploration"),
    root = w.conversations[0];
  const child = branch(
    w,
    root,
    append(
      root,
      "assistant",
      JSON.stringify({
        version: "2b1",
        blocks: [{ type: "text", text: "Alternatives" }],
      }),
    ).id,
  );
  w.positions[child.id] = { x: 200, y: 120 };
  let store = openStore(path);
  store.save(w, 0);
  store.close();
  store = openStore(path);
  t.after(() => store.close());
  const restored = store.read(w.id);
  assert.deepEqual(restored.value, w);
  store.save(w, restored.revision);
  assert.throws(
    () => store.save({ ...w, name: "Stale" }, restored.revision),
    /changed/,
  );
  assert.equal(store.read(w.id).value.name, w.name);
});
