import { bytes, check, limits } from "./policy";
// Called on both sides of structured clone. Never send an over-budget message.
export function validateTransfer(message: object) {
  if ("kind" in message && message.kind === "open") {
    const source = (message as { source?: unknown }).source;
    check(
      typeof source === "string" &&
        source.length <= limits.sourceBytes &&
        bytes(source) <= limits.sourceBytes,
      "Source byte budget",
    );
  }
  const encoded = JSON.stringify(message);
  check(
    encoded.length <= limits.envelopeBytes &&
      bytes(encoded) <= limits.envelopeBytes,
    "Worker envelope byte budget",
  );
}
