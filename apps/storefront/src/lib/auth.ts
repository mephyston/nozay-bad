import { SignJWT, jwtVerify } from 'jose';

/**
 * Auth passwordless du storefront (OTP email).
 *
 * - Session : cookie JWT signé (stateless) → aucune lecture KV par requête (free plan).
 * - OTP : code 6 chiffres, stocké haché dans KV (`otp:<email>`) avec TTL court + compteur
 *   de tentatives. Réutilise l'idiome KV de `turnstile.ts` (put/get + dégradation in-memory).
 */

export const SESSION_COOKIE = 'nba_session';
// Cookie temporaire liant l'étape « saisie du code » à l'email résolu, côté serveur
// (le client ne connaît jamais l'email réel, seulement une version masquée).
export const PENDING_COOKIE = 'nba_otp';
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 jours
export const OTP_TTL_SECONDS = 600; // 10 minutes
export const OTP_MAX_ATTEMPTS = 5;

// Secret de signature des cookies. Fail-closed en production ; repli dev pour le local.
export function resolveSessionSecret(env: { SESSION_SECRET?: string }, isDev: boolean): string {
  return env.SESSION_SECRET || (isDev ? 'dev-session-secret-do-not-use-in-prod' : '');
}

export interface SessionMember {
  id: number;
  firstName: string;
  lastName: string;
  licence: string;
  paid: boolean;
  expenseAuthorized: boolean;
}

export interface SessionPayload {
  email: string;
  members: SessionMember[];
  activeMemberId: number;
}

interface OtpRecord {
  hash: string;
  members: SessionMember[];
  attempts: number;
}

// --- Session (JWT signé) -----------------------------------------------------

function secretKey(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload, secret: string): Promise<string> {
  return new SignJWT({
    email: payload.email,
    members: payload.members,
    activeMemberId: payload.activeMemberId
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secretKey(secret));
}

export async function verifySession(token: string, secret: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(secret));
    const members = Array.isArray(payload.members) ? (payload.members as SessionMember[]) : [];
    const email = typeof payload.email === 'string' ? payload.email : '';
    const activeMemberId = typeof payload.activeMemberId === 'number' ? payload.activeMemberId : members[0]?.id;
    if (!email || members.length === 0 || activeMemberId === undefined) return null;
    return { email, members, activeMemberId };
  } catch {
    return null;
  }
}

// Cookie temporaire (10 min) portant l'email résolu pour l'étape de vérification du code.
export async function signPending(email: string, secret: string): Promise<string> {
  return new SignJWT({ email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${OTP_TTL_SECONDS}s`)
    .sign(secretKey(secret));
}

export async function verifyPending(token: string, secret: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(secret));
    return typeof payload.email === 'string' ? payload.email : null;
  } catch {
    return null;
  }
}

// --- Cookies -----------------------------------------------------------------

function buildCookie(name: string, value: string, maxAge: number, secure: boolean): string {
  const parts = [`${name}=${value}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${maxAge}`];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

function readCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? match[1] : null;
}

export function buildSessionCookie(token: string, secure = true): string {
  return buildCookie(SESSION_COOKIE, token, SESSION_TTL_SECONDS, secure);
}

export function buildLogoutCookie(secure = true): string {
  return buildCookie(SESSION_COOKIE, '', 0, secure);
}

export function readSessionCookie(cookieHeader: string | null): string | null {
  return readCookie(cookieHeader, SESSION_COOKIE);
}

export function buildPendingCookie(token: string, secure = true): string {
  return buildCookie(PENDING_COOKIE, token, OTP_TTL_SECONDS, secure);
}

export function buildPendingClearCookie(secure = true): string {
  return buildCookie(PENDING_COOKIE, '', 0, secure);
}

export function readPendingCookie(cookieHeader: string | null): string | null {
  return readCookie(cookieHeader, PENDING_COOKIE);
}

// --- OTP ---------------------------------------------------------------------

export function generateOtpCode(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return n.toString().padStart(6, '0');
}

export async function hashOtp(code: string, email: string): Promise<string> {
  const data = new TextEncoder().encode(`${email}:${code}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function otpKey(email: string): string {
  return `otp:${email.toLowerCase()}`;
}

export async function storeOtp(kv: any, email: string, code: string, members: SessionMember[]): Promise<void> {
  const record: OtpRecord = { hash: await hashOtp(code, email), members, attempts: 0 };
  if (kv && typeof kv.put === 'function') {
    await kv.put(otpKey(email), JSON.stringify(record), { expirationTtl: OTP_TTL_SECONDS });
    return;
  }
  memoryOtpStore().set(otpKey(email), { record, expiresAt: Date.now() + OTP_TTL_SECONDS * 1000 });
}

export interface OtpVerifyResult {
  ok: boolean;
  members?: SessionMember[];
  error?: 'expired' | 'invalid' | 'locked';
}

export async function verifyOtp(kv: any, email: string, code: string): Promise<OtpVerifyResult> {
  const key = otpKey(email);
  const record = await readOtp(kv, key);
  if (!record) return { ok: false, error: 'expired' };

  if (record.attempts >= OTP_MAX_ATTEMPTS) {
    await deleteOtp(kv, key);
    return { ok: false, error: 'locked' };
  }

  const candidate = await hashOtp(code, email);
  if (candidate === record.hash) {
    await deleteOtp(kv, key);
    return { ok: true, members: record.members };
  }

  record.attempts += 1;
  if (record.attempts >= OTP_MAX_ATTEMPTS) {
    await deleteOtp(kv, key);
    return { ok: false, error: 'locked' };
  }
  await writeOtp(kv, key, record);
  return { ok: false, error: 'invalid' };
}

// --- Stockage OTP (KV + repli mémoire, comme turnstile.ts) -------------------

function memoryOtpStore(): Map<string, { record: OtpRecord; expiresAt: number }> {
  const g = globalThis as any;
  if (!g.__otpStore) g.__otpStore = new Map();
  return g.__otpStore;
}

async function readOtp(kv: any, key: string): Promise<OtpRecord | null> {
  if (kv && typeof kv.get === 'function') {
    try {
      const stored = await kv.get(key, { type: 'json' });
      return (stored as OtpRecord) || null;
    } catch (err) {
      console.error('[auth] KV OTP read failed, degrading to memory:', err);
    }
  }
  const mem = memoryOtpStore().get(key);
  if (!mem || mem.expiresAt < Date.now()) return null;
  return mem.record;
}

async function writeOtp(kv: any, key: string, record: OtpRecord): Promise<void> {
  if (kv && typeof kv.put === 'function') {
    try {
      await kv.put(key, JSON.stringify(record), { expirationTtl: OTP_TTL_SECONDS });
      return;
    } catch (err) {
      console.error('[auth] KV OTP write failed, degrading to memory:', err);
    }
  }
  memoryOtpStore().set(key, { record, expiresAt: Date.now() + OTP_TTL_SECONDS * 1000 });
}

async function deleteOtp(kv: any, key: string): Promise<void> {
  if (kv && typeof kv.delete === 'function') {
    try {
      await kv.delete(key);
    } catch (err) {
      console.error('[auth] KV OTP delete failed:', err);
    }
  }
  memoryOtpStore().delete(key);
}

// --- Utilitaires -------------------------------------------------------------

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  const head = local.slice(0, 1);
  const tld = domain.includes('.') ? domain.slice(domain.lastIndexOf('.')) : '';
  return `${head}***@***${tld}`;
}
