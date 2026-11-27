const id = () => crypto.randomUUID();
export function workspace(name) {
  if (!name.trim()) throw Error("A workspace name is required");
  return {
    schema: 1,
    id: id(),
    name,
    conversations: [conversation("Exploration")],
    artifacts: [],
    generations: [],
    positions: {},
  };
}
export function conversation(title, parent = null) {
  return { id: id(), title, parent, messages: [], references: [] };
}
export function history(w, node, seen = new Set()) {
  if (seen.has(node.id)) throw Error("Branch cycle");
  seen.add(node.id);
  if (!node.parent) return [...node.messages];
  const parent = w.conversations.find((c) => c.id === node.parent.conversation);
  if (!parent) throw Error("Missing parent");
  const prefix = history(w, parent, seen);
  const index = prefix.findIndex(
    (m) => m.id === node.parent.message && m.role === "assistant",
  );
  if (index < 0) throw Error("Missing assistant anchor");
  return [...prefix.slice(0, index + 1), ...node.messages];
}
export function append(node, role, content) {
  const message = { id: id(), conversation: node.id, role, content };
  node.messages.push(message);
  return message;
}
export function branch(w, node, anchor) {
  const child = conversation("Branch of " + node.title, {
    conversation: node.id,
    message: anchor,
  });
  history(w, child);
  w.conversations.push(child);
  return child;
}
export function snapshot(source, representation, values) {
  return { id: id(), source, representation, values: structuredClone(values) };
}
export function compile(w, node, budget = 64000) {
  const seen = new Set(),
    included = [],
    excluded = [];
  for (const ref of [
    {
      id: node.id,
      source: node.id,
      representation: "history",
      values: history(w, node),
    },
    ...node.references,
  ]) {
    if (!Array.isArray(ref.values))
      throw Error("Missing required source " + ref.source);
    const values = ref.values.filter((value) => {
      if (ref.representation === "artifact") return true;
      if (seen.has(value.id)) {
        excluded.push({
          source: ref.id,
          message: value.id,
          reason: "Duplicate message",
        });
        return false;
      }
      seen.add(value.id);
      return true;
    });
    included.push({
      source: ref.source,
      snapshot: ref.id,
      representation: ref.representation,
      values,
    });
  }
  const envelope = { version: 1, included, excluded };
  if (new TextEncoder().encode(JSON.stringify(envelope)).length > budget)
    throw Error("Required context exceeds UTF-8 byte budget");
  return envelope;
}
