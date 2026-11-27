import { test, expect } from "@playwright/test";
import { shapes } from "../src/svg-schema";
test("SVG catalog rejects unknown elements, attributes, references and oversized geometry", () => {
  const rect = { kind: "rect", x: 0, y: 0, width: 3, height: 4 };
  for (const invalid of [
    [{ kind: "script" }],
    [{ ...rect, onclick: "blocked" }],
    [{ ...rect, href: "https://example.invalid" }],
    [{ kind: "path", d: "url(example)" }],
    [{ ...rect, width: 999999 }],
    Array(41).fill(rect),
  ]) {
    expect(shapes.safeParse(invalid).success).toBe(false);
  }
  expect(shapes.safeParse([rect]).success).toBe(true);
});
test("production policy blocks same-origin runtime network reads", async ({
  page,
}) => {
  await page.goto("/");
  const directive = await page.evaluate(async () => {
    const event = new Promise<string>((resolve) =>
      document.addEventListener(
        "securitypolicyviolation",
        (e) => resolve(e.effectiveDirective),
        { once: true },
      ),
    );
    try {
      await fetch("/index.html");
      return "unexpected success";
    } catch {
      return event;
    }
  });
  expect(directive).toBe("connect-src");
});
