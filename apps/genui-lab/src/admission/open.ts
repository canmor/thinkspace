import { parseExpression as strictExpression } from "./syntax";
import { evaluate, type ASTNode } from "@openuidev/lang-core";
import {
  bind,
  boundedValue,
  check,
  fields,
  limits,
  safeKey,
  stateCheck,
  validateFrame,
  type Contract,
  type Item,
  type State,
} from "./policy";
const props = {
  Text: ["text"],
  Metric: ["label", "value"],
  Control: ["label", "min", "max", "choices", "value"],
  Graphic: ["label", "items"],
  Table: ["values"],
} as const;
export function openProgram(source: string) {
  const lines = source
    .trim()
    .split(/\r?\n/)
    .filter((s) => s.trim());
  check(lines.length <= limits.statements, "Statement budget");
  const defs = new Map<string, ASTNode>(),
    states: State = Object.create(null);
  for (const line of lines) {
    const match = /^\s*(\$?[A-Za-z][A-Za-z0-9_]*)\s*=\s*(.+?)\s*$/.exec(line);
    check(
      match && safeKey(match[1].replace(/^\$/, "")) && !defs.has(match[1]),
      "Invalid or duplicate declaration",
    );
    const ast = strictExpression(match[2]);
    defs.set(match[1], ast);
    if (match[1].startsWith("$")) {
      check(
        ast.k === "Num" && Number.isSafeInteger(ast.v),
        "State default must be integer",
      );
      states[match[1].slice(1)] = ast.v;
    }
  }
  const root = defs.get("root");
  check(
    root?.k === "Comp" &&
      root.name === "Stack" &&
      root.args.length === 1 &&
      root.args[0].k === "Arr",
    "Expected Stack root",
  );
  const children = root.args[0].els;
  check(children.length <= limits.components, "Component budget");
  const contract: Contract = new Map(),
    seen = new Set<string>(["root"]),
    active = new Set<string>();
  let work = 0;
  function inspect(n: ASTNode, depth: number) {
    check(
      ++work <= limits.syntaxNodes && depth <= limits.depth,
      "Static expansion budget",
    );
    if (n.k === "Ref" || n.k === "StateRef") {
      const ref = defs.get(n.n);
      check(ref && !active.has(n.n), "Unknown or cyclic reference: " + n.n);
      seen.add(n.n);
      active.add(n.n);
      inspect(ref, depth + 1);
      active.delete(n.n);
    } else if (n.k === "Arr" || n.k === "Obj") {
      const nodes =
        n.k === "Arr"
          ? n.els
          : n.entries.map(([key, v]) => {
              check(safeKey(key), "Unsafe key");
              return v;
            });
      check(nodes.length <= limits.collection, "Collection budget");
      nodes.forEach((x) => inspect(x, depth + 1));
    } else if (n.k === "Comp") {
      check(
        (n.name === "Sum" && n.args.length === 1) ||
          (n.name === "Sort" &&
            n.args.length === 3 &&
            n.args[1].k === "Str" &&
            n.args[1].v === "score" &&
            n.args[2].k === "Str" &&
            ["asc", "desc"].includes(n.args[2].v)),
        "Function capability denied: " + n.name,
      );
      n.args.forEach((x) => inspect(x, depth + 1));
    } else if (n.k === "BinOp") {
      check(
        ["+", "-", "*", "/", "==", ">", "<"].includes(n.op),
        "Operator denied",
      );
      inspect(n.left, depth + 1);
      inspect(n.right, depth + 1);
    } else if (n.k === "Ternary") {
      inspect(n.cond, depth + 1);
      inspect(n.then, depth + 1);
      inspect(n.else, depth + 1);
    } else if (n.k === "Num" || n.k === "Str") boundedValue(n.v);
    else throw Error("Expression denied: " + n.k);
  }
  const plan = children.map((child) => {
    check(
      child.k === "Ref" && !seen.has(child.n),
      "Expected unique component reference",
    );
    seen.add(child.n);
    const comp = defs.get(child.n);
    check(
      comp?.k === "Comp" && Object.hasOwn(props, comp.name),
      "Component capability denied",
    );
    const type = comp.name as keyof typeof props;
    check(comp.args.length === props[type].length, "Component arity");
    let binding: string | undefined;
    if (type === "Control") {
      const [, min, max, options, value] = comp.args;
      check(
        min.k === "Num" &&
          max.k === "Num" &&
          options.k === "Arr" &&
          value.k === "StateRef",
        "Static control contract required",
      );
      binding = value.n.slice(1);
      bind(
        contract,
        binding,
        min.v,
        max.v,
        options.els.map((x) => {
          check(x.k === "Str", "Invalid option");
          return x.v;
        }),
      );
    }
    comp.args.forEach((x) => inspect(x, 1));
    return { type, args: comp.args, binding };
  });
  check(seen.size === defs.size, "Unreachable declaration");
  stateCheck(contract, states);
  function run(state: State) {
    stateCheck(contract, state);
    const cache = new Map<string, unknown>();
    const context = {
      getState: (k: string) => state[k.slice(1)],
      resolveRef: (k: string): unknown => {
        if (!cache.has(k)) cache.set(k, checked(defs.get(k)!));
        return cache.get(k);
      },
    };
    // Inspect operands before delegating arithmetic to the upstream evaluator. Reject
    // coercion and zero divisors. Validate intermediate results before publication.
    function checked(n: ASTNode): unknown {
      if (n.k === "BinOp") {
        const left = checked(n.left),
          right = checked(n.right);
        check(
          typeof left === "number" && typeof right === "number",
          "Numeric operands required",
        );
        check(n.op !== "/" || right !== 0, "Division by zero");
      } else if (n.k === "Ternary") {
        check(
          typeof checked(n.cond) === "boolean",
          "Boolean condition required",
        );
        return checked(evaluate(n.cond, context) ? n.then : n.else);
      } else if (n.k === "Arr") n.els.forEach(checked);
      else if (n.k === "Obj") n.entries.forEach(([, x]) => checked(x));
      else if (n.k === "Comp") {
        const input = checked(n.args[0]);
        check(Array.isArray(input), "Array operand required");
        if (n.name === "Sum")
          check(
            input.every((x) => typeof x === "number"),
            "Sum requires numbers",
          );
        else fields.Table.parse({ values: input });
      }
      const result = evaluate(n, context);
      boundedValue(result);
      return result;
    }
    const items = plan.map(
      ({ type, args, binding }) =>
        ({
          type,
          binding,
          props: Object.fromEntries(
            props[type].map((k, i) => [k, checked(args[i])]),
          ),
        }) as Item,
    );
    return validateFrame({ items, state });
  }
  return { contract, defaults: states, run };
}
