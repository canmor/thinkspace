import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { ReactFlow, Background, Controls } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "./workspace.css";
import { compatibility } from "../../workspace/integrity.mjs";
import { migrateControls } from "../../workspace/artifact.mjs";
import { RestrictedClient } from "../src/admission/client";
import { Surface, ArtifactBoundary } from "../src/surface";
import { decodeEnvelope } from "../src/envelope";
import {
  conversation,
  append,
  branch,
  history,
  compile,
  snapshot,
} from "../../workspace/domain.mjs";

async function api(op, data = {}) {
  const response = await fetch("/api", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ op, ...data }),
  });
  const result = await response.json();
  if (!response.ok) throw Error(result.error);
  return result;
}
async function evaluate(source, state) {
  const client = new RestrictedClient();
  try {
    return await client.request({
      kind: "open",
      protocol: "oui",
      source,
      ...(state ? { state } : {}),
    });
  } finally {
    client.close();
  }
}
async function artifactValue(art, version = art, state = version.state) {
  compatibility(art);
  const frame = await evaluate(version.source, state);
  return {
    revision: version.revision,
    protocol: art.protocol,
    catalog: art.catalog,
    policy: "1.5.0",
    source: version.source,
    state: frame.state,
    projection: frame.items,
  };
}
function RevisionDetails({ title, children }) {
  const [open, setOpen] = useState(false);
  return (
    <details onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>{title}</summary>
      {open && children}
    </details>
  );
}
function MessageBlocks({ message, render }) {
  try {
    return decodeEnvelope(message.content).blocks.map(render);
  } catch (e) {
    return <p role="alert">Historical response unavailable: {e.message}</p>;
  }
}
function checkRenderer(frame) {
  const root = createRoot(document.createElement("div"));
  let failure;
  try {
    flushSync(() =>
      root.render(
        <ArtifactBoundary
          onFailure={(message) => {
            failure = message;
          }}
        >
          <Surface frame={frame} change={() => {}} />
        </ArtifactBoundary>,
      ),
    );
    if (failure) throw Error(failure);
  } finally {
    root.unmount();
  }
}
function Interactive({ artifact, onChange, onChangeFrame, onError, disabled }) {
  const [frame, setFrame] = useState(null),
    session = React.useRef(null);
  const [epoch, reopen] = useState(0);
  useEffect(() => {
    let active = true;
    setFrame(null);
    const client = new RestrictedClient();
    session.current = client;
    client
      .request({
        kind: "open",
        protocol: "oui",
        source: artifact.source,
        state: artifact.state,
      })
      .then((f) => {
        if (active) setFrame(f);
      })
      .catch((e) => {
        if (active) onError(e.message);
      });
    return () => {
      active = false;
      client.close();
    };
  }, [artifact.id, artifact.revision, epoch]);
  if (!frame) return <p>Validating artifact…</p>;
  return (
    <fieldset disabled={disabled}>
      <ArtifactBoundary onFailure={onError}>
        <Surface
          frame={frame}
          change={(key, value) =>
            onChange(async () => {
              try {
                const f = await session.current.request({
                  kind: "change",
                  key,
                  value,
                });
                await onChangeFrame(f);
                setFrame(f);
              } catch (e) {
                reopen((n) => n + 1);
                throw e;
              }
            })
          }
        />
      </ArtifactBoundary>
    </fieldset>
  );
}
function graph(w, selected) {
  const nodes = [...w.conversations, ...w.artifacts.filter((a) => a.promoted)];
  const edges = [];
  for (const node of w.conversations) {
    if (node.parent)
      edges.push({
        source: node.parent.conversation,
        target: node.id,
        label: "branch",
      });
    for (const ref of node.references)
      edges.push({ source: ref.source, target: node.id, label: "context" });
  }
  for (const a of w.artifacts.filter((a) => a.promoted))
    edges.push({
      source: a.origin.conversation,
      target: a.id,
      label: "derived",
    });
  return {
    nodes: nodes.map((n, i) => ({
      id: n.id,
      data: { label: n.title },
      className:
        (n.origin ? "artifact-node" : "conversation-node") +
        (n.id === selected ? " focused-node" : ""),
      position: w.positions[n.id] || {
        x: (i % 2) * 225,
        y: Math.floor(i / 2) * 106,
      },
    })),
    edges: edges.map((e, i) => ({
      ...e,
      id: String(i),
      markerEnd: { type: "arrowclosed" },
      style: { strokeDasharray: e.label === "context" ? "5 3" : undefined },
    })),
  };
}
function Canvas({ w, select, selected, move }) {
  const model = graph(w, selected);
  const [nodes, setNodes] = useState(model.nodes);
  useEffect(() => setNodes(graph(w, selected).nodes), [w, selected]);
  return (
    <ReactFlow
      nodes={nodes}
      edges={model.edges}
      fitView
      fitViewOptions={{ maxZoom: 1.15, padding: 0.2 }}
      onNodeClick={(_, n) => select(n.id)}
      onNodeDrag={(_, n) =>
        setNodes((ns) =>
          ns.map((x) => (x.id === n.id ? { ...x, position: n.position } : x)),
        )
      }
      onNodeDragStop={(_, n) => move(n.id, n.position)}
    >
      <Controls />
      <Background />
    </ReactFlow>
  );
}
function App() {
  const [record, setRecord] = useState(null),
    [list, setList] = useState([]),
    [selected, select] = useState("");
  const [name, setName] = useState("Architecture Exploration"),
    [draft, setDraft] = useState(""),
    [ref, setRef] = useState("");
  const [invalidCapture, setInvalidCapture] = useState(null);
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const lock = React.useRef(false);
  const w = record?.value,
    c = w?.conversations.find((x) => x.id === selected),
    a = w?.artifacts.find((x) => x.id === selected);
  async function run(fn) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e.message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function open(r) {
    setRecord(r);
    select(r.value.conversations[0].id);
    setDraft("");
    setRef("");
    localStorage.setItem("workspace", r.value.id);
  }
  useEffect(() => {
    run(async () => {
      const rows = await api("list");
      setList(rows);
      const last = localStorage.getItem("workspace");
      if (rows.some((x) => x.id === last))
        await open(await api("read", { id: last }));
    });
  }, []);
  async function persist(next) {
    const { revision } = await api("save", {
      value: next,
      revision: record.revision,
    });
    setRecord({ value: next, revision });
  }
  function mutate(fn) {
    return run(async () => {
      const next = structuredClone(w);
      const id = await fn(next);
      await persist(next);
      if (typeof id === "string") select(id);
    });
  }
  async function saveFrame(art, frame) {
    const next = structuredClone(w),
      target = next.artifacts.find((x) => x.id === art.id);
    target.state = frame.state;
    target.projection = frame.items;
    await persist(next);
  }
  async function send() {
    const next = structuredClone(w),
      node = next.conversations.find(
        (x) => x.id === (c?.id || a.origin.conversation),
      );
    for (const reference of node.references.filter(
      (r) => r.representation === "artifact",
    )) {
      const art = w.artifacts.find((x) => x.id === reference.source),
        value = reference.values[0];
      const version = [...art.versions, art].find(
        (v) => v.revision === value.revision,
      );
      const validated = await artifactValue(art, version, value.state);
      if (
        (value.source !== undefined && value.source !== validated.source) ||
        JSON.stringify(value.projection) !==
          JSON.stringify(validated.projection)
      )
        throw Error(
          "Invalid artifact snapshot. Remove and capture the source again.",
        );
    }
    const gen = await api("generate", {
      id: w.id,
      revision: record.revision,
      node: node.id,
      instruction: draft,
      context: compile(w, node),
      refinement: a
        ? { id: a.id, revision: a.revision, source: a.source, state: a.state }
        : undefined,
    });
    Object.assign(gen, {
      instruction: draft,
      conversation: node.id,
      ...(a ? { artifact: a.id, baseRevision: a.revision } : {}),
    });
    next.generations.push(gen);
    try {
      if (!gen.raw) throw Error(gen.diagnostic || "No complete model response");
      const { blocks, view, state } = decodeEnvelope(gen.raw);
      let frame = view ? await evaluate(view.source, state) : null;
      if (a) {
        if (!view) throw Error("Revision has no UI");
        const candidate = next.artifacts.find((x) => x.id === a.id);
        const merged = migrateControls(
          await evaluate(a.source, a.state),
          frame,
        );
        frame = await evaluate(view.source, merged);
        checkRenderer(frame);
        candidate.versions.push({
          revision: a.revision,
          source: a.source,
          state: a.state,
          projection: a.projection,
          generation: a.generation,
        });
        Object.assign(candidate, {
          source: view.source,
          state: frame.state,
          projection: frame.items,
          revision: a.revision + 1,
          generation: gen.id,
        });
      } else {
        if (frame) checkRenderer(frame);
        append(node, "user", draft);
        const message = append(node, "assistant", gen.raw);
        message.generation = gen.id;
        if (view) {
          const id = crypto.randomUUID();
          next.artifacts.push({
            id,
            title: "Interactive artifact",
            source: view.source,
            state: frame.state,
            projection: frame.items,
            revision: 1,
            generation: gen.id,
            versions: [],
            protocol: "oui@1.2.0",
            catalog: "1.1",
            origin: {
              conversation: c.id,
              message: message.id,
              block: blocks.findIndex((x) => x.type === "ui"),
            },
            promoted: false,
          });
          message.artifact = id;
        }
      }
    } catch (e) {
      gen.failure = e.message;
      gen.retryStatus = "Available";
      await persist(next);
      throw e;
    }
    await persist(next);
    setDraft("");
    requestAnimationFrame(() =>
      document
        .querySelector("section article:last-of-type")
        ?.scrollIntoView({ block: "start" }),
    );
  }
  const sources = [];
  if (w && c) {
    for (const node of w.conversations.filter((n) => n.id !== c.id)) {
      const messages = history(w, node);
      sources.push({
        id: node.id,
        label: node.title,
        source: node.id,
        kind: "conversation",
        values: messages,
      });
      for (const m of messages)
        sources.push({
          id: node.id + m.id,
          label: node.title + " · " + m.content.slice(0, 50),
          source: node.id,
          kind: "message",
          values: [m],
        });
    }
    for (const art of w.artifacts.filter((x) => x.promoted))
      sources.push({
        id: art.id,
        label: art.title + " · revision " + art.revision,
        source: art.id,
        kind: "artifact",
        artifact: art,
      });
  }
  function interactive(art, frozen = false) {
    return (
      <Interactive
        artifact={art}
        onChange={run}
        onChangeFrame={(frame) => saveFrame(art, frame)}
        onError={setError}
        disabled={busy || frozen}
      />
    );
  }
  return (
    <>
      <header>
        <strong>Thinkspace</strong>
        <select
          aria-label="Workspace"
          value={w?.id || ""}
          disabled={busy}
          onChange={(e) =>
            run(async () => open(await api("read", { id: e.target.value })))
          }
        >
          <option value="" disabled>
            Workspaces
          </option>
          {list.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <input
          aria-label="Workspace name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          disabled={busy}
          onClick={() =>
            run(async () => {
              await open(await api("create", { name }));
              setList(await api("list"));
            })
          }
        >
          Create workspace
        </button>
      </header>
      {error && <p role="alert">{error}</p>}
      {w && (
        <div className="layout">
          <aside>
            <h2>{w.name}</h2>
            <button
              disabled={busy}
              onClick={() =>
                mutate((next) => {
                  const n = conversation(
                    "Conversation " + (next.conversations.length + 1),
                  );
                  next.conversations.push(n);
                  return n.id;
                })
              }
            >
              New conversation
            </button>
            <div className="canvas">
              <Canvas
                key={
                  w.id +
                  ":" +
                  (w.conversations.length +
                    w.artifacts.filter((x) => x.promoted).length)
                }
                w={w}
                selected={selected}
                select={(id) => {
                  if (!busy) {
                    select(id);
                    setDraft("");
                    setRef("");
                  }
                }}
                move={(id, p) =>
                  mutate((next) => {
                    next.positions[id] = p;
                  })
                }
              />
            </div>
          </aside>
          <section>
            <h1>{c?.title || a?.title}</h1>
            <button
              disabled={busy}
              onClick={() => {
                const title = window
                  .prompt("Node title", (a || c).title)
                  ?.trim();
                if (title)
                  mutate((next) => {
                    [...next.conversations, ...next.artifacts].find(
                      (n) => n.id === selected,
                    ).title = title;
                  });
              }}
            >
              Rename node
            </button>
            {c &&
              w.generations
                .filter(
                  (g) => g.conversation === c.id && !g.artifact && g.failure,
                )
                .map((g) => (
                  <details key={g.id}>
                    <summary>Request failed · retry available</summary>
                    <p>{g.instruction}</p>
                    <p>{g.failure}</p>
                    <button onClick={() => setDraft(g.instruction)}>
                      Restore request to composer
                    </button>
                  </details>
                ))}
            {c?.parent && (
              <p>
                Inherited through assistant message {c.parent.message} in{" "}
                {
                  w.conversations.find((n) => n.id === c.parent.conversation)
                    .title
                }
              </p>
            )}
            {c &&
              history(w, c).map((m) => (
                <article key={m.id}>
                  <b>{m.role}</b>
                  {m.role === "assistant" ? (
                    <>
                      {
                        <MessageBlocks
                          message={m}
                          render={(block, i) =>
                            block.type === "text" ? (
                              <p key={i}>{block.text}</p>
                            ) : (
                              <React.Fragment key={i}>
                                {(() => {
                                  const art = w.artifacts.find(
                                    (x) => x.id === m.artifact,
                                  );
                                  const historical =
                                    art.promoted ||
                                    c.id !== m.conversation ||
                                    c.messages.at(-1)?.id !== m.id;
                                  const original = {
                                    ...art,
                                    id: m.id,
                                    revision: 1,
                                    source: block.source,
                                    state: block.state.length
                                      ? Object.fromEntries(
                                          block.state.map((entry) => [
                                            entry.name,
                                            entry.value,
                                          ]),
                                        )
                                      : undefined,
                                  };
                                  return (
                                    <>
                                      <small>
                                        {historical
                                          ? "Original response · revision 1 · read only"
                                          : "Interactive working copy · revision 1"}
                                      </small>
                                      {interactive(
                                        historical ? original : art,
                                        historical,
                                      )}
                                    </>
                                  );
                                })()}
                              </React.Fragment>
                            )
                          }
                        />
                      }
                      <details>
                        <summary>Submitted context</summary>
                        <pre>
                          {JSON.stringify(
                            w.generations.find((g) => g.id === m.generation)
                              ?.context,
                            null,
                            2,
                          )}
                        </pre>
                      </details>
                      <button
                        disabled={busy}
                        onClick={() =>
                          mutate((next) => branch(next, c, m.id).id)
                        }
                      >
                        Branch here
                      </button>
                      {m.artifact && (
                        <button
                          disabled={busy}
                          onClick={() =>
                            mutate((next) => {
                              const art = next.artifacts.find(
                                (x) => x.id === m.artifact,
                              );
                              art.promoted = true;
                              return art.id;
                            })
                          }
                        >
                          {w.artifacts.find((x) => x.id === m.artifact)
                            ?.promoted
                            ? "Open current workspace artifact"
                            : "Open as workspace artifact"}
                        </button>
                      )}
                    </>
                  ) : (
                    <p>{m.content}</p>
                  )}
                </article>
              ))}
            {a && (
              <>
                <p>
                  Revision {a.revision} · {a.protocol}
                </p>
                {interactive(a)}
                {[...a.versions, a]
                  .slice()
                  .reverse()
                  .map((v) => {
                    const g = w.generations.find(
                      (item) => item.id === v.generation,
                    );
                    return (
                      <RevisionDetails
                        key={v.revision}
                        title={"Revision " + v.revision + " provenance"}
                      >
                        <p>{g.instruction || g.messages.at(-1).content}</p>
                        <p>
                          {g.model} · {g.id}
                        </p>
                        <MessageBlocks
                          message={{ content: g.raw }}
                          render={(b, i) =>
                            b.type === "text" ? <p key={i}>{b.text}</p> : null
                          }
                        />
                        {v !== a && (
                          <>
                            <p>Saved state before replacement</p>
                            {interactive({ ...a, ...v }, true)}
                          </>
                        )}
                      </RevisionDetails>
                    );
                  })}
                {w.generations
                  .filter((g) => g.artifact === a.id && g.failure)
                  .map((g) => (
                    <p key={g.id}>
                      Revision failed · retry available: {g.instruction} —{" "}
                      {g.failure}
                    </p>
                  ))}
              </>
            )}
            {c && (
              <details>
                <summary>Context inspector</summary>
                <select
                  aria-label="Context source"
                  value={ref}
                  onChange={(e) => setRef(e.target.value)}
                >
                  <option value="">Choose a snapshot</option>
                  {sources.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <button
                  disabled={!ref || busy}
                  onClick={() =>
                    mutate(async (next) => {
                      const s = sources.find((x) => x.id === ref);
                      try {
                        const values = s.artifact
                          ? [await artifactValue(s.artifact)]
                          : s.values;
                        next.conversations
                          .find((n) => n.id === c.id)
                          .references.push(snapshot(s.source, s.kind, values));
                        setInvalidCapture(null);
                      } catch (e) {
                        setInvalidCapture(c.id);
                        throw e;
                      }
                    })
                  }
                >
                  Include snapshot
                </button>
                {invalidCapture === c.id && (
                  <button
                    onClick={() => {
                      setInvalidCapture(null);
                      setRef("");
                      setError("");
                    }}
                  >
                    Discard invalid selection
                  </button>
                )}
                <ul>
                  {c.references.map((r) => (
                    <li key={r.id}>
                      {
                        [...w.conversations, ...w.artifacts].find(
                          (x) => x.id === r.source,
                        )?.title
                      }{" "}
                      · {r.representation}{" "}
                      {r.representation === "artifact"
                        ? "revision " +
                          r.values[0].revision +
                          " · " +
                          JSON.stringify(r.values[0].state)
                        : "· " + r.values.length + " message(s)"}{" "}
                      <button
                        disabled={busy}
                        onClick={() =>
                          mutate((next) => {
                            const n = next.conversations.find(
                              (x) => x.id === c.id,
                            );
                            n.references = n.references.filter(
                              (x) => x.id !== r.id,
                            );
                          })
                        }
                      >
                        Remove snapshot
                      </button>
                    </li>
                  ))}
                </ul>
                <details>
                  <summary>Compiled context JSON</summary>
                  <pre>
                    {(() => {
                      try {
                        return JSON.stringify(compile(w, c), null, 2);
                      } catch (e) {
                        return e.message;
                      }
                    })()}
                  </pre>
                </details>
              </details>
            )}
            <label>
              {a ? "Refinement request" : "Message"}
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
            </label>
            <button
              disabled={!draft.trim() || busy || (c && invalidCapture === c.id)}
              onClick={() => run(send)}
            >
              {busy ? "Working…" : a ? "Regenerate artifact" : "Send message"}
            </button>
          </section>
        </div>
      )}
    </>
  );
}
createRoot(document.getElementById("root")).render(<App />);
