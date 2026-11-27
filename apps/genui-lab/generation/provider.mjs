// Trusted Node process only. The browser has no generation route.
export const endpoint = "http://127.0.0.1:4193";
export const settings = {
  model: "qwen2a",
  max_tokens: 768,
  temperature: 0.35,
  top_p: 0.9,
  stream: false,
};
export const cloudSettings = {
  ...settings,
  model: "gpt-4.1-mini-2025-04-14",
  store: false,
};
export async function generate(messages, seed, key, signal, cloud = false) {
  const started = performance.now();
  const response = await fetch(
    (cloud ? "https://api.openai.com" : endpoint) + "/v1/chat/completions",
    {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.any([signal, AbortSignal.timeout(180000)]),
      headers: {
        Authorization: "Bearer " + key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...(cloud ? cloudSettings : settings),
        seed,
        messages,
      }),
    },
  );
  if (!response.ok) {
    await response.body?.cancel();
    throw Error("Provider HTTP " + response.status);
  }
  const reader = response.body.getReader(),
    chunks = [];
  let length = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      length += part.value.length;
      if (length > 65536) throw Error("Provider response exceeds 65536 bytes");
      chunks.push(part.value);
    }
  } finally {
    await reader.cancel();
  }
  const body = JSON.parse(Buffer.concat(chunks).toString("utf8")),
    choice = body.choices?.[0];
  if (typeof choice?.message?.content !== "string")
    throw Error("Provider response has no message content");
  return {
    raw: choice.message.content,
    finish: choice.finish_reason,
    usage: body.usage,
    latencyMs: Math.round(performance.now() - started),
    model: body.model,
  };
}
