import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { admit } from "../src/admission/session";
import { limits } from "../src/admission/policy";
const novel = (name: string) =>
  readFileSync(new URL("./corpora/novel/" + name, import.meta.url), "utf8");
const metric = (expr: string) =>
  'root = Stack([out])\nout = Metric("Reading", ' + expr + ")";
test("novel programs use only the public admission entry point", () => {
  expect(
    admit("oui", novel("temperature.oui")).change("celsius", 25).items[1].props,
  ).toEqual({ label: "Fahrenheit", value: 77 });
  expect(
    admit("oui", novel("stock.oui")).change("count", 0).items[1].props,
  ).toEqual({ text: "Empty" });
  expect(
    admit("json", novel("length.json")).change("length", 3).items[1].props,
  ).toEqual({ label: "Centimetres", value: 300 });
});
test("invalid and out-of-budget corpus rejects with diagnostics", () => {
  const cases = [
    metric("12 34"),
    metric("1 / 0"),
    metric("1000000000 * 2"),
    metric("unknown"),
    metric("@Unavailable(1)"),
    metric("1") + "\nskipped declaration",
    metric("foo") + "\nfoo = bar\nbar = foo",
    metric("1") + '\nout = Metric("duplicate", 2)',
    metric("(".repeat(35) + "2" + ")".repeat(35)),
    metric("@Sum([" + Array(41).fill("1").join(",") + "])"),
    'root = Stack([x])\nx = Query("disabled", {})',
    'root = Stack([x])\nx = Graphic("shape", [{kind:"foreignObject"}])',
    'root = Stack([x])\nx = Graphic("shape", [{kind:"circle",cx:1,cy:1,r:1,href:"blocked"}])',
    metric("0") + "\nunused = 4",
    " ".repeat(limits.sourceBytes + 1),
    metric("1/* ignored */+2"),
    metric("1") + "\n$unbound = 5",
  ];
  for (const source of cases) expect(() => admit("oui", source)).toThrow();
  const json = novel("length.json");
  for (const source of [
    json.replace('"root":', '"root":"other","root":'),
    json.replace('"Multiply"', '"Unknown"'),
    json.replace('"/length"', '"/unknown/deep"'),
    json.replace('"type":"Stack"', '"type":"Stack","on":{}'),
  ])
    expect(() => admit("json", source)).toThrow();
  const leaf = '{kind:"circle",cx:1,cy:1,r:1}';
  const group = '{kind:"group",items:[' + Array(30).fill(leaf).join(",") + "]}";
  expect(() =>
    admit(
      "oui",
      "root = Stack([a,b,c,d])\nparts = [" +
        group +
        "]\n" +
        ["a", "b", "c", "d"]
          .map((n) => n + ' = Graphic("Dots", parts)')
          .join("\n"),
    ),
  ).toThrow(/budget/i);
});
test("state failures are atomic and updates bounded", () => {
  const source = novel("temperature.oui");
  for (const seed of [
    { x: 2 },
    { celsius: 101 },
    { celsius: NaN },
    { celsius: 1.5 },
  ])
    expect(() =>
      admit("oui", source, seed as Record<string, number>),
    ).toThrow();
  const s = admit("oui", source);
  expect(() => s.change("celsius", 200)).toThrow();
  for (let i = 1; i < limits.updates; i++) s.change("celsius", i % 50);
  expect(() => s.change("celsius", 1)).toThrow(/update budget/);
});
test("seeded grammar properties cover arithmetic and invalid suffixes", () => {
  let seed = 173;
  function next() {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed % 19;
  }
  for (let i = 0; i < 100; i++) {
    const a = next(),
      b = next(),
      c = next();
    const source = metric("(" + a + " + " + b + ") * " + c);
    expect(admit("oui", source).initial.items[0].props).toEqual({
      label: "Reading",
      value: (a + b) * c,
    });
    expect(() => admit("oui", source + " " + next())).toThrow();
  }
});
test("revision, forged projection, failure isolation and recovery", async ({
  page,
}) => {
  await page.goto("/");
  const pane = page.locator("article").nth(1);
  await pane.getByText("Raw specification").click();
  const revise = async (s: string) => {
    await pane.getByLabel("Revised specification").fill(s);
    await pane.getByText("Admit revision").click();
  };
  await revise(novel("temperature.oui"));
  await expect(pane.locator("[data-metric]")).toHaveText("68");
  await pane.getByRole("slider").fill("25");
  await expect(pane.locator("[data-metric]")).toHaveText("77");
  await pane.getByText("Save snapshot").click();
  await pane.getByText("Artifact and context").click();
  const raw = JSON.parse(await pane.getByLabel("Snapshot").inputValue());
  expect(raw.provenance.policy).toBe("1.5.0");
  raw.projection.outputs.Fahrenheit = 999;
  raw.state.celsius = 30;
  await pane.getByLabel("Snapshot").fill(JSON.stringify(raw));
  await pane.getByText("Import snapshot").click();
  await expect(pane.locator("[data-metric]")).toHaveText("86");
  await pane.getByText("Save snapshot").click();
  expect(
    JSON.parse(await pane.getByLabel("Snapshot").inputValue()).projection
      .outputs.Fahrenheit,
  ).toBe(86);
  await revise(metric("1 / 0"));
  await expect(pane.getByRole("alert")).toContainText("Division by zero");
  await expect(pane.locator("[data-metric]")).toHaveText("86");
  await page.getByRole("button", { name: "B03", exact: true }).click();
  await expect(page.locator("article").first().locator("tr")).toHaveCount(3);
});
test("deadline terminates a busy worker while the other artifact stays interactive", async ({
  page,
  context,
}) => {
  await page.goto("/");
  const open = page.locator("article").nth(1);
  await expect(open.locator("svg")).toBeVisible();
  // Test-only instrumented worker asset. The busy interval has its own finite bound.
  let injected = false;
  await context.route("**/assets/runtime.worker-*.js", async (route) => {
    if (injected) return route.continue();
    injected = true;
    await route.fulfill({
      contentType: "text/javascript",
      body: 'self.onmessage=()=>{const end=performance.now()+4500;while(performance.now()<end){};postMessage({error:"worker completed"})}',
    });
  });
  await open.getByText("Raw specification").click();
  await open.getByLabel("Revised specification").fill(novel("temperature.oui"));
  const closed = page
    .waitForEvent("worker")
    .then((worker) => worker.waitForEvent("close"));
  await open.getByText("Admit revision").click();
  await expect(open.getByRole("alert")).toContainText("deadline exceeded", {
    timeout: 4000,
  });
  await closed;
  await expect(open.locator("svg")).toBeVisible();
  await page.locator("article").first().getByText("Save snapshot").click();
  await open.getByText("Admit revision").click();
  await expect(open.locator("[data-metric]")).toHaveText("68");
});
test("artifact error boundary contains a trusted view failure", async ({
  page,
}) => {
  await page.goto("/");
  const open = page.locator("article").nth(1);
  await expect(open.locator("svg")).toBeVisible();
  // Inject a trusted DOM failure limited to circle creation on this page.
  await page.evaluate(() => {
    const create = Document.prototype.createElementNS;
    Document.prototype.createElementNS = function (
      ...args: Parameters<typeof create>
    ) {
      if (args[1] === "circle") throw Error("test-only drawing failure");
      return create.apply(this, args);
    } as typeof create;
  });
  await open.getByText("Raw specification").click();
  await open
    .getByLabel("Revised specification")
    .fill(
      'root = Stack([dot])\ndot = Graphic("Dot", [{kind:"circle",cx:5,cy:5,r:2}])',
    );
  await open.getByText("Admit revision").click();
  await expect(open.getByRole("alert")).toContainText("rendering failed");
  await expect(page.locator("article").first().locator("svg")).toBeVisible();
  await open.getByLabel("Revised specification").fill(novel("stock.oui"));
  await open.getByText("Admit revision").click();
  await expect(open.getByText("Available")).toBeVisible();
});
test("worker resource receives its own offline network policy", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("article").nth(1).locator("svg")).toBeVisible();
  const worker = page.workers()[0];
  expect(
    await worker.evaluate(async () => {
      const violation = new Promise<string>((resolve) =>
        self.addEventListener(
          "securitypolicyviolation",
          (e) =>
            resolve((e as SecurityPolicyViolationEvent).effectiveDirective),
          { once: true },
        ),
      );
      try {
        await fetch("/index.html");
        return "allowed";
      } catch {
        return violation;
      }
    }),
  ).toBe("connect-src");
});
test("rejected update preserves prior state and a later valid update succeeds", () => {
  const source =
    'root = Stack([setting,result])\n$x = 1\nsetting = Control("Divisor", 0, 3, [], $x)\nresult = Metric("Ratio", 12 / $x)';
  const s = admit("oui", source);
  expect(() => s.change("x", 0)).toThrow("Division by zero");
  expect(s.initial.state.x).toBe(1);
  expect(s.change("x", 3).items[1].props).toEqual({ label: "Ratio", value: 4 });
});
