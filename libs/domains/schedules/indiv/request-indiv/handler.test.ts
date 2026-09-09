import { describe, it, expect, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { setupMockDb } from '@nba/db/test-utils';
import type { Db } from '@nba/db';
import { venuesTable } from '../../shared/schema';
import { indivRequestsTable, indivSessionsTable } from '../../shared/indiv-schema';
import {
  IndivSessionAnnouncedError,
  IndivSessionCancelledError,
  IndivSessionNotFoundError,
  IndivSessionPassedError,
  InvalidIndivSlotError,
  NotIndivEligibleError
} from '../../shared/errors';
import { createIndivSession } from '../create-indiv-session/handler';
import { requestIndiv } from './handler';

const NOW = new Date('2026-03-14T10:00:00Z');

let db: Db;
let sessionId: number;

const CAMILLE = {
  memberId: 7,
  licence: '07051876',
  firstName: 'Camille',
  lastName: 'Durand',
  email: 'Camille@Example.org',
  memberGroup: 'Compétiteurs adultes'
};

beforeEach(async () => {
  ({ db } = await setupMockDb());
  const [venue] = await db
    .insert(venuesTable)
    .values({ code: 'pierre-dupuis', name: 'Pierre Dupuis', createdAt: NOW })
    .returning();
  sessionId = (await createIndivSession(db, { venueId: venue.id, date: '2026-03-17', startTime: '19:30' }, NOW)).id;
});

describe('candidature', () => {
  it('enregistre la demande, identité recopiée, sans décision', async () => {
    const request = await requestIndiv(db, { sessionId, ...CAMILLE, preferredSlot: 2, note: ' le service ' }, NOW);
    expect(request).toMatchObject({
      memberId: 7,
      email: 'camille@example.org',
      memberGroup: 'Compétiteurs adultes',
      preferredSlot: 2,
      note: 'le service',
      selectedSlot: null
    });
  });

  it('recandidater met à jour sans doubler ni toucher à la décision', async () => {
    await requestIndiv(db, { sessionId, ...CAMILLE, preferredSlot: 1 }, NOW);
    await db.update(indivRequestsTable).set({ selectedSlot: 1 }).where(eq(indivRequestsTable.memberId, 7));

    const again = await requestIndiv(db, { sessionId, ...CAMILLE, preferredSlot: 2 }, NOW);

    expect(again).toMatchObject({ preferredSlot: 2, selectedSlot: 1 });
    expect(await db.select().from(indivRequestsTable).all()).toHaveLength(1);
  });

  it('refuse les groupes non compétiteurs — c’est le handler qui tranche', async () => {
    await expect(
      requestIndiv(db, { sessionId, ...CAMILLE, memberGroup: 'Loisirs 1 (Lundi)' }, NOW)
    ).rejects.toThrow(NotIndivEligibleError);
  });

  it('refuse un créneau qui n’existe pas sur la soirée', async () => {
    await expect(requestIndiv(db, { sessionId, ...CAMILLE, preferredSlot: 3 }, NOW)).rejects.toThrow(
      InvalidIndivSlotError
    );
  });

  it('refuse, dans l’ordre, une soirée inconnue, annulée, annoncée ou passée', async () => {
    await expect(requestIndiv(db, { sessionId: 999, ...CAMILLE }, NOW)).rejects.toThrow(IndivSessionNotFoundError);

    await db.update(indivSessionsTable).set({ status: 'cancelled', cancelledReason: 'Gymnase fermé' });
    await expect(requestIndiv(db, { sessionId, ...CAMILLE }, NOW)).rejects.toThrow(IndivSessionCancelledError);

    await db.update(indivSessionsTable).set({ status: 'announced', cancelledReason: null });
    await expect(requestIndiv(db, { sessionId, ...CAMILLE }, NOW)).rejects.toThrow(IndivSessionAnnouncedError);

    await db.update(indivSessionsTable).set({ status: 'open' });
    await expect(
      requestIndiv(db, { sessionId, ...CAMILLE }, new Date('2026-03-18T10:00:00Z'))
    ).rejects.toThrow(IndivSessionPassedError);
  });
});
