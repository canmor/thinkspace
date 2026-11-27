import { reconstruct } from "./revision";
import { validateTransfer } from "./transport";
import { admit } from "./session";
let session: ReturnType<typeof admit> | undefined;
self.onmessage = ({ data }) => {
  try {
    validateTransfer(data);
    if(data.kind==="reconstruct" && self.name==="revision-experiment"){
      const source=reconstruct(data.protocol,data.source,data.raw,data.artifact,data.base);
      self.postMessage({frame:{source}});
      return;
    }
    let frame;
    if (data.kind === "open") {
      const next = admit(data.protocol, data.source, data.state, data.profile === "chart-experiment");
      session = next;
      frame = session.initial;
    } else if (data.kind === "change" && session) {
      frame = session.change(data.key, data.value);
    } else throw Error("Invalid session command");
    self.postMessage({ frame });
  } catch (e) {
    self.postMessage({
      error: (e instanceof Error ? e.message : "Worker failure").slice(0, 512),
    });
  }
};
