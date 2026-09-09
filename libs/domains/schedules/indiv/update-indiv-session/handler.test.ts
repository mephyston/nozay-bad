import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import type { Db } from '@nba/db';
import { venuesTable } from '../../shared/schema';
import { indivRequestsTable } from '../../shared/indiv-schema';
import {
  IndivSessionNotFoundError,
  IndivSlotFullError,
  InvalidIndivLayoutError,
  MissingCancellationReasonError
} from '../../shared/errors';
import { createIndivSession } from '../create-indiv-session/handler';
import { updateIndivSession } from './handler';

const NOW = new Date('2026-03-14T10:00:00Z');

let db: Db;
let venueId: number;
let sessionId: number;

async function seedSelected(memberId: number, selectedSlot: number) {
  await db.insert(indivRequestsTable).values({
    sessionId,
    memberId,
    licence: `0000000${memberId}`,
    firstName: 'Camille',
    lastName: `Durand${memberId}`,
    email: `camille${memberId}@example.org`,
    memberGroup: 'Compétiteurs adultes',
    selectedSlot,
    createdAt: NOW,
    updatedAt: NOW
  });
}

beforeEach(async () => {
  ({ db } = await setupMockDb());
  const [venue] = await db
    .insert(venuesTable)
    .values({ code: 'pierre-dupuis', name: 'Pierre Dupuis', createdAt: NOW })
    .returning();
  venueId = venue.id;
  sessionId = (await createIndivSession(db, { venueId, date: '2026-03-17', startTime: '19:30' }, NOW)).id;
});

describe('corrections de l’entraîneur', () => {
  it('ne change que ce qu’on lui donne', async () => {
    const updated = await updateIndivSession(db, { sessionId, startTime: '20:00' }, NOW);
    expect(updated).toMatchObject({ startTime: '20:00', slotCount: 2, capacityPerSlot: 2 });
  });

  it('refuse une soirée inconnue et une soirée qui franchirait minuit', async () => {
    await expect(updateIndivSession(db, { sessionId: 9999 }, NOW)).rejects.toThrow(IndivSessionNotFoundError);
    await expect(updateIndivSession(db, { sessionId, startTime: '23:45' }, NOW)).rejects.toThrow(
      InvalidIndivLayoutError
    );
  });

  it('exige un motif pour annuler, et l’efface à la réouverture', async () => {
    await expect(updateIndivSession(db, { sessionId, status: 'cancelled' }, NOW)).rejects.toThrow(
      MissingCancellationReasonError
    );
    const cancelled = await updateIndivSession(
      db,
      { sessionId, status: 'cancelled', cancelledReason: ' Gymnase fermé ' },
      NOW
    );
    expect(cancelled).toMatchObject({ status: 'cancelled', cancelledReason: 'Gymnase fermé' });

    const reopened = await updateIndivSession(db, { sessionId, status: 'open' }, NOW);
    expect(reopened).toMatchObject({ status: 'open', cancelledReason: null });
  });

  it('refuse de resserrer la soirée sous les retenus existants', async () => {
    await seedSelected(1, 2);
    await seedSelected(2, 2);
    // Retirer le second créneau laisserait deux retenus sur un créneau qui n'existe plus.
    await expect(updateIndivSession(db, { sessionId, slotCount: 1 }, NOW)).rejects.toThrow(IndivSlotFullError);
    // Une place par créneau, alors que le second en a deux.
    await expect(updateIndivSession(db, { sessionId, capacityPerSlot: 1 }, NOW)).rejects.toThrow(
      IndivSlotFullError
    );
    // Élargir reste libre.
    await expect(updateIndivSession(db, { sessionId, slotCount: 3 }, NOW)).resolves.toMatchObject({ slotCount: 3 });
  });
});
