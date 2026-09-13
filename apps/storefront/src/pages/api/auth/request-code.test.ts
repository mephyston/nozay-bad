// @vitest-environment node
// jose (WebCrypto) a un problème inter-realm de `instanceof Uint8Array` sous jsdom.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const SECRET = 'test-secret-key-abcdefghijklmnop';

const apiFetch = vi.fn();
const sendOtpEmail = vi.fn(async () => ({ ok: true }));
const sendRenewalEmail = vi.fn(async () => ({ ok: true }));
const sendUpcomingAccessEmail = vi.fn(async () => ({ ok: true }));
const sendPaymentPendingEmail = vi.fn(async () => ({ ok: true }));
// Le limiteur est interrogé sur deux clés : `otp-ip:` (avant toute recherche) et
// `otp-mail:`. Les tests ne veulent piloter que la seconde.
const mailRateLimited = { value: false };
const isRateLimited = vi.fn(async (key: string) => key.startsWith('otp-mail:') && mailRateLimited.value);

vi.mock('@nba/api-client', () => ({
  createApiClient: () => ({ fetch: apiFetch })
}));

vi.mock('../../../lib/turnstile', () => ({
  verifyTurnstileToken: async () => ({ success: true }),
  rateLimiter: { isRateLimited: (key: string) => isRateLimited(key) }
}));

vi.mock('../../../lib/email', () => ({
  sendOtpEmail: (...a: any[]) => sendOtpEmail(...(a as [])),
  sendRenewalEmail: (...a: any[]) => sendRenewalEmail(...(a as [])),
  sendUpcomingAccessEmail: (...a: any[]) => sendUpcomingAccessEmail(...(a as [])),
  sendPaymentPendingEmail: (...a: any[]) => sendPaymentPendingEmail(...(a as [])),
  clubMailIdentity: () => ({ name: 'Club', senderName: 'Club', contactEmail: '', membershipUrl: '', signature: '' })
}));

// Évite d'avoir à résoudre le module virtuel `cloudflare:workers` dans les tests.
vi.mock('../../../lib/request-context', () => ({
  resolveEnv: () => ({ SESSION_SECRET: SECRET }),
  clientIp: () => '1.2.3.4',
  json: (data: any, status = 200, extraHeaders?: Record<string, string>) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json', ...(extraHeaders || {}) }
    }),
  IS_DEV: false,
  COOKIE_SECURE: true
}));

const { POST } = await import('./request-code');

/** Fait répondre le lookup de l'API comme pour un adhérent dans la situation voulue. */
function lookupReturns(data: any) {
  apiFetch.mockResolvedValue(new Response(JSON.stringify({ success: true, data }), { status: 200 }));
}

async function requestCode(identifier = 'qui@ex.fr') {
  const request = new Request('http://localhost/api/auth/request-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, turnstileToken: 'jeton' })
  });
  const res = await (POST as any)({ request, locals: {} });
  return {
    status: res.status,
    body: await res.clone().json(),
    // On ne compare pas la valeur du cookie (aléatoire par construction), mais son nom et
    // ses attributs — c'est ce qu'un attaquant peut observer.
    cookieShape: (res.headers.get('Set-Cookie') || '').replace(/=[^;]+;/, '=<jeton>;')
  };
}

const GRANTED = {
  accountEmail: 'qui@ex.fr',
  members: [{ id: 1, firstName: 'Léa', lastName: 'Martin', licence: '1000001', paid: true, expenseAuthorized: false }],
  status: 'granted',
  seasonCode: '25-26',
  seasonName: 'Saison 25-26',
  accessOpensOn: null
};
const LAPSED = { accountEmail: 'qui@ex.fr', members: [], status: 'lapsed', seasonCode: '25-26', seasonName: 'Saison 25-26', accessOpensOn: null };
const UPCOMING = { accountEmail: 'qui@ex.fr', members: [], status: 'upcoming', seasonCode: '25-26', seasonName: 'Saison 26-27', accessOpensOn: '2026-09-01' };
const UNPAID = { accountEmail: 'qui@ex.fr', members: [], status: 'unpaid', seasonCode: '25-26', seasonName: 'Saison 25-26', accessOpensOn: null };
const UNKNOWN = { accountEmail: 'qui@ex.fr', members: [], status: 'unknown', seasonCode: '25-26', seasonName: 'Saison 25-26', accessOpensOn: null };

describe('request-code — indiscernabilité des refus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mailRateLimited.value = false;
  });

  it('licence périmée, inscription anticipée et inconnu rendent une réponse IDENTIQUE', async () => {
    lookupReturns(LAPSED);
    const lapsed = await requestCode();
    lookupReturns(UPCOMING);
    const upcoming = await requestCode();
    lookupReturns(UNKNOWN);
    const unknown = await requestCode();

    // Statut, corps et forme du cookie : rien ne doit trahir qui est au fichier du club.
    expect(lapsed).toEqual(unknown);
    expect(upcoming).toEqual(unknown);
    expect(unknown.status).toBe(200);
    expect(unknown.body).toEqual({ ok: true });
    expect(unknown.cookieShape).toContain('nba_otp=');
  });

  it('reste indiscernable même sous rate-limit — un 429 dirait « cette adresse existe »', async () => {
    mailRateLimited.value = true;

    lookupReturns(LAPSED);
    const lapsed = await requestCode();
    lookupReturns(UNKNOWN);
    const unknown = await requestCode();

    expect(lapsed).toEqual(unknown);
    expect(lapsed.status).toBe(200);
    // La boîte est protégée : rate-limité, on n'écrit à personne.
    expect(sendRenewalEmail).not.toHaveBeenCalled();
  });
});

describe('request-code — aiguillage des emails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mailRateLimited.value = false;
  });

  it('licence en cours → code OTP, et rien d’autre', async () => {
    lookupReturns(GRANTED);
    const res = await requestCode();
    expect(res.status).toBe(200);
    expect(sendOtpEmail).toHaveBeenCalledTimes(1);
    expect(sendRenewalEmail).not.toHaveBeenCalled();
    expect(sendUpcomingAccessEmail).not.toHaveBeenCalled();
  });

  it('licence non renouvelée → invitation à réadhérer, jamais de code', async () => {
    lookupReturns(LAPSED);
    await requestCode();
    expect(sendRenewalEmail).toHaveBeenCalledWith(expect.anything(), expect.anything(), 'qui@ex.fr', 'Saison 25-26');
    expect(sendOtpEmail).not.toHaveBeenCalled();
  });

  it('inscription anticipée → date d’ouverture, jamais de code', async () => {
    lookupReturns(UPCOMING);
    await requestCode();
    expect(sendUpcomingAccessEmail).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      'qui@ex.fr',
      'Saison 26-27',
      '2026-09-01'
    );
    expect(sendOtpEmail).not.toHaveBeenCalled();
  });

  it('licence sans aucun règlement → email d’attente, jamais de code, réponse identique à l’inconnu', async () => {
    lookupReturns(UNPAID);
    const unpaid = await requestCode();
    lookupReturns(UNKNOWN);
    const unknown = await requestCode();
    expect(unpaid).toEqual(unknown);
    expect(sendPaymentPendingEmail).toHaveBeenCalledWith(expect.anything(), expect.anything(), 'qui@ex.fr', 'Saison 25-26');
    expect(sendOtpEmail).not.toHaveBeenCalled();
  });

  it('inconnu → aucun email du tout', async () => {
    lookupReturns(UNKNOWN);
    await requestCode();
    expect(sendOtpEmail).not.toHaveBeenCalled();
    expect(sendRenewalEmail).not.toHaveBeenCalled();
    expect(sendUpcomingAccessEmail).not.toHaveBeenCalled();
    expect(sendPaymentPendingEmail).not.toHaveBeenCalled();
  });
});
