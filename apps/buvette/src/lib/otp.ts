/**
 * Le code envoyé par courriel : 6 chiffres, 10 minutes, 5 essais. Seule son empreinte est
 * gardée. Ouverte à toute adresse, la page d'envoi est bornée par Turnstile et par `isLimited`.
 */
const OTP_TTL_SECONDS = 600;
const OTP_MAX_ATTEMPTS = 5;

interface Kv {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

interface OtpRecord {
  hash: string;
  attempts: number;
}

const otpKey = (email: string) => `otp-buvette:${email}`;

async function hash(code: string, email: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${email}:${code}`));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function generateCode(): string {
  return (crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).toString().padStart(6, '0');
}

export async function storeCode(kv: Kv, email: string, code: string): Promise<void> {
  const record: OtpRecord = { hash: await hash(code, email), attempts: 0 };
  await kv.put(otpKey(email), JSON.stringify(record), { expirationTtl: OTP_TTL_SECONDS });
}

export type CodeCheck = 'ok' | 'expired' | 'invalid' | 'locked';

export async function checkCode(kv: Kv, email: string, code: string): Promise<CodeCheck> {
  const stored = await kv.get(otpKey(email));
  if (!stored) return 'expired';
  const record = JSON.parse(stored) as OtpRecord;
  if ((await hash(code, email)) === record.hash) {
    await kv.delete(otpKey(email));
    return 'ok';
  }
  record.attempts += 1;
  if (record.attempts >= OTP_MAX_ATTEMPTS) {
    await kv.delete(otpKey(email));
    return 'locked';
  }
  await kv.put(otpKey(email), JSON.stringify(record), { expirationTtl: OTP_TTL_SECONDS });
  return 'invalid';
}

/** Compteur à fenêtre fixe. KV n'est pas atomique : une borne de confort, pas une garantie. */
export async function isLimited(kv: Kv, key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const count = Number((await kv.get(key)) ?? 0);
  if (count >= limit) return true;
  await kv.put(key, String(count + 1), { expirationTtl: Math.max(60, windowSeconds) });
  return false;
}

export async function verifyTurnstile(secret: string | undefined, token: string, ip: string): Promise<boolean> {
  if (!secret || !token) return false;
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: new URLSearchParams({ secret, response: token, remoteip: ip })
  });
  const payload = (await res.json().catch(() => null)) as { success?: boolean } | null;
  return payload?.success === true;
}
