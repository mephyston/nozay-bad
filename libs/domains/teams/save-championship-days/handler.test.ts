import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { type Db } from '@nba/db';
import { saveChampionshipDays } from './handler';
import { listChampionshipDays } from '../list-championship-days/handler';
import { InvalidLineupError } from '../shared/errors';

const NOW = new Date('2026-09-01T10:00:00Z');
const SEASON = '26-27';

describe('calendrier des journées', () => {
  let db: Db;

  beforeEach(async () => {
    ({ db } = await setupMockDb());
  });

  it('ramène la semaine au lundi, quel que soit le jour saisi', async () => {
    // Mercredi 14 octobre 2026 → semaine du lundi 12 au dimanche 18.
    await saveChampionshipDays(
      db,
      { seasonCode: SEASON, championship: 'icd_mixte', days: [{ number: 1, weekStart: '2026-10-14' }] },
      NOW
    );

    const { days } = await listChampionshipDays(db, SEASON, 'icd_mixte');
    expect(days[0]).toMatchObject({ weekStart: '2026-10-12', weekEnd: '2026-10-18' });
  });

  it('rattache un dimanche à SA semaine, pas à la suivante', async () => {
    await saveChampionshipDays(
      db,
      { seasonCode: SEASON, championship: 'icd_mixte', days: [{ number: 1, weekStart: '2026-10-18' }] },
      NOW
    );

    const { days } = await listChampionshipDays(db, SEASON, 'icd_mixte');
    expect(days[0].weekStart).toBe('2026-10-12');
  });

  it('refuse deux journées dans la même semaine : une journée EST une semaine', async () => {
    await expect(
      saveChampionshipDays(
        db,
        {
          seasonCode: SEASON,
          championship: 'icd_mixte',
          days: [
            { number: 1, weekStart: '2026-10-12' },
            { number: 2, weekStart: '2026-10-15' }
          ]
        },
        NOW
      )
    ).rejects.toBeInstanceOf(InvalidLineupError);
  });

  it('refuse deux fois le même numéro de journée', async () => {
    await expect(
      saveChampionshipDays(
        db,
        {
          seasonCode: SEASON,
          championship: 'icd_mixte',
          days: [
            { number: 1, weekStart: '2026-10-12' },
            { number: 1, weekStart: '2026-10-19' }
          ]
        },
        NOW
      )
    ).rejects.toBeInstanceOf(InvalidLineupError);
  });

  it('met à jour une journée sans la recréer, pour ne pas emporter les compositions', async () => {
    await saveChampionshipDays(
      db,
      { seasonCode: SEASON, championship: 'icd_mixte', days: [{ number: 1, weekStart: '2026-10-12' }] },
      NOW
    );
    const before = (await listChampionshipDays(db, SEASON, 'icd_mixte')).days[0].id;

    await saveChampionshipDays(
      db,
      { seasonCode: SEASON, championship: 'icd_mixte', days: [{ number: 1, weekStart: '2026-10-19' }] },
      NOW
    );
    const after = (await listChampionshipDays(db, SEASON, 'icd_mixte')).days[0];

    // Même ligne, date changée : les rencontres qui la référencent survivent.
    expect(after.id).toBe(before);
    expect(after.weekStart).toBe('2026-10-19');
  });

  it('retire les journées absentes du calendrier soumis', async () => {
    await saveChampionshipDays(
      db,
      {
        seasonCode: SEASON,
        championship: 'icd_mixte',
        days: [
          { number: 1, weekStart: '2026-10-12' },
          { number: 2, weekStart: '2026-10-19' }
        ]
      },
      NOW
    );

    await saveChampionshipDays(
      db,
      { seasonCode: SEASON, championship: 'icd_mixte', days: [{ number: 1, weekStart: '2026-10-12' }] },
      NOW
    );

    expect((await listChampionshipDays(db, SEASON, 'icd_mixte')).days).toHaveLength(1);
  });

  describe('championnats qui jouent la même semaine', () => {
    /** Numéros volontairement différents : c'est la semaine qui compte, pas le numéro. */
    async function seedTwoChampionships() {
      await saveChampionshipDays(
        db,
        { seasonCode: SEASON, championship: 'icd_mixte', days: [{ number: 3, weekStart: '2026-10-12' }] },
        NOW
      );
      await saveChampionshipDays(
        db,
        { seasonCode: SEASON, championship: 'icd_masculin', days: [{ number: 5, weekStart: '2026-10-14' }] },
        NOW
      );
    }

    it('signale le masculin en face du mixte, malgré des numéros différents', async () => {
      await seedTwoChampionships();

      const { days } = await listChampionshipDays(db, SEASON, 'icd_mixte');
      expect(days[0].concurrentChampionships).toEqual(['icd_masculin']);
    });

    it('signale aussi le régional, qu’un joueur ne peut pas cumuler avec un ICD', async () => {
      await seedTwoChampionships();
      await saveChampionshipDays(
        db,
        { seasonCode: SEASON, championship: 'icr_seniors', days: [{ number: 1, weekStart: '2026-10-12' }] },
        NOW
      );

      const { days } = await listChampionshipDays(db, SEASON, 'icd_mixte');
      expect(days[0].concurrentChampionships.sort()).toEqual(['icd_masculin', 'icr_seniors']);
    });

    it('laisse les vétérans hors du groupe : leur règlement ne cite personne', async () => {
      await saveChampionshipDays(
        db,
        { seasonCode: SEASON, championship: 'icd_mixte', days: [{ number: 3, weekStart: '2026-10-12' }] },
        NOW
      );
      await saveChampionshipDays(
        db,
        { seasonCode: SEASON, championship: 'icd_veterans', days: [{ number: 1, weekStart: '2026-10-12' }] },
        NOW
      );

      const { days } = await listChampionshipDays(db, SEASON, 'icd_mixte');
      expect(days[0].concurrentChampionships).toEqual([]);
    });

    it('ne rapproche rien quand les semaines diffèrent', async () => {
      await saveChampionshipDays(
        db,
        { seasonCode: SEASON, championship: 'icd_mixte', days: [{ number: 1, weekStart: '2026-10-12' }] },
        NOW
      );
      await saveChampionshipDays(
        db,
        { seasonCode: SEASON, championship: 'icd_masculin', days: [{ number: 1, weekStart: '2026-10-19' }] },
        NOW
      );

      // Même numéro de journée, semaines différentes : aucun conflit.
      const { days } = await listChampionshipDays(db, SEASON, 'icd_mixte');
      expect(days[0].concurrentChampionships).toEqual([]);
    });
  });
});
