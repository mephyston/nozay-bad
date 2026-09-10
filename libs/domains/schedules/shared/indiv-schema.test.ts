import { describe, it, expect, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { setupMockDb } from '@nba/db/test-utils';
import type { Db } from '@nba/db';
import { venuesTable } from './schema';
import { indivRequestsTable, indivSessionsTable } from './indiv-schema';

/**
 * Ce que la base garantit d'elle-même pour les séances individuelles : les défauts qui
 * encodent l'habitude du club, l'unicité qui rend la génération et la candidature
 * idempotentes, et la cascade qui emporte les candidatures avec leur soirée.
 */

const NOW = new Date('2026-03-01T10:00:00Z');

let db: Db;

async function seedSession(overrides: Record<string, unknown> = {}) {
  const [venue] = await db
    .insert(venuesTable)
    .values({ code: 'pierre-dupuis', name: 'Pierre Dupuis', createdAt: NOW })
    .returning();

  const [session] = await db
    .insert(indivSessionsTable)
    .values({ venueId: venue.id, date: '2026-03-17', startTime: '19:30', createdAt: NOW, updatedAt: NOW, ...overrides })
    .returning();

  return { venue, session };
}

function request(sessionId: number, memberId: number) {
  return {
    sessionId,
    memberId,
    licence: `0000000${memberId}`,
    firstName: 'Camille',
    lastName: `Durand${memberId}`,
    email: `camille${memberId}@example.org`,
    memberGroup: 'Compétiteurs adultes',
    createdAt: NOW,
    updatedAt: NOW
  };
}

beforeEach(async () => {
  ({ db } = await setupMockDb());
});

describe('indiv_sessions', () => {
  it('encode l’habitude du club dans ses défauts', async () => {
    const { session } = await seedSession();
    expect(session.slotCount).toBe(2);
    expect(session.slotMinutes).toBe(30);
    expect(session.capacityPerSlot).toBe(2);
    expect(session.status).toBe('open');
    expect(session.announcedAt).toBeNull();
  });

  it('refuse deux soirées à la même date, même gymnase, même heure', async () => {
    const { venue } = await seedSession();
    await expect(
      db.insert(indivSessionsTable).values({ venueId: venue.id, date: '2026-03-17', startTime: '19:30', createdAt: NOW, updatedAt: NOW })
    ).rejects.toThrow();
  });
});

describe('indiv_requests', () => {
  it('n’admet qu’une candidature par adhérent et par soirée', async () => {
    const { session } = await seedSession();
    await db.insert(indivRequestsTable).values(request(session.id, 7));
    await expect(db.insert(indivRequestsTable).values(request(session.id, 7))).rejects.toThrow();
  });

  it('emporte les candidatures avec la soirée supprimée', async () => {
    const { session } = await seedSession();
    await db.insert(indivRequestsTable).values(request(session.id, 7));
    await db.delete(indivSessionsTable).where(eq(indivSessionsTable.id, session.id));
    const left = await db.select().from(indivRequestsTable).all();
    expect(left).toHaveLength(0);
  });

  it('ne retient personne par défaut', async () => {
    const { session } = await seedSession();
    const [row] = await db.insert(indivRequestsTable).values(request(session.id, 7)).returning();
    expect(row.selectedSlot).toBeNull();
    expect(row.preferredSlot).toBeNull();
  });
});
