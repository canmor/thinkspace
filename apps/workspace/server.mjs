import http from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { resolve, dirname, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import { openStore } from "./store.mjs";
import { workspace } from "./domain.mjs";
import { generate } from "./generate.mjs";

export async function serve({ path, port = 4178, provider }) {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  const store = openStore(path);
  const root = fileURLToPath(
    new URL("../genui-lab/dist-workspace/", import.meta.url),
  );
  const server = http.createServer(async (req, res) => {
    try {
      const origin = "http://127.0.0.1:" + server.address().port;
      if (req.headers.host !== new URL(origin).host)
        throw Error("Invalid host");
      const route = new URL(req.url, origin).pathname;
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("X-Content-Type-Options", "nosniff");
      if (route === "/api") {
        if (
          req.method !== "POST" ||
          req.headers.origin !== origin ||
          req.headers["content-type"] !== "application/json"
        )
          throw Error("Invalid request origin or type");
        const chunks = [];
        let size = 0;
        for await (const chunk of req) {
          size += chunk.length;
          if (size > 8 * 1024 * 1024)
            throw Error("Workspace request too large");
          chunks.push(chunk);
        }
        const input = JSON.parse(Buffer.concat(chunks)),
          { op, id, revision } = input;
        let result;
        if (op === "list") result = store.list();
        else if (op === "create") {
          const value = workspace(input.name);
          result = { revision: store.save(value, 0), value };
        } else if (op === "read") result = store.read(id);
        else if (op === "save")
          result = { revision: store.save(input.value, revision) };
        else if (op === "generate") {
          const current = store.read(id);
          if (current.revision !== revision) throw Error("Workspace changed");
          const node = current.value.conversations.find(
            (c) => c.id === input.node,
          );
          if (!node) throw Error("Conversation unavailable");
          result = await generate(
            current.value,
            node,
            input.instruction,
            provider,
          );
        } else throw Error("Unknown operation");
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(result));
        return;
      }
      const file = resolve(root, "." + (route === "/" ? "/index.html" : route));
      if (!file.startsWith(resolve(root) + sep)) throw Error("Invalid asset");
      const type = extname(file),
        asset = await readFile(file);
      res.setHeader(
        "Content-Type",
        {
          ".js": "text/javascript",
          ".css": "text/css",
          ".html": "text/html",
          ".woff2": "font/woff2",
        }[type] || "application/octet-stream",
      );
      res.setHeader(
        "Content-Security-Policy",
        "default-src 'none'; script-src 'self'; worker-src 'self'; connect-src " +
          (type === ".html" ? "'self'" : "'none'") +
          "; style-src 'self' 'unsafe-inline'; img-src 'self' data:; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
      );
      res.end(asset);
    } catch (e) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: e.message }));
    }
  });
  await new Promise((ok, fail) => {
    server.once("error", fail);
    server.listen(port, "127.0.0.1", ok);
  });
  server.on("close", () => store.close());
  return server;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const server = await serve({
    path:
      process.env.THINKSPACE_DB ||
      resolve(homedir(), ".thinkspace/workspaces.sqlite"),
  });
  console.log("Thinkspace http://127.0.0.1:" + server.address().port);
}
