import { useProjection } from "./projection";
import { z } from "zod";
import type { ReactNode } from "react";

import { shapes, type Leaf } from "./svg-schema";
export { shapes } from "./svg-schema";
export const rows = z
  .array(z.tuple([z.string(), z.array(z.number()).length(3)]))
  .max(30);
export const rankParams = z.object({
  rows,
  a: z.number(),
  b: z.number(),
  c: z.number(),
});
export function rank(args: z.infer<typeof rankParams>) {
  const weights = [args.a, args.b, args.c];
  const sum = weights.reduce((a, b) => a + b, 0);
  if (!sum) return [];
  return args.rows
    .map(([label, values]) => ({
      label,
      score: values.reduce((n, v, i) => n + v * weights[i], 0) / sum,
    }))
    .sort((x, y) => y.score - x.score);
}
export const scores = z
  .array(z.object({ label: z.string(), score: z.number() }))
  .max(30);
export function Stack({ children }: { children: ReactNode }) {
  return <div className="stack">{children}</div>;
}
export function Control({
  label,
  value,
  min,
  max,
  choices,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  choices: string[];
  onChange: (n: number) => void;
}) {
  return (
    <label>
      {label}{" "}
      {choices.length ? (
        <select
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        >
          {choices.map((s, i) => (
            <option key={s} value={i}>
              {s}
            </option>
          ))}
        </select>
      ) : (
        <>
          <output>{value}</output>
          <input
            type="range"
            min={min}
            max={max}
            value={value}
            onChange={(e) => onChange(e.target.valueAsNumber)}
          />
        </>
      )}
    </label>
  );
}
export function Metric({ label, value }: { label: string; value: number }) {
  useProjection(label, value);
  return (
    <p>
      {label} <strong data-metric={label}>{value}</strong>
    </p>
  );
}
export function Table({ values }: { values: z.infer<typeof scores> }) {
  useProjection("ranking", values);
  return values.length ? (
    <table>
      <caption>Weighted ranking</caption>
      <tbody>
        {values.map((v) => (
          <tr key={v.label}>
            <th>{v.label}</th>
            <td>{v.score.toFixed(2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  ) : (
    <p>No ranking</p>
  );
}
export function Graphic({ label, items }: { label: string; items: unknown }) {
  return (
    <svg viewBox="0 0 450 135" aria-label={label} role="img">
      {shapes
        .parse(items)
        .map((s, i) =>
          s.kind === "group" ? (
            <g key={i}>{s.items.map(drawLeaf)}</g>
          ) : (
            drawLeaf(s, i)
          ),
        )}
    </svg>
  );
}

function drawLeaf(s: Leaf, i: number) {
  switch (s.kind) {
    case "rect":
      return <rect key={i} x={s.x} y={s.y} width={s.width} height={s.height} />;
    case "circle":
      return <circle key={i} cx={s.cx} cy={s.cy} r={s.r} />;
    case "text":
      return (
        <text key={i} x={s.x} y={s.y}>
          {s.text}
        </text>
      );
    case "path":
      return <path key={i} d={s.d} />;
  }
}
