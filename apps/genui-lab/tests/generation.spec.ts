import { test, expect } from "@playwright/test";
import { parseExpression } from "../src/admission/syntax";
import { parseExpression as upstream, tokenize } from "@openuidev/lang-core";
import { validateTransfer } from "../src/admission/transport";
test("host blocks UTF-8 source and envelope before a Worker receives a message", async ({
  page,
}) => {
  expect(() =>
    validateTransfer({
      kind: "open",
      source: "ok",
      state: { junk: "a".repeat(64000) },
    }),
  ).toThrow(/envelope/);
  await page.addInitScript(() => {
    const send = Worker.prototype.postMessage;
    Object.assign(window, { sent: 0 });
    Worker.prototype.postMessage = function (...args: Parameters<typeof send>) {
      (window as unknown as { sent: number }).sent++;
      return send.apply(this, args);
    };
  });
  await page.goto("/replay.html");
  await page
    .getByLabel("Complete model output")
    .fill("UI\n" + "字".repeat(5500));
  await page.getByText("Replay", { exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Source byte budget");
  expect(
    await page.evaluate(() => (window as unknown as { sent: number }).sent),
  ).toBe(0);
});
test("replay retains repeated labels, multiple text values and exact plain text", async ({
  page,
}) => {
  await page.goto("/replay.html");
  const raw = page.getByLabel("Complete model output");
  const spec = 'root = Stack([a,b,c,d])\na = Text("one")\nb = Text("two")\nc = Metric("Value",1)\nd = Metric("Value",2)';
  await raw.fill("UI\n"+spec);
  await page.getByText("Replay", { exact: true }).click();
  await expect(page.locator("[data-metric]")).toHaveText(["1", "2"]);
  const frame = JSON.parse(
    (await page.locator("#result").textContent()) || "{}",
  ).frame;
  expect(frame.items.map((x: { props: object }) => x.props)).toEqual([
    { text: "one" },
    { text: "two" },
    { label: "Value", value: 1 },
    { label: "Value", value: 2 },
  ]);
  await raw.fill("TEXT\n<literal>");
  await page.getByText("Replay", { exact: true }).click();
  await expect(page.getByText("<literal>", { exact: true })).toBeVisible();
  await page.goto("/");
  const pane=page.locator("article").nth(1);
  await pane.getByText("Raw specification").click();
  await pane.getByLabel("Revised specification").fill(spec);
  await pane.getByText("Admit revision").click();
  await expect(pane.locator("[data-metric]")).toHaveText(["1","2"]);
  await pane.getByText("Save snapshot").click();
  const projection=JSON.parse(await pane.getByLabel("Snapshot").inputValue()).projection;
  expect(projection.components).toEqual(frame.items.map((entry:{type:string,props:object},index:number)=>({index,type:entry.type,props:entry.props})));

});
test("restricted parser preserves supported upstream ASTs and rejects incomplete input", () => {
  for (const expression of [
    "2 * (3 + 4)",
    "@Sum([1,2])",
    "n > 0 ? n : 0",
    '{label:"x",score:2}',
  ])
    expect(parseExpression(expression)).toEqual(upstream(tokenize(expression)));
  for (const malformed of ["1 2", "(1 + 2", "@Sum([1,2]", "a.b"])
    expect(() => parseExpression(malformed)).toThrow();
});
test("model-enabled deployment denies provider access in page and independent Worker", async ({
  page,
}) => {
  test.skip(
    !process.env.GENUI_PROVIDER_PREFLIGHT,
    "requires running trusted provider process",
  );
  await page.goto("/");
  await expect(page.locator("article").nth(1).locator("svg")).toBeVisible();
  const target =
    process.env.GENUI_PROVIDER_PREFLIGHT === "openai"
      ? "https://api.openai.com/v1/models"
      : "http://127.0.0.1:4193/health";
  const check = async (url: string) => {
    const event = new Promise<string>((resolve) =>
      self.addEventListener(
        "securitypolicyviolation",
        (e) => resolve((e as SecurityPolicyViolationEvent).effectiveDirective),
        { once: true },
      ),
    );
    try {
      await fetch(url);
      return "allowed";
    } catch {
      return event;
    }
  };
  expect(await page.evaluate(check, target)).toBe("connect-src");
  expect(await page.workers()[0].evaluate(check, target)).toBe("connect-src");
});
