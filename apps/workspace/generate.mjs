import { prompt } from "../genui-lab/generation/v2/plan.mjs";
import { request } from "../genui-lab/generation/v2/provider.mjs";
import { compile } from "./domain.mjs";

const arm = {
  model: "gpt-6.2-sol",
  wire: "structured",
  tokens: 2048,
  examples: true,
  ground: true,
};
export async function generate(w, conversation, instruction, provider = live) {
  if (
    typeof instruction !== "string" ||
    !instruction.trim() ||
    Buffer.byteLength(instruction) > 16000
  )
    throw Error("Enter a request within 16000 bytes");
  const context = compile(w, conversation);
  const system = prompt(arm, "oui", "B03")[0];
  const messages = [
    system,
    { role: "user", content: JSON.stringify({ context }) },
    { role: "user", content: instruction },
  ];
  const result = await provider(messages);
  return {
    id: crypto.randomUUID(),
    model: arm.model,
    context,
    messages,
    ...result,
  };
}
async function live(messages) {
  const credential = process.env.OPENAI_API_KEY || process.env.OPENAI_TOKEN;
  if (!credential)
    throw Error("Set OPENAI_API_KEY in the local backend environment");
  const { raw, status, diagnostic, latencyMs, usage } = await request(
    arm,
    messages,
    1701,
    credential,
    new AbortController().signal,
  );
  return { raw, status, diagnostic, latencyMs, usage };
}
