// crypto.randomUUID() only exists in secure contexts (HTTPS, or localhost). Reminders opened over
// a plain-HTTP LAN address (common during local device testing) need a fallback that still works.
export function uuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  return fallback();
}

function fallback(): string {
  // Last-resort for environments without any Web Crypto API (no randomUUID, no getRandomValues).
  // Produce a real v4-shape UUID so keys are always valid identifiers.
  const hex = "0123456789abcdef";
  let out = "";
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      out += "-";
    } else if (i === 14) {
      out += "4"; // version 4
    } else if (i === 19) {
      out += "89ab"[Math.floor(Math.random() * 4)]; // variant bits
    } else {
      out += hex[Math.floor(Math.random() * 16)];
    }
  }
  return out;
}
