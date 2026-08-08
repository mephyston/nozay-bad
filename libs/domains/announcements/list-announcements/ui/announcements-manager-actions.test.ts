import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Announcement } from './announcements-manager-types';

const confirmMock = vi.fn();
vi.mock('@nba/ui', () => ({ uiConfirm: (message: string) => confirmMock(message) }));

const {
  validateAnnouncement,
  submitAnnouncement,
  toggleAnnouncementStatus,
  notifyAnnouncement,
  deleteAnnouncement
} = await import('./announcements-manager-actions');

function announcement(overrides: Partial<Announcement> = {}): Announcement {
  return {
    id: 7,
    title: 'Tournoi interne',
    bodyHtml: '<p>Rendez-vous samedi</p>',
    status: 'published',
    publishedAt: '2026-08-01T10:00:00.000Z',
    notifiedAt: null,
    authorEmail: 'bureau@nozaybad.fr',
    createdAt: '2026-08-01T10:00:00.000Z',
    updatedAt: '2026-08-01T10:00:00.000Z',
    ...overrides
  };
}

/** Corps envoyé au n-ième appel de `fetch`. */
function payloadOf(call: number): any {
  const [, init] = (globalThis.fetch as any).mock.calls[call];
  return JSON.parse(init.body);
}

beforeEach(() => {
  confirmMock.mockReset().mockResolvedValue(true);
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ success: true, data: { id: 42 } }),
    text: async () => ''
  }) as any;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('validateAnnouncement', () => {
  const base = { editingId: null, status: 'draft' as const, notify: false, alreadyNotified: false };

  it('exige un titre', () => {
    expect(validateAnnouncement({ ...base, title: '  ', bodyHtml: '<p>Texte</p>' })).toMatch(/titre/i);
  });

  it('exige un texte porteur de contenu', () => {
    expect(validateAnnouncement({ ...base, title: 'Titre', bodyHtml: '<p>  </p>' })).toMatch(/texte/i);
    expect(validateAnnouncement({ ...base, title: 'Titre', bodyHtml: '<p>&nbsp;</p>' })).toMatch(/texte/i);
  });

  it('refuse un titre trop long', () => {
    expect(
      validateAnnouncement({ ...base, title: 'x'.repeat(201), bodyHtml: '<p>Texte</p>' })
    ).toMatch(/200/);
  });

  it('accepte une annonce complète', () => {
    expect(validateAnnouncement({ ...base, title: 'Titre', bodyHtml: '<p>Texte</p>' })).toBeNull();
  });
});

describe('submitAnnouncement', () => {
  const values = {
    editingId: null,
    title: 'Tournoi',
    bodyHtml: '<p>Texte</p>',
    status: 'published' as const,
    notify: false,
    alreadyNotified: false
  };

  it("n'appelle que l'enregistrement quand la diffusion n'est pas demandée", async () => {
    await submitAnnouncement(values);

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(payloadOf(0).action).toBe('create');
  });

  it('enchaîne la diffusion sur l\'identifiant renvoyé par la création', async () => {
    await submitAnnouncement({ ...values, notify: true });

    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    expect(payloadOf(1)).toEqual({ action: 'notify', id: 42 });
  });

  it('ne diffuse pas un brouillon, même si la case est cochée', async () => {
    await submitAnnouncement({ ...values, status: 'draft', notify: true });

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('ne rediffuse pas une annonce déjà diffusée', async () => {
    await submitAnnouncement({ ...values, editingId: 7, notify: true, alreadyNotified: true });

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(payloadOf(0).action).toBe('update');
  });

  it('remonte le message d\'erreur du serveur', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue({ ok: false, text: async () => 'Le texte est vide.' }) as any;

    await expect(submitAnnouncement(values)).rejects.toThrow('Le texte est vide.');
  });
});

describe('toggleAnnouncementStatus', () => {
  it('publie un brouillon sans demander de confirmation', async () => {
    const next = await toggleAnnouncementStatus(announcement({ status: 'draft' }));

    expect(next).toBe('published');
    expect(confirmMock).not.toHaveBeenCalled();
    expect(payloadOf(0)).toMatchObject({ action: 'update', id: 7, status: 'published' });
  });

  it('demande confirmation avant de retirer une annonce publiée', async () => {
    const next = await toggleAnnouncementStatus(announcement({ status: 'published' }));

    expect(confirmMock).toHaveBeenCalledOnce();
    expect(next).toBe('draft');
    expect(payloadOf(0).status).toBe('draft');
  });

  it('renvoie le statut inchangé et n\'écrit rien si la confirmation est refusée', async () => {
    confirmMock.mockResolvedValue(false);

    const next = await toggleAnnouncementStatus(announcement({ status: 'published' }));

    expect(next).toBe('published');
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('renvoie le titre et le texte inchangés', async () => {
    await toggleAnnouncementStatus(announcement({ status: 'draft' }));

    expect(payloadOf(0)).toMatchObject({
      title: 'Tournoi interne',
      bodyHtml: '<p>Rendez-vous samedi</p>'
    });
  });
});

describe('notifyAnnouncement et deleteAnnouncement', () => {
  it('diffusent après confirmation', async () => {
    expect(await notifyAnnouncement(announcement())).toBe(true);
    expect(payloadOf(0)).toEqual({ action: 'notify', id: 7 });
  });

  it('suppriment après confirmation', async () => {
    expect(await deleteAnnouncement(announcement())).toBe(true);
    expect(payloadOf(0)).toEqual({ action: 'delete', id: 7 });
  });

  it('ne font rien si la confirmation est refusée', async () => {
    confirmMock.mockResolvedValue(false);

    expect(await notifyAnnouncement(announcement())).toBe(false);
    expect(await deleteAnnouncement(announcement())).toBe(false);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
