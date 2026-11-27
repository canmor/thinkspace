import test from "node:test";
import assert from "node:assert/strict";
import { migrateControls } from "./artifact.mjs";
test("binding identity and complete contracts control migration; new fields keep admitted defaults", () => {
  const field = {
    type: "Control",
    binding: "a",
    props: { label: "Quality", min: 0, max: 10, choices: [] },
  };
  const previous = { items: [field], state: { a: 7 } };
  const candidate = {
    items: [field, { ...field, binding: "b" }],
    state: { a: 0, b: 3 },
  };
  assert.deepEqual(migrateControls(previous, candidate), { a: 7, b: 3 });
  for (const items of [
    [],
    [field, field],
    [{ ...field, binding: "replacement" }],
    [{ ...field, props: { ...field.props, max: 5 } }],
    [{ ...field, props: { ...field.props, label: "Cost" } }],
  ]) {
    assert.throws(
      () => migrateControls(previous, { items, state: { a: 1 } }),
      /Ambiguous/,
    );
  }
  assert.equal(previous.state.a, 7);
});
