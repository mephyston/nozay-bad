import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import type { Db } from '@nba/db';
import { venuesTable } from '../../shared/schema';
import { indivRequestsTable, indivSessionsTable } from '../../shared/indiv-schema';
import {
  IndivRequestNotFoundError,
  IndivSessionCancelledError,
  IndivSlotFullError,
  InvalidIndivSlotError
} from '../../shared/errors';
import { selectIndiv } from './handler';

const NOW = new Date('2026-03-14T10:00:00Z');

let db: Db;
let sessionId: number;
let ids: number[];

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
  ids = [];
  for (const n of [1, 2, 3, 4, 5]) {
    const [row] = await db
      .insert(indivRequestsTable)
      .values({
        sessionId,
        memberId: n,
        licence: `0000000${n}`,
        firstName: 'C',
        lastName: `D${n}`,
        email: `c${n}@example.org`,
        memberGroup: 'Compétiteurs adultes',
        createdAt: NOW,
        updatedAt: NOW
      })
      .returning();
    ids.push(row.id);
  }
});

const selected = async () =>
  (await db.select().from(indivRequestsTable).orderBy(indivRequestsTable.id).all()).map((r) => r.selectedSlot);

describe('sélection de l’entraîneur', () => {
  it('remplace la sélection en bloc', async () => {
    await selectIndiv(db, { sessionId, selection: [{ requestId: ids[0], slot: 1 }, { requestId: ids[1], slot: 2 }] }, NOW);
    expect(await selected()).toEqual([1, 2, null, null, null]);

    const out = await selectIndiv(db, { sessionId, selection: [{ requestId: ids[2], slot: 1 }] }, NOW);
    expect(await selected()).toEqual([null, null, 1, null, null]);
    expect(out.candidates.filter((c) => c.selectedSlot !== null)).toHaveLength(1);
  });

  it('refuse un créneau plein, inexistant, ou une candidature d’une autre soirée', async () => {
    await expect(
      selectIndiv(db, { sessionId, selection: [1, 2, 3].map((i) => ({ requestId: ids[i], slot: 1 })) }, NOW)
    ).rejects.toThrow(IndivSlotFullError);
    await expect(selectIndiv(db, { sessionId, selection: [{ requestId: ids[0], slot: 3 }] }, NOW)).rejects.toThrow(
      InvalidIndivSlotError
    );
    await expect(selectIndiv(db, { sessionId, selection: [{ requestId: 9999, slot: 1 }] }, NOW)).rejects.toThrow(
      IndivRequestNotFoundError
    );
    // Rien n'a été écrit par les refus.
    expect(await selected()).toEqual([null, null, null, null, null]);
  });

  it('reste possible après l’annonce, plus après l’annulation', async () => {
    await db.update(indivSessionsTable).set({ status: 'announced', announcedAt: NOW });
    await expect(selectIndiv(db, { sessionId, selection: [{ requestId: ids[4], slot: 2 }] }, NOW)).resolves.toBeTruthy();

    await db.update(indivSessionsTable).set({ status: 'cancelled', cancelledReason: 'x' });
    await expect(selectIndiv(db, { sessionId, selection: [] }, NOW)).rejects.toThrow(IndivSessionCancelledError);
  });
});
