// @vitest-environment node
// jose (WebCrypto) a un problème inter-realm de `instanceof Uint8Array` sous jsdom.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signPending, storeOtp, buildPendingCookie } from '../../../lib/auth';

const SECRET = 'test-secret-key-abcdefghijklmnop';

// Environnement piloté par les tests : `{}` simule un SESSION_SECRET absent.
const envRef: { value: Record<string, unknown> } = { value: { SESSION_SECRET: SECRET } };
const verifyRateLimited = { value: false };
const isRateLimited = vi.fn(async (key: string) => key.startsWith('otp-verify:') && verifyRateLimited.value);

vi.mock('../../../lib/turnstile', () => ({
  rateLimiter: { isRateLimited: (key: string) => isRateLimited(key) }
}));

// Évite d'avoir à résoudre le module virtuel `cloudflare:workers` dans les tests.
vi.mock('../../../lib/request-context', () => ({
  resolveEnv: () => envRef.value,
  clientIp: () => '1.2.3.4',
  json: (data: any, status = 200, extraHeaders?: Record<string, string>) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json', ...(extraHeaders || {}) }
    }),
  IS_DEV: false,
  COOKIE_SECURE: true
}));

const { POST } = await import('./verify-code');

async function verifyCode(code: string, cookie?: string) {
  const request = new Request('http://localhost/api/auth/verify-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: JSON.stringify({ code })
  });
  const res = await (POST as any)({ request, locals: {} });
  return { status: res.status, body: await res.clone().json(), res };
}

const MEMBERS = [
  { id: 7, firstName: 'Ada', lastName: 'Lovelace', licence: '12345678', paid: true, expenseAuthorized: false }
];

beforeEach(() => {
  envRef.value = { SESSION_SECRET: SECRET };
  verifyRateLimited.value = false;
  // Sans binding KV, l'OTP vit dans le store mémoire global : on le vide entre tests.
  (globalThis as any).__otpStore?.clear();
});

describe('POST /api/auth/verify-code', () => {
  it('pose la session quand le code correspond (cas nominal)', async () => {
    await storeOtp(undefined, 'ada@ex.fr', '123456', MEMBERS, '25-26');
    const cookie = buildPendingCookie(await signPending('ada@ex.fr', SECRET));

    const { status, body, res } = await verifyCode('123456', cookie);

    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.activeMemberId).toBe(7);
    expect(res.headers.get('Set-Cookie')).toContain('nba_session=');
  });

  it("répond 429 quand l'IP dépasse le rate-limit, avant toute vérification", async () => {
    verifyRateLimited.value = true;
    const { status } = await verifyCode('123456');
    expect(status).toBe(429);
  });

  it('échoue fermé (500) si SESSION_SECRET manque, sans rien signer', async () => {
    // Sans ce contrôle, la route vérifiait le cookie et signait la session avec une
    // clé vide — le middleware refusait ensuite, mais le fail-closed doit être
    // uniforme sur tout ce qui signe.
    envRef.value = {};
    const { status, res } = await verifyCode('123456');
    expect(status).toBe(500);
    expect(res.headers.get('Set-Cookie')).toBeNull();
  });

  it('refuse un code erroné puis verrouille après 5 tentatives', async () => {
    await storeOtp(undefined, 'ada@ex.fr', '123456', MEMBERS, '25-26');
    const cookie = buildPendingCookie(await signPending('ada@ex.fr', SECRET));

    for (let i = 0; i < 4; i++) {
      const { status, body } = await verifyCode('000000', cookie);
      expect(status).toBe(400);
      expect(body.error).toContain('incorrect');
    }
    const { status } = await verifyCode('000000', cookie);
    expect(status).toBe(429);
    // Le bon code ne passe plus : l'enregistrement a été détruit au verrouillage.
    const after = await verifyCode('123456', cookie);
    expect(after.status).toBe(400);
  });
});
