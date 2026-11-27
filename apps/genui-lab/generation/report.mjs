import { readFile, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
const out = resolve(process.argv[2] || "evidence/goal-2a/openai");
const load = async (name) => JSON.parse(await readFile(join(out, name)));
const rows = await load("audit.json"),
  review = new Map((await load("semantic-review.json")).map((x) => [x.id, x])),
  manifest = await load("manifest.json");
const cloud = Boolean(manifest.endpoint);
const original = new Map();
for (const row of rows)
  original.set(row.id, (await load("episodes/" + row.id + ".json")).attempts);
function uiCandidate(a) {
  if (a.finish !== "stop" || !a.raw?.trim().startsWith("UI\n")) return false;
  const source = a.raw.trim().slice(3);
  if (!source.startsWith("STATE ")) return true;
  try {
    const state = JSON.parse(source.slice(6, source.indexOf("\n")));
    return Boolean(
      state &&
        typeof state === "object" &&
        !Array.isArray(state) &&
        source.indexOf("\n") > 0,
    );
  } catch {
    return false;
  }
}
const success = (c) => ["accepted", "text"].includes(c.status);
async function summarize(group) {
  const attempts = group.flatMap((r) => r.checks),
    repairs = group.flatMap((r) => r.checks.slice(1));
  const first = group.map((r) => r.checks[0]),
    last = group.map((r) => r.checks.at(-1));
  const delivered = group.filter((r) => success(r.checks.at(-1))),
    interactive = group.filter((r) => r.functional);
  const reviewRows = delivered.map((r) => {
    if (!review.has(r.id)) throw Error("Missing semantic review " + r.id);
    return review.get(r.id);
  });
  const count = (rs, test) => rs.filter(test).length;
  function usage(rs) {
    const sum = (key) => rs.reduce((n, r) => n + (r.usage?.[key] ?? 0), 0);
    const input = sum("prompt_tokens"),
      output = sum("completion_tokens"),
      cached = rs.reduce(
        (n, r) => n + (r.usage?.prompt_tokens_details?.cached_tokens ?? 0),
        0,
      );
    const times = rs
      .map((r) => r.latencyMs)
      .filter(Number.isFinite)
      .sort((a, b) => a - b);
    return {
      calls: rs.length,
      input,
      output,
      cached,
      medianLatencyMs: times.length
        ? times[Math.floor(times.length / 2)]
        : null,
      estimatedProviderUSD: cloud
        ? ((input - cached) * 0.4 + cached * 0.1 + output * 1.6) / 1e6
        : 0,
    };
  }
  const percent = (n, d) => ({
    count: n,
    denominator: d,
    percent: d ? Number(((100 * n) / d).toFixed(1)) : null,
  });
  const classifications = {};
  for (const a of attempts)
    if (a.category)
      classifications[a.category] = (classifications[a.category] || 0) + 1;
  const firstUI = group.filter((r) => uiCandidate(original.get(r.id)[0])),
    lastUI = group.filter((r) => uiCandidate(original.get(r.id).at(-1)));
  const allUI = group.flatMap((r) => original.get(r.id)).filter(uiCandidate);
  return {
    firstAdmittedAmongSubmittedUI: percent(
      count(firstUI, (r) => r.checks[0].status === "accepted"),
      firstUI.length,
    ),
    finalAdmittedAmongSubmittedUI: percent(
      count(lastUI, (r) => r.checks.at(-1).status === "accepted"),
      lastUI.length,
    ),
    rejectedAtAdmission: percent(
      count(allUI, (r) => r.status === "rejected"),
      allUI.length,
    ),
    episodes: group.length,
    attempts: attempts.length,
    firstWireAndSurfaceSyntax: percent(
      count(first, (c) => c.syntax),
      group.length,
    ),
    firstAcceptedResponse: percent(count(first, success), group.length),
    finalAcceptedResponse: percent(count(last, success), group.length),
    firstAdmittedUI: percent(
      count(first, (c) => c.status === "accepted"),
      group.length,
    ),
    finalAdmittedUI: percent(
      count(last, (c) => c.status === "accepted"),
      group.length,
    ),
    finalText: count(last, (c) => c.status === "text"),
    functionality: percent(
      count(interactive, (r) => r.functional.pass),
      interactive.length,
    ),
    semanticErrors: percent(
      count(reviewRows, (r) => !r.semanticCorrect),
      reviewRows.length,
    ),
    taskSuccess: percent(
      count(
        delivered,
        (r) =>
          review.get(r.id).semanticCorrect &&
          (!r.functional || r.functional.pass),
      ),
      group.length,
    ),
    explicitUnsupportedCapability: percent(
      count(attempts, (r) => r.explicitCapabilityDenial),
      attempts.length,
    ),
    runtimeFailure: percent(
      count(attempts, (c) => c.status === "runtime-error") +
        count(interactive, (r) => r.functional.reason?.includes("RUNTIME")),
      attempts.length,
    ),
    b06TextOnly: percent(
      count(
        group,
        (r) => r.task === "B06" && r.checks.at(-1).status === "text",
      ),
      count(group, (r) => r.task === "B06"),
    ),
    presentationIssues: count(reviewRows, (r) => r.presentationIssue),
    classifications,
    allUsage: usage(attempts),
    repairUsage: usage(repairs),
  };
}
const result = {
  overall: await summarize(rows),
  byVariantAndProtocol: {},
  byTask: {},
};
for (const h of ["H0", "H1", "H2"])
  for (const p of ["oui", "json"])
    result.byVariantAndProtocol[h + "-" + p] = await summarize(
      rows.filter((r) => r.variant === h && r.protocol === p),
    );
for (const task of new Set(rows.map((r) => r.task)))
  result.byTask[task] = await summarize(rows.filter((r) => r.task === task));
await writeFile(
  join(out, "summary.json"),
  JSON.stringify(result, null, 2) + "\n",
);
console.log(result.overall);
