import { parseExpressionAt, type Node } from "acorn";
import { parseExpression as upstream, tokenize } from "@openuidev/lang-core";
import { check, limits, safeKey } from "./policy";
// Acorn checks complete syntax of the shared expression subset. Its AST never runs.
// Preserve string boundaries. Only the two permitted @ calls lose their sigil.
export function parseExpression(source: string) {
  const tokens = source.match(
    /"(?:[^"\\\x00-\x1f]|\\["\\/bfnrt]|\\u[0-9a-fA-F]{4})*"|@[A-Za-z]+|\$?[A-Za-z][A-Za-z0-9_]*|(?:0|[1-9][0-9]*)(?:\.[0-9]+)?|==|[ \t]+|[()\[\]{},:?+*/<>-]/gy,
  );
  check(tokens && tokens.join("") === source, "Malformed expression token");
  let depth = 0;
  const normalized = tokens
    .map((t) => {
      if (["(", "[", "{"].includes(t))
        check(++depth <= limits.depth, "Syntax depth");
      if ([")", "]", "}"].includes(t)) check(--depth >= 0, "Syntax balance");
      if (t.startsWith("@")) {
        check(
          t === "@Sum" || t === "@Sort",
          "Function capability denied: " + t,
        );
        return t.slice(1);
      }
      check(t !== "Sort" && t !== "Sum", "Function sigil required");
      return t;
    })
    .join("");
  check(!depth, "Syntax balance");
  check(
    !tokens.some(
      (t, i) => t === "/" && (tokens[i + 1] === "/" || tokens[i + 1] === "*"),
    ),
    "Comments outside profile",
  );
  const wrapped = "(" + normalized + ")";
  const strict = parseExpressionAt(wrapped, 0, {
    ecmaVersion: 2022,
    preserveParens: true,
  });
  check(strict.end === wrapped.length, "Trailing syntax");
  let count = 0;
  function inspect(node: Node) {
    check(++count <= limits.syntaxNodes, "Syntax budget");
    check(
      [
        "ParenthesizedExpression",
        "Identifier",
        "Literal",
        "CallExpression",
        "ArrayExpression",
        "ObjectExpression",
        "Property",
        "BinaryExpression",
        "ConditionalExpression",
      ].includes(node.type),
      "Unsupported syntax: " + node.type,
    );
    const n = node as Node & {
      properties?: {
        key: { name?: string; value?: string };
        computed: boolean;
        shorthand: boolean;
        method: boolean;
        kind: string;
      }[];
      elements?: unknown[];
      callee?: Node;
    };
    if (node.type === "BinaryExpression")
      check(
        ["+", "-", "*", "/", "==", ">", "<"].includes(
          (node as Node & { operator: string }).operator,
        ),
        "Operator denied",
      );
    if (node.type === "Literal") {
      const v = (node as Node & { value: unknown }).value;
      check(
        typeof v === "string" || typeof v === "number",
        "Unsupported literal",
      );
    }
    if (n.properties) {
      const keys = new Set();
      for (const p of n.properties) {
        const k = p.key.name ?? p.key.value;
        check(
          k &&
            safeKey(k) &&
            !keys.has(k) &&
            !p.computed &&
            !p.shorthand &&
            !p.method &&
            p.kind === "init",
          "Invalid object property",
        );
        keys.add(k);
      }
    }
    if (n.elements) check(!n.elements.includes(null), "Sparse collection");
    if (n.callee) check(n.callee.type === "Identifier", "Invalid call target");
    for (const value of Object.values(node)) {
      for (const child of Array.isArray(value) ? value : [value])
        if (child && typeof child === "object" && "type" in child)
          inspect(child);
    }
  }
  inspect(strict);
  return upstream(tokenize(source));
}
