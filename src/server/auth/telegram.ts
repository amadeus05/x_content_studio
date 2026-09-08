/**
 * Telegram Login Widget verification + signed session cookies.
 * @see https://core.telegram.org/widgets/login#checking-authorization
 */

export type TelegramAuthPayload = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
  /** Telegram may add more fields (e.g. allows_write_to_pm) — all must enter the check-string. */
  [key: string]: unknown;
};

export type SessionUser = {
  id: number;
  username?: string;
  firstName?: string;
  photoUrl?: string;
  via: "telegram" | "pin";
};

const SESSION_COOKIE = "xm_session";
const SESSION_DAYS = 30;

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

async function hmacSha256Hex(key: ArrayBuffer, data: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256(data: string): Promise<ArrayBuffer> {
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
}

export async function verifyTelegramLogin(
  payload: TelegramAuthPayload,
  botToken: string
): Promise<{ ok: true; user: SessionUser } | { ok: false; error: string }> {
  const hash = payload.hash;
  if (!hash || payload.id == null || !payload.auth_date) {
    return { ok: false, error: "Неполные данные Telegram" };
  }

  const ageSec = Math.floor(Date.now() / 1000) - Number(payload.auth_date);
  if (ageSec > 86400) {
    return { ok: false, error: "Данные входа устарели, попробуйте ещё раз" };
  }

  // По доке Telegram: все полученные поля кроме hash, по алфавиту.
  // Важно: при data-request-access=write приходит allows_write_to_pm — его нельзя выкидывать.
  const checkString = Object.keys(payload)
    .filter((k) => k !== "hash")
    .sort()
    .map((k) => `${k}=${payload[k]}`)
    .join("\n");

  const secretKey = await sha256(botToken.trim());
  const computed = await hmacSha256Hex(secretKey, checkString);
  if (!timingSafeEqual(computed, String(hash).toLowerCase())) {
    return { ok: false, error: "Неверная подпись Telegram" };
  }

  return {
    ok: true,
    user: {
      id: Number(payload.id),
      username: typeof payload.username === "string" ? payload.username : undefined,
      firstName: typeof payload.first_name === "string" ? payload.first_name : undefined,
      photoUrl: typeof payload.photo_url === "string" ? payload.photo_url : undefined,
      via: "telegram"
    }
  };
}

function b64urlFromStr(str: string): string {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(str: string): string {
  const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return atob(b64);
}

export async function createSessionToken(user: SessionUser, secret: string): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + SESSION_DAYS * 86400;
  const body = b64urlFromStr(JSON.stringify({ ...user, exp }));
  const key = await sha256(secret);
  const sig = await hmacSha256Hex(key, body);
  return `${body}.${sig}`;
}

export async function verifySessionToken(
  token: string,
  secret: string
): Promise<SessionUser | null> {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const key = await sha256(secret);
  const expected = await hmacSha256Hex(key, body);
  if (!timingSafeEqual(expected, sig.toLowerCase())) return null;
  try {
    const data = JSON.parse(fromB64url(body)) as SessionUser & { exp: number };
    if (!data.exp || data.exp < Math.floor(Date.now() / 1000)) return null;
    if (typeof data.id !== "number") return null;
    return {
      id: data.id,
      username: data.username,
      firstName: data.firstName,
      photoUrl: data.photoUrl,
      via: data.via || "telegram"
    };
  } catch {
    return null;
  }
}

export function parseAllowedIds(raw?: string): number[] | null {
  if (!raw || !raw.trim()) return null;
  const ids = raw
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n));
  return ids.length ? ids : null;
}

export function sessionCookieHeader(token: string, secure: boolean): string {
  const parts = [
    `${SESSION_COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${SESSION_DAYS * 86400}`
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function clearSessionCookieHeader(secure: boolean): string {
  const parts = [`${SESSION_COOKIE}=`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0"];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function readSessionCookie(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/(?:^|;\s*)xm_session=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export { SESSION_COOKIE };
