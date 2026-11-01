import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

const WEAK_TOKENS = new Set([
  "",
  "dev-local-token-change-me",
  "changeme",
  "secret",
  "token",
]);

export function isWeakToken(token: string): boolean {
  return WEAK_TOKENS.has(token) || token.length < 24;
}

export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Constant-time string compare (hashes first so lengths can differ safely). */
export function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function assertBindSafe(host: string, token: string) {
  const exposed = host === "0.0.0.0" || host === "::" || host === "[::]";
  if (exposed && isWeakToken(token)) {
    throw new Error(
      `Refusing to bind ${host} with a weak GROK_WORLD_TOKEN. Set a strong token in .env (24+ chars).`
    );
  }
  if (isWeakToken(token)) {
    console.warn(
      "[grok-world] WARNING: GROK_WORLD_TOKEN is weak/default. Run scripts/ensure-secrets.ps1 or set a long random token before exposing the bridge."
    );
  }
}

export function localCorsOrigin(origin: string | undefined, allowed: string[]): boolean {
  if (!origin) return true; // same-origin / curl / Grok server-side
  if (allowed.includes(origin)) return true;
  try {
    const u = new URL(origin);
    return u.hostname === "127.0.0.1" || u.hostname === "localhost";
  } catch {
    return false;
  }
}
