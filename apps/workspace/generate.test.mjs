import assert from "node:assert/strict";
import test from "node:test";
import { workspace, append } from "./domain.mjs";
import { generate } from "./generate.mjs";
test("provider receives the inspected attributed history", async () => {
  const w = workspace("Architecture Exploration"),
    c = w.conversations[0];
  const m = append(c, "assistant", "Historical comparison");
  let received;
  const record = await generate(w, c, "Synthesize", async (messages) => {
    received = structuredClone(messages);
    return {
      raw: '{"version":"2b1","blocks":[{"type":"text","text":"Synthesis"}]}',
    };
  });
  assert.deepEqual(JSON.parse(received[1].content).context, record.context);
  assert.equal(record.context.included[0].values[0].id, m.id);
  assert.equal(received[2].content, "Synthesize");
});
