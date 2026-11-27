// Bindings are stable only within this artifact. Require the complete previous
// control contract as well. A rename, removed control or domain change needs review.
export function migrateControls(previous, candidate) {
  const controls = (frame) =>
    frame.items.filter((item) => item.type === "Control");
  const state = { ...candidate.state };
  const current = controls(candidate);
  for (const field of controls(previous)) {
    const matches = current.filter((item) => item.binding === field.binding);
    const sameContract =
      matches.length === 1 &&
      ["label", "min", "max", "choices"].every(
        (key) =>
          JSON.stringify(matches[0].props[key]) ===
          JSON.stringify(field.props[key]),
      );
    if (!sameContract)
      throw Error("Ambiguous control migration: " + field.binding);
    state[field.binding] = previous.state[field.binding];
  }
  return state;
}
