import { line } from "d3-shape";
import type { Item } from "./admission/policy";

export function Chart({ title, xLabel, yLabel, x, series, selected, decimals }: Extract<Item,{type:"Chart"}>["props"]) {
  const values = series.flatMap(s => s.values);
  const lo = Math.min(...values), hi = Math.max(...values);
  const px = (v:number) => 64 + 384 * (v-x[0])/(x.at(-1)!-x[0]);
  const py = (v:number) => hi===lo ? 89 : 148-118*(v-lo)/(hi-lo);
  const path = line<number>().x((_,i)=>px(x[i])).y(py);
  const colors = ["#245899","#a14000","#4b742a"];
  const index = selected.length ? x.indexOf(selected[0]) : -1;
  return <figure><figcaption>{title}</figcaption>
    <svg viewBox="0 0 500 200" role="img" aria-label={title}>
      <path d="M64 30V148H448" fill="none" stroke="currentColor"/>
      <text x="5" y="17">{yLabel}</text>
      {[...new Set([lo,hi])].map(v=><text key={v} x="60" y={py(v)} textAnchor="end">{v.toFixed(decimals)}</text>)}
      {[x[0],x.at(-1)!].map(v=><text key={v} x={px(v)} y="167" textAnchor="middle">{v}</text>)}
      <text x="256" y="192" textAnchor="middle">{xLabel}</text>
      {series.map((s,i)=><g key={s.label}><title>{s.label}</title>
        <path d={path(s.values)!} fill="none" stroke={colors[i]} strokeWidth="2" strokeDasharray={["none","6 3","2 3"][i]}/>
        {index>=0 && <circle cx={px(x[index])} cy={py(s.values[index])} r="4" fill={colors[i]}/>}
      </g>)}
    </svg>
    <p>{series.map((s,i)=>s.label+" ("+["solid","dashed","dotted"][i]+")").join(" · ")}</p>
    <details><summary>Data table</summary><table><caption>{title}</caption><thead><tr><th>{xLabel}</th>{series.map(s=><th key={s.label}>{s.label} ({yLabel})</th>)}</tr></thead>
    <tbody>{x.map((v,i)=><tr key={v}><th scope="row">{v}</th>{series.map(s=><td key={s.label}>{s.values[i].toFixed(decimals)}</td>)}</tr>)}</tbody></table></details>
  </figure>;
}
