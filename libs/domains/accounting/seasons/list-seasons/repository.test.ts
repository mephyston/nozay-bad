import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { seasonsTable } from '@nba/accounting/schema';
import { ListSeasonsRepository } from './repository';

/**
 * `closed`, dérivé de `closed_at`.
 *
 * La table ne porte qu'un horodatage, `closed_at`. Le référentiel était rendu brut, et
 * l'interface cherchait partout un booléen `closed` qui n'existait dans aucune réponse :
 * le relais pour l'affichage en lecture seule, `toSeasonOptions` pour le suffixe
 * « — clôturée », l'en-tête du rapprochement pour son alerte et pour désactiver l'import,
 * et la liste des écritures pointables pour écarter celles d'un exercice clos.
 *
 * Les cinq lisaient `undefined`, donc se comportaient comme si aucun exercice n'était
 * jamais clôturé. Rien ne le signalait : un champ absent ne lève pas, il vaut faux.
 */
describe('ListSeasonsRepository — le drapeau de clôture', () => {
  let db: any;
  const repo = new ListSeasonsRepository();

  beforeEach(async () => {
    const mock = await setupMockDb();
    db = mock.db;

    await db.insert(seasonsTable).values([
      {
        id: 1, code: '24-25', name: 'Saison 2024-2025',
        startDate: '2024-09-01', endDate: '2025-08-31',
        active: false, closedAt: new Date(1756684800000), createdAt: new Date()
      },
      {
        id: 2, code: '25-26', name: 'Saison 2025-2026',
        startDate: '2025-09-01', endDate: '2026-08-31',
        active: true, closedAt: null, createdAt: new Date()
      }
    ]);
  });

  it('rend `closed` vrai sur un exercice clôturé', async () => {
    const seasons = await repo.listSeasons(db);
    expect(seasons.find((s: any) => s.code === '24-25')!.closed).toBe(true);
  });

  it('rend `closed` faux sur un exercice ouvert, et non `undefined`', async () => {
    const seasons = await repo.listSeasons(db);
    const ouverte = seasons.find((s: any) => s.code === '25-26')!;

    // `toBe(false)` et non `toBeFalsy()` : c'est justement `undefined` qu'on veut exclure,
    // et `undefined` est falsy.
    expect(ouverte.closed).toBe(false);
  });

  it("garde `closedAt` à côté, que le calcul de l'à-nouveau et la clôture lisent", async () => {
    const seasons = await repo.listSeasons(db);
    expect(seasons.find((s: any) => s.code === '24-25')!.closedAt).toBeInstanceOf(Date);
    expect(seasons.find((s: any) => s.code === '25-26')!.closedAt).toBeNull();
  });
});
