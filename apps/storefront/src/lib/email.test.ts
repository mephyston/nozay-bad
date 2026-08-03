// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sendOtpEmail } from './email';

const KEY = 're_test_key';

describe('sendOtpEmail — garde-fou anti-envoi', () => {
  let fetchMock: any;

  beforeEach(() => {
    fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('n’envoie RIEN sans clé API (dry-run)', async () => {
    const res = await sendOtpEmail({}, 'adherent@reel.fr', '123456');
    expect(res.ok).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('n’envoie RIEN en mode dry-run même avec une clé', async () => {
    const res = await sendOtpEmail({ RESEND_API_KEY: KEY, EMAIL_MODE: 'dry-run' }, 'adherent@reel.fr', '123456');
    expect(res.ok).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('n’envoie RIEN pour une valeur de mode inconnue (fail-closed)', async () => {
    const res = await sendOtpEmail({ RESEND_API_KEY: KEY, EMAIL_MODE: 'staging' }, 'adherent@reel.fr', '123456');
    expect(res.ok).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('mode allowlist : ignore un destinataire hors liste', async () => {
    const res = await sendOtpEmail(
      { RESEND_API_KEY: KEY, EMAIL_MODE: 'allowlist', EMAIL_ALLOWLIST: 'moi@test.fr' },
      'adherent@reel.fr',
      '123456'
    );
    expect(res.ok).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('mode allowlist : envoie à un destinataire autorisé (insensible à la casse)', async () => {
    await sendOtpEmail(
      { RESEND_API_KEY: KEY, EMAIL_MODE: 'allowlist', EMAIL_ALLOWLIST: 'Moi@Test.fr, autre@test.fr' },
      'moi@test.fr',
      '123456'
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse((fetchMock.mock.calls[0][1] as any).body);
    expect(body.to).toEqual(['moi@test.fr']);
  });

  it('mode redirect : envoie vers la boîte de test, jamais à l’adhérent', async () => {
    await sendOtpEmail(
      { RESEND_API_KEY: KEY, EMAIL_MODE: 'redirect', EMAIL_TEST_INBOX: 'test@boite.fr' },
      'adherent@reel.fr',
      '123456'
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse((fetchMock.mock.calls[0][1] as any).body);
    expect(body.to).toEqual(['test@boite.fr']);
  });

  it('mode redirect sans boîte de test : n’envoie rien', async () => {
    const res = await sendOtpEmail({ RESEND_API_KEY: KEY, EMAIL_MODE: 'redirect' }, 'adherent@reel.fr', '123456');
    expect(res.ok).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('mode live : envoie au destinataire réel', async () => {
    await sendOtpEmail({ RESEND_API_KEY: KEY, EMAIL_MODE: 'live' }, 'adherent@reel.fr', '123456');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse((fetchMock.mock.calls[0][1] as any).body);
    expect(body.to).toEqual(['adherent@reel.fr']);
  });
});
