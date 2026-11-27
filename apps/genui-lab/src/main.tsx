import { ProjectionContext } from "./projection";
import { Badge } from "@openai/apps-sdk-ui/components/Badge";
import { useState, useRef } from "react";
import { createRoot } from "react-dom/client";
import { JsonPane } from "./json";
import { OpenPane } from "./openui";
import "./style.css";
const files = import.meta.glob("../fixtures/*", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;
const defaults: Record<string, Record<string, number>> = {
  B02: {},
  B03: { a: 40, b: 25, c: 35 },
  B04: { fare: 0, gold: 0, weight: 23 },
};
function Pane({ task, format }: { task: string; format: string }) {
  const source = files["../fixtures/" + task + "." + format];
  const version = format === "json" ? "0.23.2" : "1.2.0";
  const initial = defaults[task];
  const [seed, setSeed] = useState(initial),
    [epoch, reset] = useState(0),
    [error, fail] = useState(""),
    [snapshot, show] = useState("");
  const state = useRef({ ...initial }),
    outputs = useRef<Record<string, unknown>>({});
  const id = task + "-" + format;
  function capture() {
    const projection = {
      inputs: { ...state.current },
      outputs: { ...outputs.current },
      rules: { protocol: format, source },
      artifactId: id,
      revision: 1,
    };
    return JSON.stringify(
      {
        id,
        version,
        protocol: format,
        revision: 1,
        provenance: "manual",
        spec: source,
        state: state.current,
        projection,
      },
      null,
      2,
    );
  }
  function restore(raw: string) {
    try {
      if (raw.length > 32000) throw Error("Snapshot size exceeded");
      const a = JSON.parse(raw);
      if (
        a.id !== id ||
        a.version !== version ||
        a.protocol !== format ||
        a.revision !== 1 ||
        a.spec !== source
      )
        throw Error("Unknown artifact or modified specification");
      if (
        !a.state ||
        Array.isArray(a.state) ||
        typeof a.state !== "object" ||
        Object.keys(a.state).length !== Object.keys(initial).length ||
        Object.keys(a.state).some((k) => !Object.hasOwn(initial, k))
      )
        throw Error("Invalid state fields");
      for (const [key, v] of Object.entries(a.state)) {
        const lo = key === "weight" ? 10 : 0,
          hi = key === "weight" ? 40 : ["fare", "gold"].includes(key) ? 1 : 100;
        if (typeof v !== "number" || !Number.isInteger(v) || v < lo || v > hi)
          throw Error("Invalid state value");
      }
      state.current = { ...a.state };
      setSeed({ ...a.state });
      reset((n) => n + 1);
      fail("");
    } catch (e) {
      fail(String(e));
    }
  }
  function update(delta: Record<string, number>) {
    for (const key of Object.keys(initial))
      if (key in delta) state.current[key] = delta[key];
  }
  return (
    <article>
      <h2>
        {format === "json" ? "json-render" : "OpenUI Lang"}{" "}
        <Badge>{version}</Badge>
      </h2>
      <ProjectionContext.Provider value={outputs.current}>
        <section key={epoch}>
          {format === "json" ? (
            <JsonPane source={source} state={seed} update={update} />
          ) : (
            <OpenPane
              source={source}
              state={seed}
              update={update}
              fail={fail}
            />
          )}
        </section>
      </ProjectionContext.Provider>
      {error && <pre role="alert">{error}</pre>}
      <footer>
        <button
          onClick={() => {
            const raw = capture();
            localStorage.setItem(id, raw);
            show(raw);
          }}
        >
          Save snapshot
        </button>
        <button onClick={() => restore(localStorage.getItem(id) || "")}>
          Restore saved
        </button>
      </footer>
      <details>
        <summary>Artifact and context</summary>
        <textarea
          aria-label="Snapshot"
          value={snapshot}
          onChange={(e) => show(e.target.value)}
        />
        <button onClick={() => restore(snapshot)}>Import snapshot</button>
      </details>
      <details>
        <summary>Raw specification</summary>
        <pre>{source}</pre>
      </details>
    </article>
  );
}
function App() {
  const [task, set] = useState("B02");
  return (
    <main>
      <h1>Protocol feasibility lab</h1>
      <nav>
        {Object.keys(defaults).map((k) => (
          <button key={k} aria-pressed={task === k} onClick={() => set(k)}>
            {k}
          </button>
        ))}
      </nav>
      <div className="panes">
        {["json", "oui"].map((f) => (
          <Pane key={task + f} task={task} format={f} />
        ))}
      </div>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
