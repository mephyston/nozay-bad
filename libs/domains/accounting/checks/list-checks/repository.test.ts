import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { seasonsTable } from '@nba/accounting/schema';
import { checksTable } from '../../shared/schema';
import { ListChecksRepository } from './repository';

describe('ListChecksRepository.listChecks', () => {
  let db: any;

  beforeEach(async () => {
    db = (await setupMockDb()).db;
    await db.insert(seasonsTable).values({
      id: 1, code: '26-27', name: 'Saison 2026-2027', startDate: '2026-09-01', endDate: '2027-08-31',
      active: true, closedAt: null, createdAt: new Date()
    });
  });

  it("trie les chèques dans l'ordre de l'exercice — septembre en tête, sans mois en dernier", async () => {
    // Saisis dans le désordre, et le plus récent d'abord pour prouver que la date de
    // saisie ne décide plus qu'à mois égal.
    const t = (s: number) => new Date(2026, 8, 1 + s);
    await db.insert(checksTable).values([
      { id: 1, seasonId: 1, number: '0000001', amountCents: 100, emitter: 'JANVIER', status: 'received', plannedDepositMonth: 1, createdAt: t(4) },
      { id: 2, seasonId: 1, number: '0000002', amountCents: 100, emitter: 'SANS MOIS', status: 'received', plannedDepositMonth: null, createdAt: t(3) },
      { id: 3, seasonId: 1, number: '0000003', amountCents: 100, emitter: 'SEPTEMBRE', status: 'received', plannedDepositMonth: 9, createdAt: t(2) },
      { id: 4, seasonId: 1, number: '0000004', amountCents: 100, emitter: 'DÉCEMBRE', status: 'received', plannedDepositMonth: 12, createdAt: t(1) },
      { id: 5, seasonId: 1, number: '0000005', amountCents: 100, emitter: 'SEPTEMBRE ANCIEN', status: 'received', plannedDepositMonth: 9, createdAt: t(0) },
      { id: 6, seasonId: 1, number: '0000006', amountCents: 100, emitter: 'AOÛT', status: 'received', plannedDepositMonth: 8, createdAt: t(5) }
    ]);

    const rows = await new ListChecksRepository().listChecks(db, '26-27');

    expect(rows.map((r: any) => r.emitter)).toEqual([
      'SEPTEMBRE', 'SEPTEMBRE ANCIEN', 'DÉCEMBRE', 'JANVIER', 'AOÛT', 'SANS MOIS'
    ]);
    expect(rows[0].plannedDepositMonth).toBe(9);
    expect(rows[5].plannedDepositMonth).toBeNull();
  });
});
