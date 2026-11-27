import { useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { RestrictedClient } from "./admission/client";
import {
  bytes,
  check,
  limits,
  type Frame,
  type Protocol,
} from "./admission/policy";
import { ArtifactBoundary, Surface } from "./surface";
import "./style.css";
type Result = {
  status: "waiting" | "accepted" | "rejected" | "text" | "runtime-error";
  diagnostic?: string;
  text?: string;
  frame?: Frame;
};
function Replay() {
  const [result, show] = useState<Result>({ status: "waiting" }),
    [epoch, reset] = useState(0);
  const client = useRef<RestrictedClient | null>(null);
  async function replay(raw: string, protocol: Protocol) {
    client.current?.close();
    client.current = null;
    reset((n) => n + 1);
    show({ status: "waiting" });
    let next: RestrictedClient | null = null;
    try {
      check(
        raw.length <= limits.envelopeBytes &&
          bytes(raw) <= limits.envelopeBytes,
        "Response envelope byte budget",
      );
      const response = raw.trim().replaceAll("\r\n", "\n");
      if (response.startsWith("TEXT\n")) {
        const text = response.slice(5).trim();
        check(
          text.length > 0 && bytes(text) <= limits.sourceBytes,
          "Invalid text size",
        );
        show({ status: "text", text });
        return;
      }
      check(response.startsWith("UI\n"), "Expected UI or TEXT header");
      let source = response.slice(3),
        state;
      if (source.startsWith("STATE ")) {
        const split = source.indexOf("\n");
        check(split > 0, "Incomplete state envelope");
        state = JSON.parse(source.slice(6, split));
        check(
          state && typeof state === "object" && !Array.isArray(state),
          "Invalid state envelope",
        );
        source = source.slice(split + 1);
      }
      next = new RestrictedClient();
      client.current = next;
      const frame = await next.request({
        kind: "open",
        protocol,
        source,
        state,
      });
      if (client.current === next) show({ status: "accepted", frame });
    } catch (e) {
      if (client.current === next) {
        next?.close();
        client.current = null;
        show({ status: "rejected", diagnostic: String(e).slice(0, 600) });
      }
    }
  }
  function change(key: string, value: number) {
    const active = client.current;
    if (!active) return;
    active
      .request({ kind: "change", key, value })
      .then((frame) => {
        if (client.current === active) show({ status: "accepted", frame });
      })
      .catch((e) => {
        if (client.current === active)
          show({ status: "runtime-error", diagnostic: String(e) });
      });
  }
  return (
    <main>
      <h1>Generation replay</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          void replay(
            String(form.get("raw")),
            form.get("protocol") as Protocol,
          );
        }}
      >
        <label>
          Protocol
          <select name="protocol">
            <option value="oui">OpenUI Lang</option>
            <option value="json">json-render</option>
          </select>
        </label>
        <label>
          Complete model output
          <textarea name="raw" maxLength={limits.envelopeBytes} />
        </label>
        <button>Replay</button>
      </form>
      {result.frame && (
        <ArtifactBoundary
          key={epoch}
          onFailure={(diagnostic) => {
            client.current?.close();
            client.current = null;
            show({ status: "runtime-error", diagnostic });
          }}
        >
          <Surface frame={result.frame} change={change} />
        </ArtifactBoundary>
      )}
      {result.text && <p>{result.text}</p>}
      {result.diagnostic && <p role="alert">{result.diagnostic}</p>}
      <details>
        <summary>Replay result and semantic outputs</summary>
        <pre id="result">{JSON.stringify(result, null, 2)}</pre>
      </details>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<Replay />);
