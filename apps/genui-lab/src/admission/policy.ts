import { z } from "zod";
import { shapes } from "../svg-schema";
export const versions = {
  catalog: "1.1",
  policy: "1.5.0",
  oui: "1.2.0",
  json: "0.23.2",
} as const;
export type Protocol = "oui" | "json";
export const limits = Object.freeze({
  sourceBytes: 16000,
  envelopeBytes: 64000,
  statements: 64,
  syntaxNodes: 1500,
  depth: 32,
  collection: 40,
  components: 40,
  svgNodes: 120,
  frameBytes: 10000,
  resultNodes: 1500,
  text: 512,
  updates: 512,
  queue: 8,
  deadlineMs: 2000,
  magnitude: 1e9,
});
export function check(ok: unknown, message: string): asserts ok {
  if (!ok) throw new Error(message);
}
export function bytes(value: string) {
  return new TextEncoder().encode(value).length;
}
export function safeKey(key: string) {
  return (
    typeof key === "string" &&
    /^[A-Za-z][A-Za-z0-9_]{0,47}$/.test(key) &&
    !Object.hasOwn(Object.prototype, key) &&
    key !== "prototype"
  );
}
export type State = Record<string, number>;
export const number = z
  .number()
  .finite()
  .min(-limits.magnitude)
  .max(limits.magnitude);
const label = z.string().min(1).max(limits.text);
export const fields = {
  Text: z.object({ text: label }).strict(),
  Metric: z.object({ label, value: number }).strict(),
  Control: z
    .object({
      label,
      value: number.int(),
      min: number.int(),
      max: number.int(),
      choices: z.array(label).max(limits.collection),
    })
    .strict(),
  Table: z
    .object({
      values: z.array(z.object({ label, score: number }).strict()).max(30),
    })
    .strict(),
  Graphic: z.object({ label, items: shapes }).strict(),
};
export type Item = {
  [K in keyof typeof fields]: {
    type: K;
    props: z.infer<(typeof fields)[K]>;
    binding?: string;
  };
}[keyof typeof fields];
export type Frame = { items: Item[]; state: State };
export type Contract = Map<string, { min: number; max: number }>;
export function stateCheck(contract: Contract, state: State) {
  check(
    state &&
      typeof state === "object" &&
      !Array.isArray(state) &&
      Object.keys(state).length === contract.size,
    "Invalid state fields",
  );
  for (const [key, { min, max }] of contract) {
    const n = state[key];
    check(Object.hasOwn(state, key), "Invalid state fields");
    check(
      Number.isSafeInteger(n) && n >= min && n <= max,
      "Invalid state value: " + key,
    );
  }
}
export function bind(
  contract: Contract,
  key: string,
  min: unknown,
  max: unknown,
  choices: unknown,
) {
  check(
    safeKey(key) && !contract.has(key),
    "Invalid or duplicate control binding",
  );
  const bounds = fields.Control.parse({
    label: "binding",
    min,
    max,
    value: min,
    choices,
  });
  check(
    bounds.min <= bounds.max &&
      (!bounds.choices.length ||
        (bounds.min === 0 && bounds.max === bounds.choices.length - 1)),
    "Invalid control domain",
  );
  contract.set(key, bounds);
}
export function validateFrame(frame: Frame) {
  check(frame.items.length <= limits.components, "Component budget");
  let svgCount = 0,
    weight = 0;
  for (const item of frame.items) {
    weight += boundedValue(item.props);
    check(weight <= limits.resultNodes, "Aggregate frame budget");
    fields[item.type].parse(item.props);
    if (item.type === "Graphic")
      for (const shape of item.props.items)
        svgCount += shape.kind === "group" ? 1 + shape.items.length : 1;
  }
  check(svgCount <= limits.svgNodes, "SVG aggregate budget");
  check(bytes(JSON.stringify(frame)) <= limits.frameBytes, "Frame byte budget");
  return frame;
}
export function boundedValue(value: unknown) {
  let count = 0;
  function visit(v: unknown, depth: number) {
    check(
      ++count <= limits.resultNodes && depth <= limits.depth,
      "Value expansion budget",
    );
    if (typeof v === "number") number.parse(v);
    else if (typeof v === "string")
      check(v.length <= limits.text, "Text budget");
    else if (v !== null && typeof v === "object") {
      const entries = Object.entries(v);
      check(entries.length <= limits.collection, "Collection budget");
      for (const [k, x] of entries) {
        check(Array.isArray(v) || safeKey(k), "Unsafe object key");
        visit(x, depth + 1);
      }
    } else check(typeof v === "boolean" || v === null, "Invalid value");
  }
  visit(value, 0);
  return count;
}
