// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sendOtpEmail, sendRenewalEmail, sendUpcomingAccessEmail, sendPaymentPendingEmail, type ClubMailIdentity } from './email';

/** Le club de test, tel que `clubMailIdentity` le composerait depuis la configuration. */
const CLUB: ClubMailIdentity = {
  name: 'Nozay Badminton',
  senderName: 'Nozay Badminton Association',
  contactEmail: 'tresorier@nozaybad.fr',
  membershipUrl: 'https://www.myffbad.fr/adherer/NBA91',
  signature: 'Nozay Badminton Association'
};
const FFBAD_MEMBERSHIP_URL = CLUB.membershipUrl;

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
    const res = await sendOtpEmail({}, CLUB, 'adherent@reel.fr', '123456');
    expect(res.ok).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('n’envoie RIEN en mode dry-run même avec une clé', async () => {
    const res = await sendOtpEmail({ RESEND_API_KEY: KEY, EMAIL_MODE: 'dry-run' }, CLUB, 'adherent@reel.fr', '123456');
    expect(res.ok).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('n’envoie RIEN pour une valeur de mode inconnue (fail-closed)', async () => {
    const res = await sendOtpEmail({ RESEND_API_KEY: KEY, EMAIL_MODE: 'staging' }, CLUB, 'adherent@reel.fr', '123456');
    expect(res.ok).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('mode allowlist : ignore un destinataire hors liste', async () => {
    const res = await sendOtpEmail({ RESEND_API_KEY: KEY, EMAIL_MODE: 'allowlist', EMAIL_ALLOWLIST: 'moi@test.fr' }, CLUB,
      'adherent@reel.fr',
      '123456'
    );
    expect(res.ok).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('mode allowlist : envoie à un destinataire autorisé (insensible à la casse)', async () => {
    await sendOtpEmail({ RESEND_API_KEY: KEY, EMAIL_MODE: 'allowlist', EMAIL_ALLOWLIST: 'Moi@Test.fr, autre@test.fr' }, CLUB,
      'moi@test.fr',
      '123456'
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse((fetchMock.mock.calls[0][1] as any).body);
    expect(body.to).toEqual(['moi@test.fr']);
  });

  it('mode redirect : envoie vers la boîte de test, jamais à l’adhérent', async () => {
    await sendOtpEmail({ RESEND_API_KEY: KEY, EMAIL_MODE: 'redirect', EMAIL_TEST_INBOX: 'test@boite.fr' }, CLUB,
      'adherent@reel.fr',
      '123456'
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse((fetchMock.mock.calls[0][1] as any).body);
    expect(body.to).toEqual(['test@boite.fr']);
  });

  it('mode redirect sans boîte de test : n’envoie rien', async () => {
    const res = await sendOtpEmail({ RESEND_API_KEY: KEY, EMAIL_MODE: 'redirect' }, CLUB, 'adherent@reel.fr', '123456');
    expect(res.ok).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('mode live : envoie au destinataire réel', async () => {
    await sendOtpEmail({ RESEND_API_KEY: KEY, EMAIL_MODE: 'live' }, CLUB, 'adherent@reel.fr', '123456');
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
    const res = await sendRenewalEmail({}, CLUB, 'ancien@reel.fr', 'Saison 26-27');
    expect(res.ok).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sendRenewalEmail n’envoie RIEN pour un mode inconnu (fail-closed)', async () => {
    await sendRenewalEmail({ RESEND_API_KEY: KEY, EMAIL_MODE: 'staging' }, CLUB, 'ancien@reel.fr', 'Saison 26-27');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sendRenewalEmail redirige vers la boîte de test, jamais à l’ex-adhérent', async () => {
    await sendRenewalEmail({ RESEND_API_KEY: KEY, EMAIL_MODE: 'redirect', EMAIL_TEST_INBOX: 'test@boite.fr' }, CLUB,
      'ancien@reel.fr',
      'Saison 26-27'
    );
    const body = JSON.parse((fetchMock.mock.calls[0][1] as any).body);
    expect(body.to).toEqual(['test@boite.fr']);
  });

  it('sendRenewalEmail porte le lien de réadhésion FFBad', async () => {
    await sendRenewalEmail({ RESEND_API_KEY: KEY, EMAIL_MODE: 'live' }, CLUB, 'ancien@reel.fr', 'Saison 26-27');
    const body = JSON.parse((fetchMock.mock.calls[0][1] as any).body);
    expect(body.html).toContain(FFBAD_MEMBERSHIP_URL);
    expect(body.text).toContain(FFBAD_MEMBERSHIP_URL);
    expect(body.subject).toContain('Saison 26-27');
  });

  it('sendUpcomingAccessEmail n’envoie RIEN sans clé API (dry-run)', async () => {
    const res = await sendUpcomingAccessEmail({}, CLUB, 'nouveau@reel.fr', 'Saison 26-27', '2026-09-01');
    expect(res.ok).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sendUpcomingAccessEmail annonce la date d’ouverture en clair', async () => {
    await sendUpcomingAccessEmail({ RESEND_API_KEY: KEY, EMAIL_MODE: 'live' }, CLUB,
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

/**
 * Trois `429` différents chez Resend, trois conduites différentes : le débit se
 * réessaie dans la seconde, le quota quotidien attend demain, le mensuel attend la
 * facture. Confondus, l'adhérent réessaie en boucle et personne n'apprend que le club a
 * atteint sa limite.
 */
describe('plafonds d’envoi Resend', () => {
  let fetchMock: any;

  const failWith = (name: string, status = 429) =>
    vi.fn(
      async () =>
        new Response(JSON.stringify({ statusCode: status, name, message: name }), { status })
    );

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const live = { RESEND_API_KEY: KEY, EMAIL_MODE: 'live' };

  it('signale le quota quotidien et dit d’attendre demain', async () => {
    fetchMock = failWith('daily_quota_exceeded');
    vi.stubGlobal('fetch', fetchMock);

    const res = await sendOtpEmail(live, CLUB, 'adherent@club.fr', '123456');

    expect(res.ok).toBe(false);
    expect(res.quotaReached).toBe(true);
    expect(res.error).toContain('demain');
  });

  it('traite le plafond mensuel comme un quota atteint', async () => {
    vi.stubGlobal('fetch', failWith('monthly_quota_exceeded'));

    const res = await sendOtpEmail(live, CLUB, 'adherent@club.fr', '123456');
    expect(res.quotaReached).toBe(true);
  });

  it('distingue le débit par seconde, qui se réessaie tout de suite', async () => {
    vi.stubGlobal('fetch', failWith('rate_limit_exceeded'));

    const res = await sendOtpEmail(live, CLUB, 'adherent@club.fr', '123456');

    expect(res.ok).toBe(false);
    // Réessayer a du sens ici, contrairement au quota : ne pas le confondre.
    expect(res.quotaReached).toBeUndefined();
    expect(res.error).toContain('quelques secondes');
  });

  it('garde un message générique pour le reste', async () => {
    vi.stubGlobal('fetch', failWith('application_error', 500));

    const res = await sendOtpEmail(live, CLUB, 'adherent@club.fr', '123456');

    expect(res.ok).toBe(false);
    expect(res.quotaReached).toBeUndefined();
    expect(res.error).toBe("Échec de l'envoi de l'email.");
  });
});

describe('l’adresse de contact des mails d’adhésion', () => {
  let fetchMock: any;

  beforeEach(() => {
    fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  // `contact@nozaybad.fr` n'existe pas : une réponse d'adhérent y serait perdue.
  it('renvoie vers le trésorier, et jamais vers contact@ qui n’existe pas', async () => {
    await sendPaymentPendingEmail({ RESEND_API_KEY: KEY, EMAIL_MODE: 'live' }, CLUB, 'adherent@reel.fr', 'Saison 2026-2027');
    await sendUpcomingAccessEmail({ RESEND_API_KEY: KEY, EMAIL_MODE: 'live' }, CLUB, 'adherent@reel.fr', 'Saison 2026-2027', '2026-09-01');
    await sendRenewalEmail({ RESEND_API_KEY: KEY, EMAIL_MODE: 'live' }, CLUB, 'ancien@reel.fr', 'Saison 2026-2027');
    expect(fetchMock).toHaveBeenCalledTimes(3);
    for (const call of fetchMock.mock.calls) {
      const body = JSON.parse((call[1] as any).body);
      expect(body.text).toContain('tresorier@nozaybad.fr');
      expect(body.html).toContain('mailto:tresorier@nozaybad.fr');
      expect(JSON.stringify(body)).not.toContain('contact@nozaybad.fr');
    }
  });

  it('part de la boîte du trésorier quand EMAIL_FROM n’est pas réglé', async () => {
    await sendOtpEmail({ RESEND_API_KEY: KEY, EMAIL_MODE: 'live' }, CLUB, 'adherent@reel.fr', '123456');
    const body = JSON.parse((fetchMock.mock.calls[0][1] as any).body);
    expect(body.from).toBe('Nozay Badminton Association <tresorier@nozaybad.fr>');
  });
});
