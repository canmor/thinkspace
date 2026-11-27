import { openProgram } from "./open";
import { jsonProgram } from "./json";
import { bytes, check, limits, type Protocol, type State } from "./policy";
export function admit(protocol: Protocol, source: string, seed?: State, chartEnabled = false) {
  check(
    typeof source === "string" &&
      source.length <= limits.sourceBytes &&
      bytes(source) <= limits.sourceBytes,
    "Source byte budget",
  );
  check(protocol === "json" || protocol === "oui", "Unknown protocol");
  const program =
    protocol === "oui" ? openProgram(source, chartEnabled) : jsonProgram(source, chartEnabled);
  if (seed !== undefined)
    check(
      seed && typeof seed === "object" && !Array.isArray(seed),
      "Invalid state fields",
    );
  let state = { ...(seed === undefined ? program.defaults : seed) },
    updates = 0;
  const initial = program.run(state);
  return {
    initial,
    change(key: string, value: number) {
      check(++updates <= limits.updates, "Reactive update budget");
      check(program.contract.has(key), "Unknown state mutation");
      const next = { ...state, [key]: value };
      const frame = program.run(next);
      state = next;
      return frame;
    },
  };
}
