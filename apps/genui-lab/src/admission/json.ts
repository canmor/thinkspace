import { parseExpressionAt, type Node } from "acorn";
import { resolveElementProps, type ComputedFunction } from "@json-render/core";
import { rank, rankParams } from "../catalog";
import {
  bind,
  boundedValue,
  check,
  fields,
  limits,
  number,
  safeKey,
  stateCheck,
  validateFrame,
  type Contract,
  type Item,
  type State,
} from "./policy";
const functions: Record<string, ComputedFunction> = {
  Rank: (args) => rank(rankParams.parse(args)),
  Add: ({ a, b }) => number.parse(number.parse(a) + number.parse(b)),
  Multiply: ({ a, b }) => number.parse(number.parse(a) * number.parse(b)),
  Excess: ({ a, b }) =>
    number.parse(Math.max(0, number.parse(a) - number.parse(b))),
};
function keys(input: unknown, expected: string[]) {
  check(
    input &&
      typeof input === "object" &&
      !Array.isArray(input) &&
      Object.keys(input).length === expected.length &&
      expected.every((k) => Object.hasOwn(input, k)),
    "Unexpected object fields",
  );
}
export function jsonProgram(source: string) {
  const doc = JSON.parse(source);
  // JSON.parse has already checked strict JSON syntax. Inspect its source tree
  // before using the decoded object because duplicate members disappear on decode.
  checkUniqueJsonMembers(source);
  keys(doc, ["root", "elements"]);
  check(
    safeKey(doc.root) &&
      doc.elements &&
      typeof doc.elements === "object" &&
      Object.hasOwn(doc.elements, doc.root),
    "Invalid root reference",
  );
  const root = doc.elements[doc.root];
  keys(root, ["type", "props", "children"]);
  keys(root.props, []);
  check(
    root.type === "Stack" &&
      Array.isArray(root.children) &&
      root.children.length <= limits.components,
    "Invalid Stack or component budget",
  );
  const visited = new Set([doc.root]),
    contract: Contract = new Map(),
    refs = new Set<string>();
  let nodes = 0;
  function inspect(v: unknown, depth: number) {
    check(
      ++nodes <= limits.syntaxNodes && depth <= limits.depth,
      "Static complexity budget",
    );
    if (!v || typeof v !== "object") {
      boundedValue(v);
      return;
    }
    if (Array.isArray(v)) {
      check(v.length <= limits.collection, "Collection budget");
      v.forEach((x) => inspect(x, depth + 1));
      return;
    }
    const obj = v as Record<string, unknown>;
    if (Object.hasOwn(obj, "$state") || Object.hasOwn(obj, "$bindState")) {
      const k = Object.hasOwn(obj, "$state") ? "$state" : "$bindState";
      keys(obj, [k]);
      const path = obj[k];
      check(
        typeof path === "string" &&
          path.startsWith("/") &&
          safeKey(path.slice(1)),
        "Invalid state path",
      );
      refs.add(path.slice(1));
      return;
    }
    if (Object.hasOwn(obj, "$computed")) {
      keys(obj, ["$computed", "args"]);
      const name = obj.$computed;
      check(
        typeof name === "string" && Object.hasOwn(functions, name),
        "Unknown function",
      );
      keys(obj.args, name === "Rank" ? ["rows", "a", "b", "c"] : ["a", "b"]);
      inspect(obj.args, depth + 1);
      return;
    }
    check(Object.keys(obj).length <= limits.collection, "Collection budget");
    for (const [k, x] of Object.entries(obj)) {
      check(safeKey(k), "Unauthorized key: " + k);
      inspect(x, depth + 1);
    }
  }
  const plan = root.children.map((key: string) => {
    check(
      typeof key === "string" &&
        safeKey(key) &&
        !visited.has(key) &&
        Object.hasOwn(doc.elements, key),
      "Unknown, duplicate or cyclic component",
    );
    visited.add(key);
    const el = doc.elements[key];
    keys(el, ["type", "props"]);
    const type = el.type as keyof typeof fields;
    check(Object.hasOwn(fields, type), "Unknown component");
    keys(el.props, Object.keys(fields[type].shape));
    inspect(el.props, 0);
    let binding: string | undefined;
    if (type === "Control") {
      const v = el.props.value;
      keys(v, ["$bindState"]);
      binding = String(v.$bindState).slice(1);
      bind(contract, binding, el.props.min, el.props.max, el.props.choices);
    }
    return { type, props: el.props, binding };
  }) as {
    type: keyof typeof fields;
    props: Record<string, unknown>;
    binding?: string;
  }[];
  check(
    visited.size === Object.keys(doc.elements).length &&
      [...refs].every((k) => contract.has(k)),
    "Unreachable component or missing state",
  );
  const defaults = Object.fromEntries(
    [...contract].map(([k, v]) => [k, v.min]),
  );
  return {
    contract,
    defaults,
    run(state: State) {
      stateCheck(contract, state);
      const items = plan.map(({ type, props, binding }) => {
        const values = resolveElementProps(props, {
          stateModel: state,
          functions,
        });
        boundedValue(values);
        return { type, props: values, binding } as Item;
      });
      return validateFrame({ items, state });
    },
  };
}

function checkUniqueJsonMembers(source: string) {
  const tree = parseExpressionAt(source, source.search(/\S/), {
    ecmaVersion: 2022,
  });
  let count = 0;
  function walk(node: Node, depth: number) {
    check(
      ++count <= limits.syntaxNodes && depth <= limits.depth,
      "JSON syntax budget",
    );
    const n = node as Node & {
      properties?: { key: { value: string }; value: Node }[];
      elements?: Node[];
    };
    if (n.properties) {
      const keys = new Set<string>();
      for (const p of n.properties) {
        check(!keys.has(p.key.value), "Duplicate JSON field");
        keys.add(p.key.value);
        walk(p.value, depth + 1);
      }
    }
    n.elements?.forEach((x) => walk(x, depth + 1));
  }
  walk(tree, 0);
}
