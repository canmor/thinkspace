export async function replay(
  page,
  protocol,
  raw,
  url = "http://127.0.0.1:4187/replay.html",
  wire="legacy",
) {
  await page.goto(url);
  await page.getByLabel("Envelope").selectOption(wire);
  await page.getByLabel("Protocol").selectOption(protocol);
  await page.getByLabel("Complete model output").fill(raw);
  await page.getByRole("button", { name: "Replay", exact: true }).click();
  await page.waitForFunction(
    () =>
      JSON.parse(document.querySelector("#result").textContent).status !==
      "waiting",
  );
  return JSON.parse(await page.locator("#result").textContent());
}
