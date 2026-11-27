import { test, expect } from "@playwright/test";
import { writeFileSync } from "node:fs";
import { ranking, baggageCases } from "./oracles.mjs";
async function slide(input, v) {
  await input.fill(String(v));
}
for (const [idx, format] of ["json", "oui"].entries()) {
  for (const task of ["B02", "B03", "B04"])
    test(format + " " + task, async ({ page, browser }) => {
      const started = performance.now();
      const interactionMs = [];
      await page.goto("/");
      await page.getByRole("button", { name: task, exact: true }).click();
      const pane = page.locator("article").nth(idx);
      await expect(pane.locator(".stack")).toBeVisible();
      const firstVisibleMs = performance.now() - started;
      expect(await pane.evaluate((p) => p.scrollWidth <= p.clientWidth)).toBe(
        true,
      );
      await page.screenshot({
        path: "evidence/goal-1.5/" + task + "-" + format + ".png",
      });
      await expect(pane.getByRole("alert")).toHaveCount(0);
      await pane.getByText("Save snapshot").click();
      writeFileSync(
        "evidence/goal-1.5/" + task + "-" + format + ".initial.json",
        await pane.getByLabel("Snapshot").inputValue(),
      );
      if (task === "B02") {
        await expect(pane.locator("svg text")).toHaveText([
          "Application Orchestrator",
          "Conversation Engine",
          "Context Engine",
        ]);
        await expect(pane.locator("section p")).toContainText(
          "selects and budgets",
        );
      }
      if (task === "B03") {
        for (const weights of [
          [40, 25, 35],
          [100, 0, 0],
          [0, 100, 0],
          [0, 0, 100],
          [0, 0, 0],
          [1, 0, 2],
        ]) {
          for (const [i, v] of weights.entries())
            await slide(pane.getByRole("slider").nth(i), v);
          const expected = ranking(weights);
          await expect(pane.locator("tr")).toHaveCount(expected.length);
          for (const [i, { name, score }] of expected.entries())
            await expect(pane.locator("tr").nth(i).locator("th,td")).toHaveText(
              [name, score.toFixed(2)],
            );
          if (!expected.length)
            await expect(pane.getByText("No ranking")).toBeVisible();
        }
      }
      if (task === "B04") {
        for (const c of baggageCases()) {
          const caseStarted = performance.now();
          await pane.getByLabel("Fare").selectOption({ label: c.fare });
          await pane
            .getByLabel("Membership")
            .selectOption({ label: c.membership });
          await slide(pane.getByRole("slider"), c.weight);
          await expect(pane.locator('[data-metric="Fee ($)"]')).toHaveText(
            String(c.fee),
          );
          await expect(
            pane.locator('[data-metric="Allowance (kg)"]'),
          ).toHaveText(String(c.allowance));
          await expect(pane.locator("svg rect")).toHaveAttribute(
            "width",
            String((c.weight - 10) * 10),
          );
          await expect(pane.locator("svg circle")).toHaveAttribute(
            "cx",
            String(c.weight * 10),
          );
          interactionMs.push(performance.now() - caseStarted);
        }
      }
      await pane.getByText("Save snapshot").click();
      await pane.locator("summary").first().click();
      const raw = await pane.getByLabel("Snapshot").inputValue();
      writeFileSync("evidence/goal-1.5/" + task + "-" + format + ".snapshot.json", raw);
      const artifact = JSON.parse(raw);
      if (task === "B04") {
        expect(artifact.state).toEqual({ fare: 1, gold: 1, weight: 40 });
        expect(artifact.projection.outputs["Fee ($)"]).toBe(45);
      }
      if (task === "B03")
        expect(artifact.projection.outputs.ranking).toEqual(
          ranking([1, 0, 2]).map(({ name, score }) => ({ label: name, score })),
        );
      const fresh = await browser.newContext();
      const reopened = await fresh.newPage();
      await reopened.goto(page.url());
      await reopened.getByRole("button", { name: task, exact: true }).click();
      const isolated = reopened.locator("article").nth(idx);
      await isolated.locator("summary").first().click();
      await isolated.getByLabel("Snapshot").fill(raw);
      await isolated.getByText("Import snapshot").click();
      await expect(isolated.getByRole("alert")).toHaveCount(0);
      if (task === "B04")
        await expect(isolated.locator('[data-metric="Fee ($)"]')).toHaveText(
          "45",
        );
      if (task === "B03")
        await expect(isolated.getByRole("slider").nth(2)).toHaveValue("2");
      await fresh.close();
      writeFileSync(
        "evidence/goal-1.5/" + task + "-" + format + ".timing.json",
        JSON.stringify(
          { firstVisibleMs, caseDriverRoundTripsMs: interactionMs },
          null,
          2,
        ),
      );
      await page.reload();
      await page.getByRole("button", { name: task, exact: true }).click();
      await pane.getByText("Restore saved").click();
      if (task === "B04")
        await expect(pane.locator('[data-metric="Fee ($)"]')).toHaveText("45");
      if (task === "B03")
        await expect(pane.getByRole("slider").nth(2)).toHaveValue("2");
      await expect(pane.getByRole("alert")).toHaveCount(0);
      await pane.locator("summary").first().click();
      for (const [invalid, reason] of [
        [{ ...artifact, state: { unexpected: 0 } }, "state fields"],
        [{}, "Unknown artifact"],
      ]) {
        await pane.getByLabel("Snapshot").fill(JSON.stringify(invalid));
        await pane.getByText("Import snapshot").click();
        await expect(pane.getByRole("alert")).toContainText(reason);
      }
      for (const spec of [
        "Unknown()",
        '<svg onload="blocked">',
        "ExternalHostAction()",
        "(".repeat(2000),
      ]) {
        await pane
          .getByLabel("Snapshot")
          .fill(JSON.stringify({ ...JSON.parse(raw), spec }));
        await pane.getByText("Import snapshot").click();
        await expect(pane.getByRole("alert")).toContainText(
          "Rejected specification",
        );
      }
    });
}
