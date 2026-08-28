import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { eq } from 'drizzle-orm';
import { seasonsTable } from '@nba/accounting/schema';
import { membershipsTable } from '@nba/members/schema';
import { insertMemberFixture } from '@nba/members/test-fixtures';
import { assertMembershipMatchesSeason } from './member-season';

/**
 * `ledger_entries.member_id` désigne une adhésion, donc un exercice. L'invariant a été violé
 * pour de vrai en production — trois cotisations de rentrée rattachées à l'adhésion de l'année
 * écoulée — et le règlement disparaissait alors des deux dossiers à la fois.
 */
describe('assertMembershipMatchesSeason', () => {
  let db: any;
  let adhesion2526: number;
  let adhesion2627: number;

  const season = async (code: string) =>
    db.select().from(seasonsTable).where(eq(seasonsTable.code, code)).get();

  beforeEach(async () => {
    const mock = await setupMockDb();
    db = mock.db;

    const existantes = await db.select().from(seasonsTable).all();
    for (const [code, name, startDate, endDate] of [
      ['25-26', 'Saison 25-26', '2025-09-01', '2026-08-31'],
      ['26-27', 'Saison 26-27', '2026-09-01', '2027-08-31']
    ] as const) {
      if (!existantes.some((s: any) => s.code === code)) {
        await db.insert(seasonsTable).values({
          code, name, startDate, endDate, active: false, closedAt: null, createdAt: new Date()
        }).run();
      }
    }

    // La même personne, réinscrite : deux adhésions, une par exercice.
    adhesion2526 = (await insertMemberFixture(db, {
      licence: '01234567', seasonId: (await season('25-26')).id, lastName: 'GUYON', firstName: 'Gauthier'
    })).id;
    adhesion2627 = (await insertMemberFixture(db, {
      licence: '01234567', seasonId: (await season('26-27')).id, lastName: 'GUYON', firstName: 'Gauthier'
    })).id;
  });

  it("laisse passer l'adhésion de l'exercice de l'écriture", async () => {
    await expect(assertMembershipMatchesSeason(db, adhesion2627, (await season('26-27')).id))
      .resolves.toBeUndefined();
  });

  it('laisse passer une écriture sans adhérent', async () => {
    await expect(assertMembershipMatchesSeason(db, null, (await season('26-27')).id)).resolves.toBeUndefined();
    await expect(assertMembershipMatchesSeason(db, undefined, (await season('26-27')).id)).resolves.toBeUndefined();
  });

  it("refuse l'adhésion d'un autre exercice, et nomme celle qu'il fallait", async () => {
    await expect(assertMembershipMatchesSeason(db, adhesion2526, (await season('26-27')).id))
      .rejects.toThrow(new RegExp(`exercice 26-27 \\(n°${adhesion2627}\\)`));
  });

  it("le dit autrement quand la personne n'a pas d'adhésion dans l'exercice visé", async () => {
    await db.delete(membershipsTable).where(eq(membershipsTable.id, adhesion2627)).run();
    await expect(assertMembershipMatchesSeason(db, adhesion2526, (await season('26-27')).id))
      .rejects.toThrow(/pas d'adhésion en 26-27/);
  });

  it("refuse une adhésion qui n'existe pas plutôt que de l'ignorer", async () => {
    await expect(assertMembershipMatchesSeason(db, 999999, (await season('26-27')).id))
      .rejects.toThrow(/introuvable/);
  });
});
