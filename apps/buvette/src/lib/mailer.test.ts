// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deliver } from '@nba/mailer';

const club = { name: 'Club', senderName: 'Club', contactEmail: 'contact@example.org', membershipUrl: '', signature: '' };
const mail = { subject: 'Sujet', html: '<p>Corps</p>', text: 'Corps' };
const base = { EMAIL_MODE: 'live', EMAIL_FROM: 'Club <envoi@example.org>' };

describe('choix du service d\'envoi', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('Brevo passe devant Resend quand sa clé est posée', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 201 }));
    const result = await deliver({ ...base, BREVO_API_KEY: 'b', RESEND_API_KEY: 'r' }, club, 'a@example.org', mail, () => {});
    expect(result).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.brevo.com/v3/smtp/email');
    expect(init.headers['api-key']).toBe('b');
    expect(JSON.parse(init.body)).toMatchObject({ sender: { email: 'envoi@example.org' }, to: [{ email: 'a@example.org' }], subject: 'Sujet' });
  });

  it('sans clé Brevo, Resend reste utilisé', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 200 }));
    await deliver({ ...base, RESEND_API_KEY: 'r' }, club, 'a@example.org', mail, () => {});
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.resend.com/emails');
  });

  it('le mode allowlist garde les adresses de staging, quel que soit le service', async () => {
    const result = await deliver({ ...base, EMAIL_MODE: 'allowlist', EMAIL_ALLOWLIST: 'ok@example.org', BREVO_API_KEY: 'b' }, club, 'autre@example.org', mail, () => {});
    expect(result).toEqual({ ok: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('un plafond atteint se dit comme tel', async () => {
    fetchMock.mockResolvedValue(new Response('quota', { status: 402 }));
    const result = await deliver({ ...base, BREVO_API_KEY: 'b' }, club, 'a@example.org', mail, () => {});
    expect(result).toMatchObject({ ok: false, quotaReached: true });
  });
});
