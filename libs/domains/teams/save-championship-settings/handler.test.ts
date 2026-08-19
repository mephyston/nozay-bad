import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { type Db } from '@nba/db';
import { saveChampionshipSettings } from './handler';
import { listChampionshipSettings } from '../list-championship-settings/handler';
import { UnknownChampionshipError } from '../shared/errors';

const NOW = new Date('2026-10-01T10:00:00Z');
const SEASON = '26-27';

describe('réglages d’un championnat', () => {
  let db: Db;

  beforeEach(async () => {
    ({ db } = await setupMockDb());
  });

  it('épingle la date de référence d’un championnat départemental', async () => {
    const result = await saveChampionshipSettings(
      db,
      { seasonCode: SEASON, championship: 'icd_mixte', referenceEloDate: '2026-10-08' },
      NOW
    );

    expect(result.referenceEloDate).toBe('2026-10-08');
  });

  it('refuse d’épingler une date sur le régional, qui la recalcule par journée', async () => {
    await expect(
      saveChampionshipSettings(
        db,
        { seasonCode: SEASON, championship: 'icr_seniors', referenceEloDate: '2026-10-08' },
        NOW
      )
    ).rejects.toBeInstanceOf(UnknownChampionshipError);
  });

  describe('lien du règlement', () => {
    it('s’enregistre pour n’importe quel championnat, régional compris', async () => {
      const result = await saveChampionshipSettings(
        db,
        {
          seasonCode: SEASON, championship: 'icr_seniors',
          rulesUrl: 'https://nozaybad.fr/media/icrs-2026-2027.pdf',
          rulesLabel: 'Règlement ICR 2026-2027'
        },
        NOW
      );

      expect(result.rulesUrl).toBe('https://nozaybad.fr/media/icrs-2026-2027.pdf');
      expect(result.rulesLabel).toBe('Règlement ICR 2026-2027');
    });

    it('n’écrase pas la date de référence déjà épinglée', async () => {
      await saveChampionshipSettings(
        db, { seasonCode: SEASON, championship: 'icd_mixte', referenceEloDate: '2026-10-08' }, NOW
      );

      await saveChampionshipSettings(
        db,
        { seasonCode: SEASON, championship: 'icd_mixte', rulesUrl: 'https://x/r.pdf', rulesLabel: null },
        NOW
      );

      const items = (await listChampionshipSettings(db, SEASON)).items;
      const mixte = items.find((i) => i.championship === 'icd_mixte')!;
      expect(mixte.referenceEloDate).toBe('2026-10-08');
      expect(mixte.rulesUrl).toBe('https://x/r.pdf');
    });

    it('n’est pas écrasé par une modification de la date', async () => {
      await saveChampionshipSettings(
        db, { seasonCode: SEASON, championship: 'icd_mixte', rulesUrl: 'https://x/r.pdf' }, NOW
      );

      await saveChampionshipSettings(
        db, { seasonCode: SEASON, championship: 'icd_mixte', referenceEloDate: '2026-10-08' }, NOW
      );

      const mixte = (await listChampionshipSettings(db, SEASON)).items.find(
        (i) => i.championship === 'icd_mixte'
      )!;
      expect(mixte.rulesUrl).toBe('https://x/r.pdf');
    });

    it('se retire avec null', async () => {
      await saveChampionshipSettings(
        db, { seasonCode: SEASON, championship: 'icd_mixte', rulesUrl: 'https://x/r.pdf' }, NOW
      );

      const result = await saveChampionshipSettings(
        db, { seasonCode: SEASON, championship: 'icd_mixte', rulesUrl: null }, NOW
      );

      expect(result.rulesUrl).toBeNull();
    });
  });

  it('liste les quatre championnats, même sans aucun réglage enregistré', async () => {
    const { items } = await listChampionshipSettings(db, SEASON);

    expect(items).toHaveLength(4);
    expect(items.every((i) => i.rulesUrl === null)).toBe(true);
  });
});
