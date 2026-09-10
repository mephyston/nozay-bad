import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import type { Db } from '@nba/db';
import { venuesTable } from '../../shared/schema';
import { indivRequestsTable, indivSessionsTable } from '../../shared/indiv-schema';
import { IndivSessionNotFoundError } from '../../shared/errors';
import { listIndivCandidates } from './handler';

const NOW = new Date('2026-03-14T10:00:00Z');

let db: Db;
let venueId: number;

async function seedSession(date: string, over: Record<string, unknown> = {}): Promise<number> {
  const [row] = await db
    .insert(indivSessionsTable)
    .values({ venueId, date, startTime: '19:30', createdAt: NOW, updatedAt: NOW, ...over })
    .returning();
  return row.id;
}

async function seedRequest(sessionId: number, licence: string, over: Record<string, unknown> = {}) {
  await db.insert(indivRequestsTable).values({
    sessionId,
    memberId: Number(licence.slice(-2)),
    licence,
    firstName: 'Camille',
    lastName: licence,
    email: `${licence}@example.org`,
    memberGroup: 'Compétiteurs adultes',
    createdAt: NOW,
    updatedAt: NOW,
    ...over
  });
}

beforeEach(async () => {
  ({ db } = await setupMockDb());
  const [venue] = await db
    .insert(venuesTable)
    .values({ code: 'pierre-dupuis', name: 'Pierre Dupuis', createdAt: NOW })
    .returning();
  venueId = venue.id;
});

describe('candidats d’une soirée', () => {
  it('rend la soirée, ses créneaux et ses candidats nommés', async () => {
    const id = await seedSession('2026-03-17');
    await seedRequest(id, '00000001', { preferredSlot: 2, note: 'le service' });

    const out = await listIndivCandidates(db, { sessionId: id });
    expect(out.session).toMatchObject({ venueName: 'Pierre Dupuis', endTime: '20:30' });
    expect(out.session.slots).toHaveLength(2);
    expect(out.candidates[0]).toMatchObject({
      licence: '00000001',
      lastName: '00000001',
      preferredSlot: 2,
      note: 'le service',
      selectedSlot: null,
      requestCount: 1,
      selectedCount: 0,
      lastSelectedDate: null
    });
  });

  it('compte les sélections de la saison sur les soirées annoncées seulement', async () => {
    const past1 = await seedSession('2026-02-03', { status: 'announced', announcedAt: NOW });
    const past2 = await seedSession('2026-02-10', { status: 'announced', announcedAt: NOW });
    const cancelled = await seedSession('2026-02-17', { status: 'cancelled', cancelledReason: 'x' });
    const notAnnounced = await seedSession('2026-03-10');
    const lastSeason = await seedSession('2025-05-06', { status: 'announced', announcedAt: NOW });
    const current = await seedSession('2026-03-17');

    // Alice : retenue deux fois, dont une sur une soirée annulée après coup qui ne compte pas.
    await seedRequest(past1, '00000001', { selectedSlot: 1 });
    await seedRequest(past2, '00000001', { selectedSlot: 2 });
    await seedRequest(cancelled, '00000001', { selectedSlot: 1 });
    await seedRequest(notAnnounced, '00000001', { selectedSlot: 1 });
    await seedRequest(lastSeason, '00000001', { selectedSlot: 1 });
    await seedRequest(current, '00000001');
    // Bob : a demandé sans jamais être retenu.
    await seedRequest(past1, '00000002');
    await seedRequest(current, '00000002');

    const { candidates } = await listIndivCandidates(db, { sessionId: current });
    const alice = candidates.find((c) => c.licence === '00000001');
    const bob = candidates.find((c) => c.licence === '00000002');
    expect(alice).toMatchObject({ requestCount: 4, selectedCount: 2, lastSelectedDate: '2026-02-10' });
    expect(bob).toMatchObject({ requestCount: 2, selectedCount: 0, lastSelectedDate: null });
  });

  it('refuse une soirée inconnue', async () => {
    await expect(listIndivCandidates(db, { sessionId: 999 })).rejects.toThrow(IndivSessionNotFoundError);
  });
});
