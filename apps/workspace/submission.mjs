import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual as equal } from "node:util";
import { compatibility } from "./integrity.mjs";

const runner = fileURLToPath(
  new URL("./admission-runner.cjs", import.meta.url),
);
const bundle = fileURLToPath(
  new URL(
    "../genui-lab/dist-workspace/assets/restricted-worker.js",
    import.meta.url,
  ),
);

function evaluate(source, state) {
  return new Promise((resolve, reject) => {
    const child = execFile(
      process.execPath,
      [
        "--permission",
        "--allow-fs-read=" + bundle,
        "--disallow-code-generation-from-strings",
        runner,
        bundle,
      ],
      { env: {}, timeout: 2000, killSignal: "SIGKILL", maxBuffer: 65536 },
      (error, stdout) => {
        if (error)
          return reject(
            Error("Restricted submission validator unavailable or timed out"),
          );
        try {
          const result = JSON.parse(stdout);
          if (!result.frame)
            throw Error(result.error || "Missing validated frame");
          resolve(result.frame);
        } catch (e) {
          reject(e);
        }
      },
    );
    child.stdin.on("error", reject);
    child.stdin.end(JSON.stringify({ source, state }));
  });
}

async function verify(w, art, value) {
  if (!art) throw Error("Missing artifact");
  compatibility(art);
  const version = [...art.versions, art].find(
    (v) => v.revision === value.revision,
  );
  if (!version) throw Error("Missing artifact revision");
  const raw = w.generations.find((g) => g.id === version.generation)?.raw;
  const ui = JSON.parse(raw).blocks.find((b) => b.type === "ui");
  if (
    ui?.source !== version.source ||
    (Object.hasOwn(value, "source") && value.source !== version.source)
  )
    throw Error("Artifact source differs from its generation or snapshot");
  const frame = await evaluate(version.source, value.state);
  if (!equal(frame.state, value.state) || !equal(frame.items, value.projection))
    throw Error("Artifact snapshot differs from the validated frame");
}

export async function submissionInstruction(
  w,
  node,
  context,
  instruction,
  handoff,
) {
  if (handoff && !equal(handoff.context, context))
    throw Error("Inspected context differs from stored context");
  for (const entry of context.included.filter(
    (e) => e.representation === "artifact",
  )) {
    const art = w.artifacts.find((a) => a.id === entry.source);
    for (const value of entry.values) await verify(w, art, value);
  }
  if (!handoff?.refinement) return instruction;
  const selected = handoff.refinement;
  const art = w.artifacts.find((a) => a.id === selected.id);
  if (
    !art ||
    art.origin.conversation !== node.id ||
    selected.revision !== art.revision ||
    selected.source !== art.source ||
    !equal(selected.state, art.state)
  )
    throw Error("Refinement target changed");
  await verify(w, art, art);
  return (
    instruction +
    "\nRegenerate the complete artifact. Preserve existing semantic bindings and control contracts.\n" +
    JSON.stringify({ source: art.source, state: art.state })
  );
}
