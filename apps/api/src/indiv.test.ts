import { describe, it, expect, beforeEach } from 'vitest';
import { asc } from 'drizzle-orm';
import { setupMockDb } from '@nba/db/test-utils';
import { insertMemberFixture } from '@nba/members/test-fixtures';
import { pushMessagesTable } from '../../../libs/domains/notifications/shared/schema';
import { updateClubFeatures } from '@nba/club';
import { forgetIsolateFeatures } from './club-features';
import {
  indivRequestsTable,
  indivSessionsTable,
  venuesTable
} from '../../../libs/domains/schedules/shared/schema';
import { app } from './index';
import { seedTestAdmin, TEST_ADMIN_EMAIL } from './authz/test-identity';

/**
 * L'annonce composée : le domaine ferme la soirée, l'app prévient retenus et non retenus.
 *
 * Passe par l'application entière — clé, drapeau, autorisation, ordre de montage — parce
 * que c'est l'ordre des routeurs sur `/schedules` qui est en jeu : monté après le domaine,
 * le composite serait inaccessible.
 */

const KEY = 'secret123';
const ADMIN = { 'x-api-key': KEY, 'x-caller': 'admin', 'x-user-email': TEST_ADMIN_EMAIL };
const NOW = new Date('2026-03-16T18:00:00Z');

let mockD1: any;
let db: any;
let sessionId: number;

async function seedRequest(memberId: number, licence: string, selectedSlot: number | null) {
  await db.insert(indivRequestsTable).values({
    sessionId,
    memberId,
    licence,
    firstName: 'C',
    lastName: licence,
    email: `${licence}@example.org`,
    memberGroup: 'Compétiteurs adultes',
    selectedSlot,
    createdAt: NOW,
    updatedAt: NOW
  });
}

beforeEach(async () => {
  ({ mockD1, db } = await setupMockDb());
  // Le cache des fonctionnalités vit à l'échelle de l'isolate : un test qui a éteint
  // les indiv le laisserait sinon au suivant.
  forgetIsolateFeatures();
  await seedTestAdmin(db);
  const [venue] = await db
    .insert(venuesTable)
    .values({ code: 'pierre-dupuis', name: 'Pierre Dupuis', createdAt: NOW })
    .returning();
  const [session] = await db
    .insert(indivSessionsTable)
    .values({ venueId: venue.id, date: '2026-03-17', startTime: '19:30', createdAt: NOW, updatedAt: NOW })
    .returning();
  sessionId = session.id;

  // Trois candidats connus du fichier des adhérents, dont un mineur joignable par un parent.
  const alice = await insertMemberFixture(db, { licence: '00000001', seasonId: 1, email: 'alice@example.org' });
  const bob = await insertMemberFixture(db, { licence: '00000002', seasonId: 1, email: null, parent1Email: 'parent@example.org' });
  const chloe = await insertMemberFixture(db, { licence: '00000003', seasonId: 1, email: 'chloe@example.org' });
  await seedRequest(alice.id, '00000001', 1);
  await seedRequest(bob.id, '00000002', 2);
  await seedRequest(chloe.id, '00000003', null);
});

const announce = () =>
  app.request(
    `http://localhost/schedules/indiv/${sessionId}/announce`,
    { method: 'POST', headers: ADMIN },
    { DB: mockD1, INTERNAL_API_KEY: KEY }
  );

describe('POST /schedules/indiv/:id/announce', () => {
  it('ferme la soirée et met en file un message par créneau retenu, plus un pour les autres', async () => {
    const res = await announce();
    expect(res.status).toBe(200);
    const { data } = (await res.json()) as any;
    expect(data.session.status).toBe('announced');
    expect(data.reannounced).toBe(false);

    const messages = await db.select().from(pushMessagesTable).orderBy(asc(pushMessagesTable.id)).all();
    expect(messages.map((m: any) => m.category)).toEqual(['indiv', 'indiv', 'indiv']);
    expect(messages.map((m: any) => m.source.replace(/:\d+$/, ''))).toEqual([
      `indiv:announce:selected:${sessionId}`,
      `indiv:announce:selected:${sessionId}`,
      `indiv:announce:declined:${sessionId}`
    ]);
    expect(messages[0].title).toContain('mardi 17 mars');
    expect(messages[0].body).toContain('Créneau 1 (19h30-20h00)');
    expect(messages[1].body).toContain('Créneau 2 (20h00-20h30)');
    expect(messages[2].title).toContain('pas cette fois');
    expect(messages.every((m: any) => m.url === '/indiv')).toBe(true);
  });

  it('signale une mise à jour quand la soirée était déjà annoncée', async () => {
    await announce();
    const res = await announce();
    const { data } = (await res.json()) as any;
    expect(data.reannounced).toBe(true);
    const messages = await db.select().from(pushMessagesTable).all();
    expect(messages.filter((m: any) => m.title.includes('(mise à jour)'))).toHaveLength(3);
  });

  it('refuse d’annoncer sans retenu, et ne met rien en file', async () => {
    await db.update(indivRequestsTable).set({ selectedSlot: null });
    const res = await announce();
    expect(res.status).toBe(409);
    expect(await db.select().from(pushMessagesTable).all()).toHaveLength(0);
  });

  it('est introuvable quand le club a éteint les séances individuelles', async () => {
    await updateClubFeatures(db, { indiv: false }, 'a@b.c');
    forgetIsolateFeatures();
    const res = await app.request(
      `http://localhost/schedules/indiv/${sessionId}/announce`,
      { method: 'POST', headers: ADMIN },
      { DB: mockD1, INTERNAL_API_KEY: KEY }
    );
    expect(res.status).toBe(404);
  });
});
