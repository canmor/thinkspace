import { spawn, spawnSync } from "node:child_process";
import { parseEnv } from "node:util";
import {
  readFile,
  writeFile,
  mkdir,
  mkdtemp,
  rm,
  rename,
  readdir,
} from "node:fs/promises";
import { createReadStream } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createHash, randomBytes } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "@playwright/test";
import { messages, tasks, version } from "./harness.mjs";
import { generate, endpoint, settings, cloudSettings } from "./provider.mjs";
import { replay } from "./browser.mjs";
const cloud = process.env.GENUI_PROVIDER === "openai";
const out = resolve(
    process.argv[2] ||
      join("runs", (cloud ? "openai-" : "local-") + Date.now()),
  ),
  weights = process.env.GENUI_WEIGHTS,
  server = process.env.GENUI_LLAMA_SERVER;
const custom = process.env.GENUI_PROMPT;
if (
  custom !== undefined &&
  (!custom.trim() || Buffer.byteLength(custom) > 4000)
)
  throw Error("Custom request must be 1–4000 UTF-8 bytes");
const customProtocol = process.env.GENUI_PROTOCOL || "oui",
  customVariant = process.env.GENUI_VARIANT || "H2";
if (
  !["oui", "json"].includes(customProtocol) ||
  !["H0", "H1", "H2"].includes(customVariant)
)
  throw Error("Unknown protocol or harness");
await mkdir(join(out, "episodes"), { recursive: true });
if ((await readdir(join(out, "episodes"))).length)
  throw Error("Use a fresh output directory to preserve prior evidence");
async function hash(path) {
  const digest = createHash("sha256");
  for await (const b of createReadStream(path)) digest.update(b);
  return digest.digest("hex");
}
let providerInfo, keyDir, keyfile, key;
if (cloud) {
  key = parseEnv(await readFile("../../.env", "utf8")).OPENAI_TOKEN;
  if (!key) throw Error("Missing OPENAI_TOKEN in repository .env");
  providerInfo = {
    model: cloudSettings.model,
    endpoint: "https://api.openai.com/v1/chat/completions",
    settings: cloudSettings,
  };
} else {
  if (!weights || !server)
    throw Error(
      "Set GENUI_WEIGHTS and GENUI_LLAMA_SERVER to pinned local files",
    );
  const weightHash = await hash(weights),
    binaryHash = await hash(server);
  if (
    weightHash !==
      "cc324af070c2ecbfd324a30884d2f951a7ff756aba85cb811a6ec436933bb046" ||
    binaryHash !==
      "efc5ce8b125ba4aecb4e18381a916fd4ccbac944ec45319403a0c5f7d77605e2"
  )
    throw Error("Local model or runtime digest mismatch");
  const ver = spawnSync(server, ["--version"], { encoding: "utf8" });
  providerInfo = {
    model: "Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF",
    revision: "f86cb2c1fa58255f8052cc32aeede1b7482d4361",
    quantization: "Q4_K_M",
    weightHash,
    binaryHash,
    serverVersion: (ver.stdout + ver.stderr).trim(),
    serverBuild: "b12810",
    settings,
  };
  keyDir = await mkdtemp(join(tmpdir(), "genui-provider-"));
  key = randomBytes(32).toString("hex");
  keyfile = join(keyDir, "key");
  await writeFile(keyfile, key, { mode: 0o600 });
}
const cancel = new AbortController(),
  children = new Set();
const stop = () => {
  cancel.abort();
  for (const child of children) child.kill("SIGTERM");
};
process.once("SIGINT", stop);
process.once("SIGTERM", stop);
function start(file, args, extra = {}) {
  const child = spawn(file, args, { stdio: "ignore", ...extra });
  children.add(child);
  child.once("exit", () => children.delete(child));
  return child;
}
async function available(url, child) {
  for (let i = 0; i < 160; i++) {
    cancel.signal.throwIfAborted();
    if (child.exitCode !== null)
      throw Error("Local service exited " + child.exitCode);
    try {
      if ((await fetch(url, { signal: AbortSignal.timeout(1000) })).ok) return;
    } catch {}
    await delay(300);
  }
  throw Error("Local service unavailable");
}
async function command(file, args, env = process.env) {
  await new Promise((res, rej) => {
    const p = start(file, args, { stdio: "inherit", env });
    p.on("error", rej);
    p.on("exit", (code) =>
      code === 0 ? res() : rej(Error(file + " exit " + code)),
    );
  });
}
let browser;
try {
  if (!cloud) {
    const service = start(server, [
      "--host",
      "127.0.0.1",
      "--port",
      "4193",
      "-m",
      weights,
      "--alias",
      settings.model,
      "--api-key-file",
      keyfile,
      "--no-webui",
      "--no-agent",
      "--no-ui-mcp-proxy",
      "--no-warmup",
      "--no-slots",
      "--no-context-shift",
      "-c",
      "16384",
      "-np",
      "4",
    ]);
    await available(endpoint + "/health", service);
    const denied = await fetch(endpoint + "/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    if (denied.status !== 401) throw Error("Provider auth preflight failed");
  }
  await command("npm", ["run", "build"]);
  await command("npm", ["test"], {
    ...process.env,
    GENUI_PROVIDER_PREFLIGHT: cloud ? "openai" : "local",
    GENUI_REPORT: join(out, "preflight.json"),
  });
  const stats = JSON.parse(await readFile(join(out, "preflight.json"))).stats;
  if (stats.unexpected || stats.skipped || stats.flaky || stats.expected < 21)
    throw Error("Incomplete preflight");
  const preview = start(process.execPath, [
    "node_modules/vite/bin/vite.js",
    "preview",
    "--host",
    "127.0.0.1",
    "--port",
    "4187",
    "--strictPort",
  ]);
  await available("http://127.0.0.1:4187/replay.html", preview);
  const manifest = {
    harness: version,
    ...providerInfo,
    node: process.version,
    runtime: "2a.1",
    protocols: { oui: "1.2.0", json: "0.23.2" },
    catalog: "1.1",
    policy: "1.5.0",
    lockSha256: await hash("package-lock.json"),
    harnessSha256: await hash("generation/harness.mjs"),
    browserRevision: JSON.parse(
      await readFile("node_modules/playwright-core/browsers.json"),
    ).browsers.find((x) => x.name === "chromium-headless-shell"),
    repeatSeeds: custom ? [1701] : [1701, 1702, 1703],
    repairLimit: 1,
    preflight: stats,
  };
  await writeFile(
    join(out, "manifest.json"),
    JSON.stringify(manifest, null, 2),
  );
  browser = await chromium.launch();
  const jobs = [];
  if (custom)
    jobs.push({
      task: "custom",
      protocol: customProtocol,
      variant: customVariant,
      seed: 1701,
    });
  else
    for (const seed of manifest.repeatSeeds)
      for (const task of Object.keys(tasks))
        for (const variant of ["H0", "H1", "H2"])
          for (const protocol of ["oui", "json"])
            jobs.push({ task, variant, protocol, seed });
  async function lane() {
    const page = await browser.newPage();
    for (let job; (job = jobs.shift()); ) {
      cancel.signal.throwIfAborted();
      const { task, variant, protocol, seed } = job,
        id = [task, variant, protocol, seed].join("-"),
        path = join(out, "episodes", id + ".json");
      let previous,
        attempts = [];
      for (
        let attempt = attempts.length;
        attempt <= manifest.repairLimit;
        attempt++
      ) {
        const prompt = messages(protocol, variant, task, previous);
        if (custom) prompt[1] = { role: "user", content: custom };
        let record;
        try {
          const response = await generate(
            prompt,
            seed + attempt * 100,
            key,
            cancel.signal,
            cloud,
          );
          record = { ...response, status: "collected" };
          await writeFile(
            path + ".tmp",
            JSON.stringify(
              {
                ...job,
                id,
                complete: false,
                attempts: [...attempts, { ...record, messages: prompt }],
              },
              null,
              2,
            ),
          );
          await rename(path + ".tmp", path);
          const result =
            response.finish === "stop"
              ? await replay(page, protocol, response.raw)
              : {
                  status: "rejected",
                  diagnostic: "Incomplete provider output: " + response.finish,
                };
          record = {
            ...response,
            status: result.status,
            diagnostic: result.diagnostic,
            frame: result.frame,
            text: result.text,
          };
        } catch (e) {
          record = {
            ...record,
            status: record ? "runtime-error" : "provider-error",
            diagnostic: String(e),
          };
        }
        attempts.push({ ...record, messages: prompt });
        const complete =
          record.status !== "rejected" || attempt === manifest.repairLimit;
        await writeFile(
          path + ".tmp",
          JSON.stringify({ ...job, id, complete, attempts }, null, 2),
        );
        await rename(path + ".tmp", path);
        if (complete) break;
        previous = record;
      }
      console.log(id, attempts.at(-1).status, attempts.length);
    }
  }
  await Promise.all(Array.from({ length: 4 }, lane));
} finally {
  await browser?.close();
  stop();
  if (keyDir) await rm(keyDir, { recursive: true, force: true });
}
