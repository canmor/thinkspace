import { ProjectionContext } from "./projection";
import { Badge } from "@openai/apps-sdk-ui/components/Badge";
import { useState, useRef, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { ArtifactBoundary, Surface } from "./surface";
import { RestrictedClient } from "./admission/client";
import {
  versions,
  bytes,
  check,
  limits,
  type Frame,
  type Protocol,
  type State,
} from "./admission/policy";
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
function Pane({ task, format }: { task: string; format: Protocol }) {
  const bundled = files["../fixtures/" + task + "." + format],
    version = versions[format],
    id = task + "-" + format;
  const [source, setSource] = useState(bundled),
    [revision, setRevision] = useState(1),
    [frame, publish] = useState<Frame>(),
    [error, fail] = useState(""),
    [snapshot, show] = useState(""),
    [epoch, reset] = useState(0),
    [busy, pending] = useState(0);
  const live = useRef<RestrictedClient | null>(null),
    candidate = useRef<RestrictedClient | null>(null),
    outputs = useRef<Record<string, unknown>>(Object.create(null));
  function open(spec: string, seed: State | undefined, rev: number) {
    candidate.current?.close();
    candidate.current = null;
    if (!Number.isSafeInteger(rev) || rev < 1) {
      fail("Invalid revision");
      return;
    }
    let client: RestrictedClient;
    try {
      client = new RestrictedClient();
    } catch {
      fail("Restricted worker unavailable");
      return;
    }
    candidate.current = client;
    pending((n) => n + 1);
    client
      .request({ kind: "open", protocol: format, source: spec, state: seed })
      .then((next) => {
        if (candidate.current !== client) return;
        live.current?.close();
        live.current = client;
        candidate.current = null;
        outputs.current = Object.create(null);
        setSource(spec);
        setRevision(rev);
        reset((n) => n + 1);
        publish(next);
        fail("");
      })
      .catch((e) => {
        if (candidate.current === client) {
          candidate.current = null;
          client.close();
          fail("Rejected specification: " + e.message);
        }
      })
      .finally(() => pending((n) => n - 1));
  }
  useEffect(() => {
    open(bundled, defaults[task], 1);
    return () => {
      const c = candidate.current;
      candidate.current = null;
      c?.close();
      live.current?.close();
      live.current = null;
    };
  }, [task, format]);
  function change(key: string, value: number) {
    const client = live.current;
    if (!client) return;
    pending((n) => n + 1);
    client
      .request({ kind: "change", key, value })
      .then((next) => {
        if (live.current === client) {
          publish(next);
          fail("");
        }
      })
      .catch((e) => {
        if (live.current === client) fail(e.message);
      })
      .finally(() => pending((n) => n - 1));
  }
  function capture() {
    if (!frame) throw Error("No admitted artifact");
    return JSON.stringify({
      id,
      protocol: format,
      version,
      revision,
      provenance: {
        catalog: versions.catalog,
        policy: versions.policy,
        protocolVersion: version,
      },
      spec: source,
      state: frame.state,
      projection: {
        inputs: frame.state,
        outputs: { ...outputs.current },
        components: frame.items.map(({ type, props }, index) => ({
          index,
          type,
          props,
        })),
        rules: { protocol: format, revision },
        artifactId: id,
        revision,
      },
    });
  }
  function restore(raw: string) {
    candidate.current?.close();
    candidate.current = null;
    try {
      check(
        raw.length <= limits.envelopeBytes &&
          bytes(raw) <= limits.envelopeBytes,
        "Snapshot size exceeded",
      );
      const a = JSON.parse(raw);
      check(
        a &&
          a.id === id &&
          a.protocol === format &&
          a.version === version &&
          Number.isSafeInteger(a.revision) &&
          a.revision >= 1 &&
          typeof a.spec === "string",
        "Unknown artifact or version",
      );
      check(
        a.provenance === "manual" ||
          (a.provenance?.catalog === versions.catalog &&
            a.provenance?.policy === versions.policy &&
            a.provenance?.protocolVersion === version),
        "Unknown provenance version",
      );
      check(
        a.state && typeof a.state === "object" && !Array.isArray(a.state),
        "Invalid state fields",
      );
      open(a.spec, a.state, a.revision);
    } catch (e) {
      fail(String(e));
    }
  }
  return (
    <article>
      <h2>
        {format === "json" ? "json-render" : "OpenUI Lang"}{" "}
        <Badge>{version}</Badge>
      </h2>
      <ProjectionContext.Provider value={outputs.current}>
        <section key={epoch}>
          <ArtifactBoundary
            key={epoch}
            onFailure={(message) => {
              fail(message);
              publish(undefined);
              live.current?.close();
              live.current = null;
            }}
          >
            {frame && <Surface frame={frame} change={change} />}
          </ArtifactBoundary>
        </section>
      </ProjectionContext.Provider>
      {error && <pre role="alert">{error}</pre>}
      <footer>
        <button
          disabled={!frame || busy > 0}
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
          maxLength={limits.envelopeBytes}
          aria-label="Snapshot"
          value={snapshot}
          onChange={(e) => show(e.target.value)}
        />
        <button onClick={() => restore(snapshot)}>Import snapshot</button>
      </details>
      <details>
        <summary>Raw specification</summary>
        <pre>{source}</pre>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            open(
              String(new FormData(e.currentTarget).get("source")),
              undefined,
              revision + 1,
            );
          }}
        >
          <textarea
            name="source"
            aria-label="Revised specification"
            key={epoch}
            defaultValue={source}
            maxLength={limits.sourceBytes}
          />
          <button>Admit revision</button>
        </form>
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
        <a href="/replay.html">Generation replay</a>
      </nav>
      <div className="panes">
        {(["json", "oui"] as const).map((f) => (
          <Pane key={task + f} task={task} format={f} />
        ))}
      </div>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
