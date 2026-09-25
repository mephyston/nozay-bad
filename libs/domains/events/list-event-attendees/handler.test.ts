import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { type Db } from '@nba/db';
import { createEvent } from '../create-event/handler';
import { updateEvent } from '../update-event/handler';
import { registerToEvent } from '../register-to-event/handler';
import { listEventAttendees } from './handler';
import { ClubEventNotFoundError } from '../shared/errors';

const NOW = new Date('2026-06-15T12:00:00Z');

describe('« Voir qui vient » d’un rendez-vous', () => {
  let db: Db;

  beforeEach(async () => {
    ({ db } = await setupMockDb());
  });

  async function event(
    over: { status?: 'draft' | 'published' | 'cancelled'; registration?: 'none' | 'open' | 'closed' } = {},
    title = 'Soirée raclette'
  ) {
    const created = await createEvent(db, { title, startsAt: '2026-09-20T20:00', category: 'vie_du_club' });
    return updateEvent(db, { eventId: created.id, status: 'published', registration: 'open', ...over });
  }

  it('rend les noms par ordre alphabétique et le nombre d’accompagnants, rien de plus', async () => {
    const { id } = await event();
    await registerToEvent(db, { eventId: id, memberId: 1, firstName: 'Alice', lastName: 'Durand', email: 'alice@example.org', guests: 2 }, NOW);
    await registerToEvent(db, { eventId: id, memberId: 2, firstName: 'Bruno', lastName: 'Amiot', email: 'bruno@example.org' }, NOW);

    const result = await listEventAttendees(db, { eventId: id });

    // Ni adresse, ni identifiant d'adhésion : la projection est exactement celle-ci.
    expect(result.attendees).toEqual([
      { firstName: 'Bruno', lastName: 'Amiot', guests: 0 },
      { firstName: 'Alice', lastName: 'Durand', guests: 2 }
    ]);
    expect(result.totals).toEqual({ members: 2, guests: 2, people: 4 });
  });

  it('reste lisible une fois les inscriptions closes', async () => {
    const { id } = await event();
    await registerToEvent(db, { eventId: id, memberId: 1, firstName: 'Alice', lastName: 'Durand', email: 'alice@example.org' }, NOW);
    await updateEvent(db, { eventId: id, registration: 'closed' });

    expect((await listEventAttendees(db, { eventId: id })).attendees).toHaveLength(1);
  });

  it('ne montre rien d’un brouillon ni d’un rendez-vous sans inscription', async () => {
    const brouillon = await event({ status: 'draft' });
    const sansInscription = await event({ registration: 'none' }, 'Tournoi de Nozay');

    await expect(listEventAttendees(db, { eventId: brouillon.id })).rejects.toBeInstanceOf(ClubEventNotFoundError);
    await expect(listEventAttendees(db, { eventId: sansInscription.id })).rejects.toBeInstanceOf(ClubEventNotFoundError);
    await expect(listEventAttendees(db, { eventId: 999 })).rejects.toBeInstanceOf(ClubEventNotFoundError);
  });
});
