import { describe, it, expect, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { setupMockDb } from '@nba/db/test-utils';
import type { Db } from '@nba/db';
import { scheduleSlotsTable, venuesTable } from '../../shared/schema';
import { indivSessionsTable } from '../../shared/indiv-schema';
import { InvalidSessionDateError, NoIndivSlotError, RangeTooWideError } from '../../shared/errors';
import { generateIndivSessions } from './handler';

const NOW = new Date('2026-03-14T10:00:00Z');

let db: Db;
let venueId: number;

/** `weekday` en ISO : 2 = mardi, 4 = jeudi. */
async function seedSlot(weekday: number, over: Record<string, unknown> = {}) {
  const [slot] = await db
    .insert(scheduleSlotsTable)
    .values({
      venueId,
      weekday,
      startTime: '19:30',
      endTime: '20:30',
      audience: 'adultes_competition',
      indiv: true,
      label: 'Indiv (compétiteurs Adultes)',
      createdAt: NOW,
      ...over
    })
    .returning();
  return slot;
}

const sessions = async () => db.select().from(indivSessionsTable).orderBy(indivSessionsTable.date).all();

beforeEach(async () => {
  ({ db } = await setupMockDb());
  const [venue] = await db
    .insert(venuesTable)
    .values({ code: 'pierre-dupuis', name: 'Pierre Dupuis', createdAt: NOW })
    .returning();
  venueId = venue.id;
});

describe('génération des soirées d’indiv', () => {
  it('déroule mardi et jeudi sur la période, à l’heure du créneau', async () => {
    const tuesday = await seedSlot(2);
    await seedSlot(4);

    // Du lundi 16 au dimanche 29 mars : deux mardis, deux jeudis.
    const result = await generateIndivSessions(db, { from: '2026-03-16', to: '2026-03-29' }, NOW);

    expect(result).toEqual({ created: 4, skipped: 0 });
    const rows = await sessions();
    expect(rows.map((r) => r.date)).toEqual(['2026-03-17', '2026-03-19', '2026-03-24', '2026-03-26']);
    expect(rows[0]).toMatchObject({ slotId: tuesday.id, startTime: '19:30', slotCount: 2, slotMinutes: 30, capacityPerSlot: 2, label: 'Indiv (compétiteurs Adultes)' });
  });

  it('est rejouable et ne défait pas une soirée annoncée', async () => {
    await seedSlot(2);
    await generateIndivSessions(db, { from: '2026-03-16', to: '2026-03-22' }, NOW);
    const [first] = await sessions();
    await db
      .update(indivSessionsTable)
      .set({ status: 'announced', announcedAt: NOW })
      .where(eq(indivSessionsTable.id, first.id));

    const again = await generateIndivSessions(db, { from: '2026-03-16', to: '2026-03-29' }, NOW);

    expect(again).toEqual({ created: 1, skipped: 1 });
    const [kept] = await sessions();
    expect(kept.status).toBe('announced');
  });

  it('applique une heure et des réglages propres à la génération', async () => {
    // Le jeudi, le créneau compétiteurs court de 19 h 30 à 21 h ; l'indiv n'en prend que
    // le début, et l'entraîneur peut le décaler.
    await seedSlot(4, { endTime: '21:00' });
    await generateIndivSessions(
      db,
      { from: '2026-03-16', to: '2026-03-22', startTime: '20:00', slotCount: 3, capacityPerSlot: 1 },
      NOW
    );
    const [row] = await sessions();
    expect(row).toMatchObject({ startTime: '20:00', slotCount: 3, capacityPerSlot: 1 });
  });

  it('ignore les créneaux non marqués « indiv » — même compétiteurs — et les créneaux masqués', async () => {
    // L'entraînement compétiteurs du mardi 20 h 30 n'ouvre pas d'indiv : le public ne suffit pas.
    await seedSlot(2, { startTime: '20:30', endTime: '22:30', indiv: false });
    await seedSlot(3, { audience: 'adultes_loisir', indiv: false });
    await seedSlot(4, { active: false });
    await expect(
      generateIndivSessions(db, { from: '2026-03-16', to: '2026-03-22' }, NOW)
    ).rejects.toThrow(NoIndivSlotError);
  });

  it('refuse une période à l’envers ou trop large', async () => {
    await seedSlot(2);
    await expect(
      generateIndivSessions(db, { from: '2026-03-29', to: '2026-03-16' }, NOW)
    ).rejects.toThrow(InvalidSessionDateError);
    await expect(
      generateIndivSessions(db, { from: '2026-03-16', to: '2027-03-29' }, NOW)
    ).rejects.toThrow(RangeTooWideError);
  });
});
