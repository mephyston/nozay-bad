import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import type { Db } from '@nba/db';
import { venuesTable } from '../../shared/schema';
import { indivRequestsTable, indivSessionsTable } from '../../shared/indiv-schema';
import { listIndivSessions } from './handler';

const NOW = new Date('2026-03-14T10:00:00Z');

let db: Db;
let venueId: number;

async function seedSession(overrides: Record<string, unknown> = {}): Promise<number> {
  const [session] = await db
    .insert(indivSessionsTable)
    .values({ venueId, date: '2026-03-17', startTime: '19:30', createdAt: NOW, updatedAt: NOW, ...overrides })
    .returning();
  return session.id;
}

async function seedRequest(sessionId: number, memberId: number, over: Record<string, unknown> = {}) {
  await db.insert(indivRequestsTable).values({
    sessionId,
    memberId,
    licence: `0000000${memberId}`,
    firstName: ['', 'Alice', 'Bob', 'Chloé'][memberId],
    lastName: ['', 'Durand', 'Martin', 'Petit'][memberId],
    email: `m${memberId}@example.org`,
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

describe('liste des soirées', () => {
  it('dérive la fin et les créneaux, et compte candidats et retenus', async () => {
    const id = await seedSession();
    await seedRequest(id, 1, { selectedSlot: 1 });
    await seedRequest(id, 2);

    const { sessions } = await listIndivSessions(db, {}, NOW);
    expect(sessions[0]).toMatchObject({
      endTime: '20:30',
      slots: [
        { index: 1, startTime: '19:30', endTime: '20:00' },
        { index: 2, startTime: '20:00', endTime: '20:30' }
      ],
      requestCount: 2,
      selectedCount: 1,
      venue: { name: 'Pierre Dupuis' },
      myRequest: null
    });
  });

  it('ne laisse sortir aucun nom avant l’annonce, puis seulement les retenus', async () => {
    const id = await seedSession();
    await seedRequest(id, 1, { selectedSlot: 1 });
    await seedRequest(id, 2, { selectedSlot: 2 });
    await seedRequest(id, 3);

    const before = await listIndivSessions(db, {}, NOW);
    expect(before.sessions[0].selectedNames).toEqual({});
    expect(JSON.stringify(before)).not.toContain('Durand');

    await db.update(indivSessionsTable).set({ status: 'announced', announcedAt: NOW });
    const after = await listIndivSessions(db, {}, NOW);
    expect(after.sessions[0].selectedNames).toEqual({ 1: ['Alice D.'], 2: ['Bob M.'] });
    expect(JSON.stringify(after)).not.toContain('Chloé');
  });

  it('rend ma candidature au nom du profil actif', async () => {
    const id = await seedSession();
    await seedRequest(id, 2, { preferredSlot: 2, note: 'le service' });

    const { sessions } = await listIndivSessions(db, { memberId: 2 }, NOW);
    expect(sessions[0].myRequest).toEqual({ preferredSlot: 2, note: 'le service', selectedSlot: null });
  });

  it('dit si le lecteur peut candidater d’après son groupe', async () => {
    expect((await listIndivSessions(db, { group: 'Compétiteurs adultes' }, NOW)).eligible).toBe(true);
    expect((await listIndivSessions(db, { group: 'Loisirs 1 (Lundi)' }, NOW)).eligible).toBe(false);
    expect((await listIndivSessions(db, {}, NOW)).eligible).toBe(false);
  });

  it('ne montre que la prochaine soirée non annulée quand on le lui demande', async () => {
    await seedSession({ date: '2026-03-12' }); // passée
    await seedSession({ date: '2026-03-17', status: 'cancelled', cancelledReason: 'Gymnase fermé' });
    await seedSession({ date: '2026-03-19' });
    await seedSession({ date: '2026-03-24' });

    const { sessions } = await listIndivSessions(db, { includeCancelled: false, limit: 1 }, NOW);
    expect(sessions.map((s) => s.date)).toEqual(['2026-03-19']);

    // Sans le filtre, la soirée annulée reste visible, barrée.
    const all = await listIndivSessions(db, {}, NOW);
    expect(all.sessions.map((s) => s.date)).toEqual(['2026-03-17', '2026-03-19', '2026-03-24']);
  });
});
