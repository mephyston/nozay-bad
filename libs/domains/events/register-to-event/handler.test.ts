import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { type Db } from '@nba/db';
import { createEvent } from '../create-event/handler';
import { updateEvent } from '../update-event/handler';
import { listEvents } from '../list-events/handler';
import { listEventRegistrations } from '../list-event-registrations/handler';
import { registerToEvent } from './handler';
import { unregisterFromEvent } from '../unregister-from-event/handler';
import {
  ClubEventNotFoundError,
  EventAlreadyPassedError,
  RegistrationsNotOpenError
} from '../shared/errors';

const NOW = new Date('2026-06-15T12:00:00Z');

const ALICE = { memberId: 1, firstName: 'Alice', lastName: 'Durand', email: 'alice@example.org' };
const BRUNO = { memberId: 2, firstName: 'Bruno', lastName: 'Amiot', email: 'bruno@example.org' };

describe('inscriptions aux événements', () => {
  let db: Db;

  beforeEach(async () => {
    ({ db } = await setupMockDb());
  });

  /** Un événement en ligne, inscriptions ouvertes — le cas courant. */
  async function openEvent(over: Record<string, unknown> = {}) {
    const created = await createEvent(db, {
      title: 'Soirée raclette',
      startsAt: '2026-09-20T20:00',
      category: 'vie_du_club',
      ...over
    });
    return updateEvent(db, { eventId: created.id, status: 'published', registration: 'open' });
  }

  it('enregistre un adhérent et ses accompagnants', async () => {
    const event = await openEvent();
    const registration = await registerToEvent(db, { eventId: event.id, ...ALICE, guests: 2 }, NOW);

    expect(registration.guests).toBe(2);
    // L'identité est recopiée : c'est ce que le bureau lira, sans jointure.
    expect(registration.lastName).toBe('Durand');
    expect(registration.email).toBe('alice@example.org');
  });

  it('normalise l’e-mail et élague les espaces du nom', async () => {
    const event = await openEvent();
    const registration = await registerToEvent(
      db,
      { eventId: event.id, ...ALICE, firstName: '  Alice  ', email: 'Alice@Example.ORG' },
      NOW
    );
    expect(registration.firstName).toBe('Alice');
    expect(registration.email).toBe('alice@example.org');
  });

  it('se réinscrire met à jour, sans créer de doublon', async () => {
    // C'est la garantie du double-clic : deux appels, une seule ligne.
    const event = await openEvent();
    await registerToEvent(db, { eventId: event.id, ...ALICE, guests: 2 }, NOW);
    await registerToEvent(db, { eventId: event.id, ...ALICE, guests: 1 }, NOW);

    const { registrations, totals } = await listEventRegistrations(db, { eventId: event.id });
    expect(registrations).toHaveLength(1);
    expect(registrations[0].guests).toBe(1);
    expect(totals).toEqual({ members: 1, guests: 1, people: 2 });
  });

  it('compte les couverts : les inscrits et leurs accompagnants', async () => {
    const event = await openEvent();
    await registerToEvent(db, { eventId: event.id, ...ALICE, guests: 2 }, NOW);
    await registerToEvent(db, { eventId: event.id, ...BRUNO }, NOW);

    const { totals } = await listEventRegistrations(db, { eventId: event.id });
    expect(totals).toEqual({ members: 2, guests: 2, people: 4 });
  });

  it('classe la liste par nom de famille : c’est une liste d’appel', async () => {
    const event = await openEvent();
    await registerToEvent(db, { eventId: event.id, ...ALICE }, NOW);
    await registerToEvent(db, { eventId: event.id, ...BRUNO }, NOW);

    const { registrations } = await listEventRegistrations(db, { eventId: event.id });
    expect(registrations.map((r) => r.lastName)).toEqual(['Amiot', 'Durand']);
  });

  it('refuse un événement sans inscription, ou dont les inscriptions sont closes', async () => {
    const sansInscription = await createEvent(db, {
      title: 'Interclubs', startsAt: '2026-09-21T09:00', category: 'interclubs'
    });
    await updateEvent(db, { eventId: sansInscription.id, status: 'published' });
    await expect(
      registerToEvent(db, { eventId: sansInscription.id, ...ALICE }, NOW)
    ).rejects.toThrow(RegistrationsNotOpenError);

    const event = await openEvent({ title: 'Stage', startsAt: '2026-09-22T09:00', category: 'stage' });
    await updateEvent(db, { eventId: event.id, registration: 'closed' });
    await expect(registerToEvent(db, { eventId: event.id, ...ALICE }, NOW)).rejects.toThrow(
      RegistrationsNotOpenError
    );
  });

  it('refuse un événement en brouillon, même inscriptions ouvertes', async () => {
    // Le brouillon n'est pas censé être visible : ouvrir ses inscriptions par avance ne
    // doit pas offrir une porte dérobée à qui devine son identifiant.
    const created = await createEvent(db, {
      title: 'Assemblée', startsAt: '2026-09-23T19:00', category: 'assemblee'
    });
    await updateEvent(db, { eventId: created.id, registration: 'open' });
    await expect(registerToEvent(db, { eventId: created.id, ...ALICE }, NOW)).rejects.toThrow(
      RegistrationsNotOpenError
    );
  });

  it('refuse un événement passé, mais laisse la journée entière', async () => {
    const passe = await openEvent({ title: 'Passé', startsAt: '2026-01-10T20:00' });
    await expect(registerToEvent(db, { eventId: passe.id, ...ALICE }, NOW)).rejects.toThrow(
      EventAlreadyPassedError
    );

    // Le jour même reste ouvert jusqu'à minuit, comme l'affichage de l'agenda.
    const aujourdhui = await openEvent({ title: "Ce soir", startsAt: '2026-06-15T20:00' });
    await expect(registerToEvent(db, { eventId: aujourdhui.id, ...ALICE }, NOW)).resolves.toBeTruthy();
  });

  it('refuse un événement inexistant', async () => {
    await expect(registerToEvent(db, { eventId: 9999, ...ALICE }, NOW)).rejects.toThrow(
      ClubEventNotFoundError
    );
  });

  describe('désinscription', () => {
    it('retire l’inscription tant que c’est ouvert', async () => {
      const event = await openEvent();
      await registerToEvent(db, { eventId: event.id, ...ALICE }, NOW);

      expect(await unregisterFromEvent(db, { eventId: event.id, memberId: ALICE.memberId })).toEqual({
        removed: true
      });
      const { totals } = await listEventRegistrations(db, { eventId: event.id });
      expect(totals.people).toBe(0);
    });

    it('ne se plaint pas d’une inscription absente', async () => {
      // L'appelant demande un état — « je ne viens pas » —, et cet état est atteint.
      const event = await openEvent();
      expect(await unregisterFromEvent(db, { eventId: event.id, memberId: 42 })).toEqual({
        removed: false
      });
    });

    it('refuse une fois les inscriptions closes : la liste est arrêtée', async () => {
      const event = await openEvent();
      await registerToEvent(db, { eventId: event.id, ...ALICE }, NOW);
      await updateEvent(db, { eventId: event.id, registration: 'closed' });

      await expect(
        unregisterFromEvent(db, { eventId: event.id, memberId: ALICE.memberId })
      ).rejects.toThrow(RegistrationsNotOpenError);
    });
  });

  describe('agenda', () => {
    it('porte les compteurs, et aucun nom', async () => {
      const event = await openEvent();
      await registerToEvent(db, { eventId: event.id, ...ALICE, guests: 2 }, NOW);
      await registerToEvent(db, { eventId: event.id, ...BRUNO }, NOW);

      const [listed] = await listEvents(db, {}, NOW);
      expect(listed.registrationCount).toBe(2);
      expect(listed.attendeeCount).toBe(4);
      // Le site public et l'espace adhérent lisent cette route sans identité : elle ne
      // doit rien porter de nominatif.
      expect(JSON.stringify(listed)).not.toContain('Durand');
    });

    it('compte zéro pour un événement sans inscrit', async () => {
      await openEvent();
      const [listed] = await listEvents(db, {}, NOW);
      expect(listed.registrationCount).toBe(0);
      expect(listed.attendeeCount).toBe(0);
    });

    it('dit à l’adhérent où il en est, et seulement à lui', async () => {
      const event = await openEvent();
      await registerToEvent(db, { eventId: event.id, ...ALICE, guests: 2 }, NOW);

      const [pourAlice] = await listEvents(db, { memberId: ALICE.memberId }, NOW);
      expect(pourAlice.myGuests).toBe(2);

      const [pourBruno] = await listEvents(db, { memberId: BRUNO.memberId }, NOW);
      expect(pourBruno.myGuests).toBeNull();

      // Sans adhérent nommé, la lecture ne dit rien de personne.
      const [anonyme] = await listEvents(db, {}, NOW);
      expect(anonyme.myGuests).toBeNull();
    });

    it('distingue « vient seul » de « pas inscrit »', async () => {
      // Zéro accompagnant et absence d'inscription se ressemblent, et ne doivent pas se
      // confondre : c'est ce qui décide du libellé du bouton.
      const event = await openEvent();
      await registerToEvent(db, { eventId: event.id, ...ALICE, guests: 0 }, NOW);
      const [listed] = await listEvents(db, { memberId: ALICE.memberId }, NOW);
      expect(listed.myGuests).toBe(0);
      expect(listed.myGuests).not.toBeNull();
    });
  });

  it('supprimer un événement emporte ses inscriptions', async () => {
    const event = await openEvent();
    await registerToEvent(db, { eventId: event.id, ...ALICE }, NOW);
    await db.run(`DELETE FROM club_events WHERE id = ${event.id}` as never);

    await expect(listEventRegistrations(db, { eventId: event.id })).rejects.toThrow(
      ClubEventNotFoundError
    );
  });
});
