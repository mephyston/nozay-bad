import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import type { Db } from '@nba/db';
import { venuesTable } from '../../shared/schema';
import { indivRequestsTable, indivSessionsTable } from '../../shared/indiv-schema';
import { IndivSessionCancelledError, IndivSessionNotFoundError, NoIndivSelectionError } from '../../shared/errors';
import { announceIndiv } from './handler';

const NOW = new Date('2026-03-16T18:00:00Z');

let db: Db;
let sessionId: number;

beforeEach(async () => {
  ({ db } = await setupMockDb());
  const [venue] = await db
    .insert(venuesTable)
    .values({ code: 'pierre-dupuis', name: 'Pierre Dupuis', createdAt: NOW })
    .returning();
  const [session] = await db
    .insert(indivSessionsTable)
    .values({ venueId: venue.id, date: '2026-03-17', startTime: '19:30', createdAt: NOW, updatedAt: NOW })
    .returning();
  sessionId = session.id;
  for (const [n, slot] of [[1, 1], [2, null], [3, 2]] as const) {
    await db.insert(indivRequestsTable).values({
      sessionId,
      memberId: n,
      licence: `0000000${n}`,
      firstName: 'C',
      lastName: `D${n}`,
      email: `c${n}@example.org`,
      memberGroup: 'Compétiteurs adultes',
      selectedSlot: slot,
      createdAt: NOW,
      updatedAt: NOW
    });
  }
});

describe('annonce', () => {
  it('ferme la soirée et sépare retenus et non retenus', async () => {
    const out = await announceIndiv(db, { sessionId }, NOW);
    expect(out.session).toMatchObject({ status: 'announced', announcedAt: NOW });
    expect(out.selected.map((r) => r.memberId)).toEqual([1, 3]);
    expect(out.declined.map((r) => r.memberId)).toEqual([2]);
    expect(out.reannounced).toBe(false);
  });

  it('sait qu’elle ré-annonce', async () => {
    await announceIndiv(db, { sessionId }, NOW);
    const later = new Date('2026-03-16T20:00:00Z');
    const again = await announceIndiv(db, { sessionId }, later);
    expect(again.reannounced).toBe(true);
    expect(again.session.announcedAt).toEqual(later);
  });

  it('refuse sans retenu, sur une soirée annulée ou inconnue', async () => {
    await db.update(indivRequestsTable).set({ selectedSlot: null });
    await expect(announceIndiv(db, { sessionId }, NOW)).rejects.toThrow(NoIndivSelectionError);

    await db.update(indivSessionsTable).set({ status: 'cancelled', cancelledReason: 'x' });
    await expect(announceIndiv(db, { sessionId }, NOW)).rejects.toThrow(IndivSessionCancelledError);

    await expect(announceIndiv(db, { sessionId: 999 }, NOW)).rejects.toThrow(IndivSessionNotFoundError);
  });
});
