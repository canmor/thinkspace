// Run only in the credential-free, permission-restricted validation process.
globalThis.self = {
  name: "baseline",
  postMessage(result) {
    process.stdout.write(JSON.stringify(result));
  },
};
require(process.argv[2]);
(async () => {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const { source, state } = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  self.onmessage({ data: { kind: "open", protocol: "oui", source, state } });
})().catch(() => {
  process.exitCode = 1;
});
