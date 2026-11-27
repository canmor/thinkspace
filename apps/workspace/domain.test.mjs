import test from "node:test";
import assert from "node:assert/strict";
import {
  workspace,
  append,
  branch,
  history,
  snapshot,
  compile,
} from "./domain.mjs";
test("anchors, direct inclusion, snapshot stability, missing sources and byte budget", () => {
  const w = workspace("Architecture Exploration"),
    root = w.conversations[0];
  const a = append(root, "assistant", "First"),
    child = branch(w, root, a.id);
  append(root, "assistant", "Later");
  assert.deepEqual(history(w, child), [a]);
  assert.equal(compile(w, child).included.length, 1);
  child.references.push(snapshot(root.id, "history", history(w, root)));
  append(root, "user", "Later still");
  const envelope = compile(w, child);
  assert.deepEqual(
    envelope.included[1].values.map((v) => v.content),
    ["Later"],
  );
  assert.equal(envelope.excluded[0].message, a.id);
  assert.throws(() => compile(w, child, 4), /budget/);
  child.references.push({ source: "missing" });
  assert.throws(() => compile(w, child), /Missing required/);
});
