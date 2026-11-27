import { history } from "./domain.mjs";
const object = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const string = (v) => typeof v === "string" && v.length > 0;
const state = (v) => object(v) && Object.values(v).every(Number.isSafeInteger);
const check = (ok, field) => {
  if (!ok) throw Error("Invalid workspace: " + field);
};
export function compatibility(a) {
  check(
    a.protocol === "oui@1.2.0" &&
      a.catalog === "1.1" &&
      (a.policy ?? "1.5.0") === "1.5.0",
    "unsupported artifact protocol, catalog or policy",
  );
}
export function validateWorkspace(w, id = w?.id) {
  check(
    w?.schema === 1 && string(id) && w.id === id && string(w.name),
    "identity or schema",
  );
  check(
    Array.isArray(w.conversations) &&
      w.conversations.length &&
      Array.isArray(w.artifacts) &&
      Array.isArray(w.generations) &&
      object(w.positions),
    "collections",
  );
  const ids = new Set();
  function unique(item) {
    check(
      string(item?.id) && !ids.has(item.id),
      "duplicate or missing identity",
    );
    ids.add(item.id);
  }
  for (const g of w.generations) {
    unique(g);
    check(
      Array.isArray(g.messages) && g.messages.every((m) => string(m.content)),
      "generation messages",
    );
  }
  for (const c of w.conversations) {
    unique(c);
    check(
      string(c.title) &&
        Array.isArray(c.messages) &&
        Array.isArray(c.references),
      "conversation",
    );
    for (const m of c.messages) {
      unique(m);
      check(
        m.conversation === c.id &&
          ["assistant", "user"].includes(m.role) &&
          string(m.content),
        "message",
      );
      if (m.role === "assistant") {
        let envelope;
        try {
          envelope = JSON.parse(m.content);
        } catch {
          throw Error("Invalid workspace: assistant envelope");
        }
        check(
          envelope?.version === "2b1" &&
            Array.isArray(envelope.blocks) &&
            envelope.blocks.length > 0 &&
            envelope.blocks.length <= 8 &&
            envelope.blocks.every((b) =>
              b?.type === "text"
                ? string(b.text)
                : b?.type === "ui" &&
                  string(b.source) &&
                  Array.isArray(b.state) &&
                  b.state.every(
                    (s) => string(s.name) && Number.isSafeInteger(s.value),
                  ),
            ),
          "assistant envelope",
        );
        const views = envelope.blocks.filter((b) => b.type === "ui");
        check(
          views.length === (m.artifact ? 1 : 0) &&
            (!m.artifact ||
              w.artifacts.some(
                (a) => a.id === m.artifact && a.origin?.message === m.id,
              )),
          "message artifact",
        );
      }
    }
  }
  const nodes = [...w.conversations, ...w.artifacts];
  for (const a of w.artifacts) {
    unique(a);
    compatibility(a);
    check(
      string(a.title) &&
        typeof a.promoted === "boolean" &&
        Array.isArray(a.versions) &&
        a.revision === a.versions.length + 1,
      "artifact revision",
    );
    const m = w.conversations
      .find((c) => c.id === a.origin?.conversation)
      ?.messages.find((m) => m.id === a.origin.message);
    check(
      m?.artifact === a.id &&
        m.role === "assistant" &&
        JSON.parse(m.content).blocks[a.origin.block]?.type === "ui",
      "artifact origin",
    );
    for (const [i, v] of [...a.versions, a].entries())
      check(
        v.revision === i + 1 &&
          string(v.source) &&
          state(v.state) &&
          Array.isArray(v.projection) &&
          w.generations.some((g) => g.id === v.generation),
        "revision content or generation",
      );
  }
  for (const c of w.conversations) {
    history(w, c);
    for (const r of c.references) {
      unique(r);
      check(Array.isArray(r.values), "snapshot values");
      if (r.representation === "artifact") {
        const a = w.artifacts.find((a) => a.id === r.source),
          v = r.values[0];
        check(
          a?.promoted &&
            r.values.length === 1 &&
            Number.isInteger(v?.revision) &&
            v.revision >= 1 &&
            v.revision <= a.revision &&
            state(v.state) &&
            Array.isArray(v.projection) &&
            v.protocol === a.protocol,
          "artifact snapshot",
        );
        compatibility({ ...a, ...v });
      } else {
        const source = w.conversations.find((n) => n.id === r.source);
        check(
          source && ["conversation", "message"].includes(r.representation),
          "reference source",
        );
        const messages = history(w, source);
        check(
          r.representation !== "message" || r.values.length === 1,
          "message snapshot",
        );
        check(
          r.values.every((m, i) => {
            const original =
              r.representation === "conversation"
                ? messages[i]
                : messages.find((o) => o.id === m.id);
            return (
              original &&
              original.id === m.id &&
              original.content === m.content &&
              original.role === m.role &&
              original.conversation === m.conversation
            );
          }),
          "historical snapshot",
        );
      }
    }
  }
  for (const [key, p] of Object.entries(w.positions))
    check(
      nodes.some((n) => n.id === key) &&
        Number.isFinite(p?.x) &&
        Number.isFinite(p.y),
      "graph position",
    );
}
