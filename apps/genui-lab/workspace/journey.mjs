import { chromium, expect } from "@playwright/test";
import { mkdir, readFile, writeFile, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import assert from "node:assert/strict";
import { serve } from "../../workspace/server.mjs";
import { tasks } from "../generation/harness.mjs";
const live = process.argv.includes("--live");
const out = process.argv[2];
if (!out || out.startsWith("--"))
  throw Error("Supply a fresh evidence directory");
await mkdir(out);
const folder = await mkdtemp(join(tmpdir(), "thinkspace-journey-"));
const path = join(folder, "workspace.sqlite");

let providerCalls = 0;
async function deterministic(messages) {
  providerCalls++;

  const instruction = messages.at(-1).content;
  const source = await readFile(
    new URL("../fixtures/B03.oui", import.meta.url),
    "utf8",
  );
  const blocks = instruction.startsWith("Reject")
    ? [{ type: "ui", source: "invalid", state: [] }]
    : instruction.includes("Regenerate") || instruction === tasks.B03
      ? [
          {
            type: "ui",
            source: source.replace(
              "Synthetic scores.",
              instruction.includes("Regenerate")
                ? "Illustrative assumptions."
                : "Synthetic scores.",
            ),
            state: [],
          },
        ]
      : [
          {
            type: "text",
            text: "Compare native integration, runtime size and delivery efficiency.",
          },
        ];
  return { raw: JSON.stringify({ version: "2b1", blocks }), latencyMs: 0 };
}
const options = { path, port: 0, provider: live ? undefined : deterministic };
let server = await serve(options);
const browser = await chromium.launch();
let page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
const origin = "http://127.0.0.1:" + server.address().port;
const take = (name) => page.screenshot({ path: join(out, name + ".png") });
const button = (name) => page.getByRole("button", { name, exact: true });
async function send(prompt, action = "Send message") {
  await page
    .getByRole("textbox", {
      name: action === "Send message" ? "Message" : "Refinement request",
      exact: true,
    })
    .fill(prompt);
  await button(action).click();
  await expect(button("Working…")).toHaveCount(0, { timeout: 170000 });
}
async function record() {
  return page.evaluate(async () => {
    const res = await fetch("/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        op: "read",
        id: localStorage.getItem("workspace"),
      }),
    });
    return res.json();
  });
}
try {
  await page.goto(origin);
  await button("Create workspace").click();
  await expect(
    page.getByRole("heading", { name: "Exploration", exact: true }),
  ).toBeVisible();
  await take("01-workspace");
  const start = Date.now();
  await send(
    "Explore Native Hybrid, Tauri and Electron for a desktop thinking workspace. Give a short text comparison.",
  );
  await expect(page.locator("article")).toHaveCount(2);
  await take("02-comparison");
  await send(tasks.B03);
  await expect(page.getByRole("slider").first()).toBeVisible();
  const interactiveMs = Date.now() - start;
  await take("03-matrix");
  const worker = page.workers().at(-1);
  const directive = await worker.evaluate(async () => {
    const blocked = new Promise((ok) =>
      self.addEventListener(
        "securitypolicyviolation",
        (e) => ok(e.effectiveDirective),
        { once: true },
      ),
    );
    try {
      await fetch("/index.html");
      return "allowed";
    } catch {
      return blocked;
    }
  });
  assert.equal(directive, "connect-src");
  const table = page.getByRole("table").first();
  const rankingBefore = await table.innerText();
  const slider = page.getByRole("slider").first();
  const before = (await record()).value.generations.length;
  const movement = Date.now();
  await slider.fill("0");
  await expect(slider).toHaveValue("0");
  await expect.poll(() => table.innerText()).not.toBe(rankingBefore);
  const interactionMs = Date.now() - movement;
  await button("Open as workspace artifact").click();
  await expect(
    page.getByRole("heading", { name: "Interactive artifact" }),
  ).toBeVisible();
  await take("04-promoted");
  const initial = (await record()).value;
  assert.equal(initial.generations.length, before);
  const artifact = initial.artifacts[0];
  assert.ok(Object.values(artifact.state).includes(0));
  await page
    .locator(".react-flow__node")
    .filter({ hasText: /^Exploration$/ })
    .click();
  await button("Branch here").last().click();
  await expect(
    page.getByRole("heading", { name: "Branch of Exploration" }),
  ).toBeVisible();
  await expect(page.getByRole("slider").first()).toBeDisabled();
  await expect(page.getByRole("slider").first()).toHaveValue("40");
  await take("05-branch");
  if (!live) {
    await page
      .locator(".react-flow__node")
      .filter({ hasText: /^Interactive artifact$/ })
      .click();
    await page.getByRole("slider").first().fill("12");
    await expect
      .poll(async () =>
        Object.values((await record()).value.artifacts[0].state),
      )
      .toContain(12);
    await page
      .locator(".react-flow__node")
      .filter({ hasText: /^Branch of Exploration$/ })
      .click();
    await expect(page.getByRole("slider").first()).toHaveValue("40");
    await page
      .locator(".react-flow__node")
      .filter({ hasText: /^Interactive artifact$/ })
      .click();
    await page.getByRole("slider").first().fill("0");
    await expect
      .poll(async () =>
        Object.values((await record()).value.artifacts[0].state),
      )
      .toContain(0);
  }
  await button("New conversation").click();
  await page.getByText("Context inspector", { exact: true }).click();
  const select = page.getByLabel("Context source");
  for (const label of ["Exploration", "Interactive artifact · revision 1"]) {
    await select.selectOption({ label });
    await button("Include snapshot").click();
  }
  await expect(button("Remove snapshot")).toHaveCount(2);
  await page.getByRole("listitem").filter({hasText:"Interactive artifact"}).getByRole("button",{name:"Remove snapshot"}).click();
  assert.equal(
    (await record()).value.conversations.at(-1).references.length,
    1,
  );
  await button("Include snapshot").click();
  await take("06-context");
  await send(
    "Synthesize the architecture trade-offs using the selected artifact state and conversation.",
  );
  const synthesis = (await record()).value.generations.at(-1);
  assert.deepEqual(synthesis.context.included.map(item=>item.representation),["history","conversation","artifact"]);
  assert.deepEqual(
    JSON.parse(synthesis.messages[1].content).context,
    synthesis.context,
  );
  await page
    .locator(".react-flow__node")
    .filter({ hasText: /^Interactive artifact$/ })
    .click();
  await send(
    "Clarify the synthetic-score assumptions in a Text block inside the UI. Keep every control, binding, domain, and calculation identical.",
    "Regenerate artifact",
  );
  await expect(page.getByText(/Revision 2 ·/)).toBeVisible();
  await page.getByText("Revision 1 provenance", { exact: true }).click();
  await expect(page.getByRole("slider").last()).toBeDisabled();
  await page.getByText("Revision 1 provenance", { exact: true }).click();
  await page.getByText("Revision 2 provenance", { exact: true }).click();
  await expect(
    page
      .getByText("Clarify the synthetic-score assumptions", { exact: false })
      .first(),
  ).toBeVisible();
  await take("07-revision");
  await page
    .locator(".react-flow__node")
    .filter({ hasText: /^Branch of Exploration$/ })
    .click();
  await expect(page.getByRole("slider").first()).toHaveValue("40");
  await expect(page.getByRole("slider").first()).toBeDisabled();
  await page
    .locator(".react-flow__node")
    .filter({ hasText: /^Interactive artifact$/ })
    .click();
  if (!live) {
    await send("Reject this malformed revision", "Regenerate artifact");
    await expect(page.getByRole("alert")).toBeVisible();
    await take("08-rejection");
  }
  const dragTarget = page
    .locator(".react-flow__node")
    .filter({ hasText: /^Interactive artifact$/ });
  const box = await dragTarget.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    box.x + box.width / 2 + 25,
    box.y + box.height / 2 + 18,
    { steps: 8 },
  );
  await page.mouse.up();
  await expect
    .poll(async () => Object.keys((await record()).value.positions).length)
    .toBeGreaterThan(0);
  const saved = (await record()).value;
  assert.equal(saved.artifacts[0].revision, 2);
  assert.deepEqual(saved.artifacts[0].state, artifact.state);
  const port = server.address().port;
  await page.close();
  await new Promise((ok) => server.close(ok));
  server = await serve({ ...options, port });
  page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  await page.goto(origin);
  await page
    .getByLabel("Workspace", { exact: true })
    .selectOption({ label: "Architecture Exploration" });
  await page
    .locator(".react-flow__node")
    .filter({ hasText: /^Interactive artifact$/ })
    .click();
  await expect(page.getByRole("slider").first()).toHaveValue("0");
  assert.deepEqual((await record()).value, saved);
  await take("09-restored");
  await writeFile(
    join(out, "journey.json"),
    JSON.stringify(
      {
        mode: live ? "live" : "deterministic",
        interactiveMs,
        interactionMs,
        workerNetworkDirective: directive,
        workspace: saved,
      },
      null,
      2,
    ),
  );
  if (!live) {
    // Simulate a corrupted persisted specification, then open through the normal UI.
    const current = await record();
    current.value.artifacts[0].source = "x".repeat(16001);
    const db = new DatabaseSync(path);
    db.prepare("UPDATE workspace SET document=? WHERE id=?").run(
      JSON.stringify(current.value),
      current.value.id,
    );
    db.close();
    await page.reload();
    const count = providerCalls;
    await button("New conversation").click();
    await page.getByText("Context inspector", { exact: true }).click();
    await page
      .getByLabel("Context source")
      .selectOption({ label: "Interactive artifact · revision 2" });
    await button("Include snapshot").click();
    await expect(page.getByRole("alert")).toContainText("budget");
    await page
      .getByRole("textbox", { name: "Message", exact: true })
      .fill("Use the corrupt artifact");
    await expect(button("Send message")).toBeDisabled();
    assert.equal(providerCalls, count);
    await page
      .locator(".react-flow__node")
      .filter({ hasText: /^Interactive artifact$/ })
      .click();
    await expect(page.getByRole("alert")).toContainText("budget");
    await expect(page.getByRole("slider")).toHaveCount(0);
    await take("10-corrupt-restore");
  }
} catch (e) {
  await take("failure");
  await writeFile(
    join(out, "failure.json"),
    JSON.stringify({ error: e.message, record: await record() }, null, 2),
  );
  throw e;
} finally {
  await browser.close();
  await new Promise((ok) => server.close(ok));
}
