// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sendOtpEmail, sendRenewalEmail, sendUpcomingAccessEmail, FFBAD_MEMBERSHIP_URL } from './email';

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

// Les emails d'adhésion passent par le même `deliver()` que l'OTP : ces tests vérifient
// qu'ils n'ont pas réimplémenté les règles d'envoi dans leur coin.
describe('emails d’adhésion — mêmes garde-fous que l’OTP', () => {
  let fetchMock: any;

  beforeEach(() => {
    fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('sendRenewalEmail n’envoie RIEN sans clé API (dry-run)', async () => {
    const res = await sendRenewalEmail({}, 'ancien@reel.fr', 'Saison 26-27');
    expect(res.ok).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sendRenewalEmail n’envoie RIEN pour un mode inconnu (fail-closed)', async () => {
    await sendRenewalEmail({ RESEND_API_KEY: KEY, EMAIL_MODE: 'staging' }, 'ancien@reel.fr', 'Saison 26-27');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sendRenewalEmail redirige vers la boîte de test, jamais à l’ex-adhérent', async () => {
    await sendRenewalEmail(
      { RESEND_API_KEY: KEY, EMAIL_MODE: 'redirect', EMAIL_TEST_INBOX: 'test@boite.fr' },
      'ancien@reel.fr',
      'Saison 26-27'
    );
    const body = JSON.parse((fetchMock.mock.calls[0][1] as any).body);
    expect(body.to).toEqual(['test@boite.fr']);
  });

  it('sendRenewalEmail porte le lien de réadhésion FFBad', async () => {
    await sendRenewalEmail({ RESEND_API_KEY: KEY, EMAIL_MODE: 'live' }, 'ancien@reel.fr', 'Saison 26-27');
    const body = JSON.parse((fetchMock.mock.calls[0][1] as any).body);
    expect(body.html).toContain(FFBAD_MEMBERSHIP_URL);
    expect(body.text).toContain(FFBAD_MEMBERSHIP_URL);
    expect(body.subject).toContain('Saison 26-27');
  });

  it('sendUpcomingAccessEmail n’envoie RIEN sans clé API (dry-run)', async () => {
    const res = await sendUpcomingAccessEmail({}, 'nouveau@reel.fr', 'Saison 26-27', '2026-09-01');
    expect(res.ok).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sendUpcomingAccessEmail annonce la date d’ouverture en clair', async () => {
    await sendUpcomingAccessEmail(
      { RESEND_API_KEY: KEY, EMAIL_MODE: 'live' },
      'nouveau@reel.fr',
      'Saison 26-27',
      '2026-09-01'
    );
    const body = JSON.parse((fetchMock.mock.calls[0][1] as any).body);
    expect(body.subject).toContain('1er septembre 2026');
    expect(body.html).toContain('1er septembre 2026');
    // Rien à faire de sa part : surtout pas de lien d'adhésion, il a déjà payé.
    expect(body.html).not.toContain(FFBAD_MEMBERSHIP_URL);
  });
});
