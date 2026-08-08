import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { type Db } from '@nba/db';
import { createAnnouncement } from '../create-announcement/handler';
import { listAnnouncements } from './handler';

describe('listAnnouncements', () => {
  let db: Db;

  beforeEach(async () => {
    ({ db } = await setupMockDb());
  });

  function publish(title: string, at: string) {
    return createAnnouncement(
      db,
      { title, bodyHtml: `<p>${title}</p>`, status: 'published' },
      'bureau@nozaybad.fr',
      new Date(at)
    );
  }

  it('rend les annonces publiées de la plus récente à la plus ancienne', async () => {
    await publish('Ancienne', '2026-08-01T10:00:00Z');
    await publish('Récente', '2026-08-07T10:00:00Z');
    await publish('Intermédiaire', '2026-08-04T10:00:00Z');

    const result = await listAnnouncements(db, { status: 'published' });

    expect(result.map((a) => a.title)).toEqual(['Récente', 'Intermédiaire', 'Ancienne']);
  });

  it('écarte les brouillons quand le statut est demandé', async () => {
    await publish('Publiée', '2026-08-01T10:00:00Z');
    await createAnnouncement(db, { title: 'Brouillon', bodyHtml: '<p>X</p>' }, 'bureau@nozaybad.fr');

    const published = await listAnnouncements(db, { status: 'published' });
    expect(published.map((a) => a.title)).toEqual(['Publiée']);
  });

  it('rend brouillons et annonces publiées quand aucun statut n\'est demandé', async () => {
    await publish('Publiée', '2026-08-01T10:00:00Z');
    await createAnnouncement(db, { title: 'Brouillon', bodyHtml: '<p>X</p>' }, 'bureau@nozaybad.fr');

    const all = await listAnnouncements(db);
    expect(all).toHaveLength(2);
  });

  it('applique la limite demandée — l\'accueil n\'affiche que les 3 dernières', async () => {
    await publish('Un', '2026-08-01T10:00:00Z');
    await publish('Deux', '2026-08-02T10:00:00Z');
    await publish('Trois', '2026-08-03T10:00:00Z');
    await publish('Quatre', '2026-08-04T10:00:00Z');

    const result = await listAnnouncements(db, { status: 'published', limit: 3 });

    expect(result.map((a) => a.title)).toEqual(['Quatre', 'Trois', 'Deux']);
  });

  it('plafonne une limite déraisonnable', async () => {
    await publish('Un', '2026-08-01T10:00:00Z');
    // Ne doit pas échouer, ni tenter de charger 10 000 lignes.
    const result = await listAnnouncements(db, { limit: 10000 });
    expect(result).toHaveLength(1);
  });

  it('décale la lecture avec offset', async () => {
    await publish('Un', '2026-08-01T10:00:00Z');
    await publish('Deux', '2026-08-02T10:00:00Z');

    const result = await listAnnouncements(db, { status: 'published', offset: 1 });
    expect(result.map((a) => a.title)).toEqual(['Un']);
  });
});
