// Offline only. This module and the reference calculations are never imported by the harness.
import { preview } from "vite";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import { parseExpressionAt } from "acorn";
import { ranking, baggageCases } from "../tests/oracles.mjs";
import { replay } from "./browser.mjs";
const out = resolve(process.argv[2] || "evidence/goal-2a/openai");

function syntax(a, protocol) {
  if (!a.raw || a.finish !== "stop") return false;
  const raw = a.raw.trim().replaceAll("\r\n", "\n");
  if (raw.startsWith("TEXT\n")) return raw.slice(5).trim().length > 0;
  if (!raw.startsWith("UI\n")) return false;
  try {
    let source = raw.slice(3);
    if (source.startsWith("STATE ")) {
      const i = source.indexOf("\n");
      if (i < 0) return false;
      JSON.parse(source.slice(6, i));
      source = source.slice(i + 1);
    }
    if (protocol === "json") {
      JSON.parse(source);
      return true;
    }
    return source
      .trim()
      .split("\n")
      .filter((x) => x.trim())
      .every((line) => {
        const m = /^\s*\$?[A-Za-z][\w]*\s*=\s*(.+?)\s*$/.exec(line);
        if (!m) return false;
        // Syntax only: inspect call spelling independently from the admission allowlist.
        const code =
          "(" +
          m[1].replace(
            /"(?:\\.|[^"\\])*"|@([A-Za-z]\w*)/g,
            (token, name) => name || token,
          ) +
          ")";
        return (
          parseExpressionAt(code, 0, {
            ecmaVersion: 2022,
            preserveParens: true,
          }).end === code.length
        );
      });
  } catch {
    return false;
  }
}
function category(a) {
  if (a.status === "provider-error" || a.finish === "length")
    return "model generation failure";
  if (a.status === "runtime-error") return "runtime failure";
  if (a.status !== "rejected") return null;
  return /Expected UI or TEXT header|state envelope|response envelope/i.test(
    a.diagnostic,
  )
    ? "harness contract failure"
    : "model generation failure";
}
async function stateOf(page) {
  return JSON.parse(await page.locator("#result").textContent());
}
async function behavior(page, task, original) {
  let checked = 0,
    context = null;
  try {
    assert.equal(original.status, "accepted", "Interactive UI required");
    const controls = original.frame.items.filter((x) => x.type === "Control");
    const pick = (re) => {
      const matches = controls.filter((x) =>
        re.test(x.binding + " " + x.props.label),
      );
      assert.equal(matches.length, 1, "Identify one control: " + re);
      return matches[0];
    };
    async function change(c, n) {
      const el = page
        .locator(".stack label")
        .nth(controls.indexOf(c))
        .locator("input,select");
      assert(
        n >= c.props.min && n <= c.props.max,
        "Requested value outside control domain",
      );
      if (c.props.choices.length) await el.selectOption(String(n));
      else await el.fill(String(n));
      await page.waitForFunction(
        ({ key, v }) => {
          const r = JSON.parse(document.querySelector("#result").textContent);
          return r.status === "runtime-error" || r.frame?.state[key] === v;
        },
        { key: c.binding, v: n },
        { timeout: 1500 },
      );
      const r = await stateOf(page);
      if (r.status === "runtime-error") throw Error("RUNTIME " + r.diagnostic);
    }
    if (task === "B03") {
      const inputs = [
        pick(/native/i),
        pick(/light|runtime/i),
        pick(/delivery|efficien/i),
      ];
      assert.deepEqual(
        inputs.map((x) => original.frame.state[x.binding]),
        [40, 25, 35],
        "Initial weights",
      );
      for (const weights of [
        [40, 25, 35],
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
        [0, 0, 0],
        [1, 0, 2],
      ]) {
        context = { weights };
        for (let i = 0; i < 3; i++) await change(inputs[i], weights[i]);
        const f = (await stateOf(page)).frame;
        const rows = f.items.find((x) => x.type === "Table")?.props.values;
        assert(rows, "Ranked rows missing");
        const ref = ranking(weights);
        assert.equal(rows.length, ref.length, "Rank count");
        for (const [i, row] of rows.entries()) {
          const expected = ref.find(
            (x) => x.name.toLowerCase() === row.label.trim().toLowerCase(),
          );
          assert(
            expected && Math.abs(row.score - expected.score) < 0.0051,
            "Incorrect weighted score",
          );
          assert(i === 0 || rows[i - 1].score >= row.score, "Descending rank");
        }
        assert.equal(
          new Set(rows.map((x) => x.label)).size,
          rows.length,
          "Duplicate candidates",
        );
        checked++;
      }
    } else {
      const fare = pick(/fare|class/i),
        member = pick(/member|gold|status/i),
        weight = pick(/weight|mass/i);
      function select(c, rx, ordinal) {
        const choices = c.props.choices;
        const idx = choices.findIndex((x) => rx.test(x));
        if (idx >= 0) return idx;
        assert(!choices.length, "Missing option " + rx);
        return ordinal;
      }
      for (const c of baggageCases()) {
        context = c;
        await change(
          fare,
          select(fare, new RegExp(c.fare, "i"), Number(c.fare === "Business")),
        );
        await change(
          member,
          select(
            member,
            c.membership === "Gold"
              ? /gold|^yes$/i
              : /standard|none|regular|non.?member|^no$|normal|basic/i,
            Number(c.membership === "Gold"),
          ),
        );
        await change(weight, c.weight);
        const metrics = (await stateOf(page)).frame.items.filter(
          (x) => x.type === "Metric",
        );
        assert.equal(
          metrics.find((x) => /allow|limit/i.test(x.props.label))?.props.value,
          c.allowance,
          "Allowance",
        );
        assert.equal(
          metrics.find((x) => /fee|cost|charge/i.test(x.props.label))?.props
            .value,
          c.fee,
          "Fee",
        );
        checked++;
      }
    }
    return { pass: true, checked };
  } catch (e) {
    return { pass: false, checked, context, reason: e.message.slice(0, 400) };
  }
}
const server = await preview({
  preview: { host: "127.0.0.1", port: 0, strictPort: true },
});
const url = new URL("replay.html", server.resolvedUrls.local[0]).href;
let browser;
try {
  browser = await chromium.launch();
  const files = (await readdir(join(out, "episodes")))
    .filter((x) => x.endsWith(".json"))
    .sort();
  const results = [];
  async function lane() {
    const page = await browser.newPage();
    for (let name; (name = files.shift()); ) {
      const d = JSON.parse(await readFile(join(out, "episodes", name)));
      const checks = [];
      for (const a of d.attempts) {
        const r =
          a.status === "provider-error"
            ? { status: a.status, diagnostic: a.diagnostic }
            : a.finish === "stop"
              ? await replay(page, d.protocol, a.raw, url)
              : {
                  status: "rejected",
                  diagnostic: "Incomplete provider output: " + a.finish,
                };
        assert.equal(r.status, a.status, d.id);
        if (r.frame && a===d.attempts.at(-1) && ["B04-H2-oui-1703","B01-H2-oui-1701"].includes(d.id)) {
          await page.locator(".stack").screenshot({path:join(out,d.id+".png")})
        }
        if (r.frame) assert.deepEqual(r.frame, a.frame, d.id);
        if (r.text) assert.equal(r.text, a.text, d.id);
        if (r.diagnostic) assert.equal(r.diagnostic, a.diagnostic, d.id);
        const diagnostic = a.diagnostic || "";
        checks.push({
          status: r.status,
          syntax: syntax(a, d.protocol),
          category: category(a),
          explicitCapabilityDenial:
            /capability denied|Unknown (component|function)|Operator denied|Unsupported syntax: (MemberExpression|UnaryExpression|ArrowFunctionExpression)|Unauthorized key/.test(
              diagnostic,
            ),
          usage: a.usage,
          latencyMs: a.latencyMs,
        });
      }
      const final = d.attempts.at(-1);
      const functional = ["B03", "B04"].includes(d.task)
        ? await behavior(page, d.task, final)
        : null;
      results.push({
        id: d.id,
        task: d.task,
        protocol: d.protocol,
        variant: d.variant,
        checks,
        functional,
      });
    }
  }
  await Promise.all(Array.from({ length: 3 }, lane));
  results.sort((a, b) => a.id.localeCompare(b.id));
  await writeFile(
    join(out, "audit.json"),
    JSON.stringify(results, null, 2) + "\n",
  );
  console.log(
    "Verified offline replay of",
    results.reduce((n, r) => n + r.checks.length, 0),
    "attempts across",
    results.length,
    "episodes",
  );
} finally {
  await browser?.close();
  await server.close();
}
