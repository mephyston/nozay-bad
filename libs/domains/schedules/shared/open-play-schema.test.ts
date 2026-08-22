import { describe, it, expect, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { setupMockDb } from '@nba/db/test-utils';
import type { Db } from '@nba/db';
import { venuesTable } from './schema';
import {
  openPlayGuestsTable,
  openPlayOpenersTable,
  openPlayRegistrationsTable,
  openPlaySessionsTable
} from './open-play-schema';

/**
 * Ce que la base garantit d'elle-même.
 *
 * Les handlers portent les règles avec des messages français ; ces contraintes-ci les
 * tiennent contre les écritures concurrentes et contre tout ce qui passerait à côté de
 * l'application. Une cascade non déclarée ne se voit qu'au moment où l'on supprime, et
 * une unicité oubliée ne se voit qu'au double-clic.
 */

const NOW = new Date('2026-03-01T10:00:00Z');

let db: Db;

async function seedSession(overrides: Record<string, unknown> = {}) {
  const [venue] = await db
    .insert(venuesTable)
    .values({ code: 'pierre-dupuis', name: 'Pierre Dupuis', createdAt: NOW })
    .returning();

  const [session] = await db
    .insert(openPlaySessionsTable)
    .values({
      seasonCode: '25-26',
      venueId: venue.id,
      date: '2026-03-21',
      startTime: '14:00',
      endTime: '17:00',
      createdAt: NOW,
      updatedAt: NOW,
      ...overrides
    })
    .returning();

  return { venue, session };
}

async function seedRegistration(sessionId: number, memberId: number, guests: string[] = []) {
  const [registration] = await db
    .insert(openPlayRegistrationsTable)
    .values({
      sessionId,
      memberId,
      licence: `0000000${memberId}`,
      firstName: 'Camille',
      lastName: `Durand${memberId}`,
      email: `camille${memberId}@example.org`,
      createdAt: NOW,
      updatedAt: NOW
    })
    .returning();

  for (const firstName of guests) {
    await db
      .insert(openPlayGuestsTable)
      .values({ registrationId: registration.id, firstName, lastName: 'Martin', createdAt: NOW });
  }

  return registration;
}

beforeEach(async () => {
  ({ db } = await setupMockDb());
});

describe('séances de jeu libre', () => {
  it('naît ouverte, sans ouvreur, avec le seuil du club', async () => {
    const { session } = await seedSession();
    expect(session.status).toBe('open');
    expect(session.minPlayers).toBe(4);
    expect(session.openerLicence).toBeNull();
    expect(session.slotId).toBeNull();
  });

  it('refuse une seconde séance au même endroit, le même jour, à la même heure', async () => {
    const { venue } = await seedSession();
    // C'est cette contrainte qui rendra la génération en lot idempotente : rejouer une
    // période ne doit rien créer, et surtout ne rien écraser.
    await expect(
      db.insert(openPlaySessionsTable).values({
        seasonCode: '25-26',
        venueId: venue.id,
        date: '2026-03-21',
        startTime: '14:00',
        endTime: '17:00',
        createdAt: NOW,
        updatedAt: NOW
      })
    ).rejects.toThrow();
  });

  it('accepte la même heure dans un autre gymnase', async () => {
    await seedSession();
    const [other] = await db
      .insert(venuesTable)
      .values({ code: 'la-source', name: 'La Source', createdAt: NOW })
      .returning();

    const [session] = await db
      .insert(openPlaySessionsTable)
      .values({
        seasonCode: '25-26',
        venueId: other.id,
        date: '2026-03-21',
        startTime: '14:00',
        endTime: '17:00',
        createdAt: NOW,
        updatedAt: NOW
      })
      .returning();

    expect(session.id).toBeGreaterThan(0);
  });
});

describe('inscriptions et invités', () => {
  it("n'accepte qu'une inscription par adhérent et par séance", async () => {
    const { session } = await seedSession();
    await seedRegistration(session.id, 1);
    // Sans cet index, un double-clic sur « Je viens » compterait deux joueurs.
    await expect(seedRegistration(session.id, 1)).rejects.toThrow();
  });

  it('supprime les invités avec leur hôte', async () => {
    const { session } = await seedSession();
    const registration = await seedRegistration(session.id, 1, ['Léa', 'Paul']);

    await db
      .delete(openPlayRegistrationsTable)
      .where(eq(openPlayRegistrationsTable.id, registration.id));

    const guests = await db.select().from(openPlayGuestsTable).all();
    expect(guests).toEqual([]);
  });

  it('supprime inscriptions ET invités avec la séance', async () => {
    // Cascade à deux niveaux : c'est ce test qui la verrouille. Sans le second maillon,
    // supprimer une séance laisserait des invités orphelins que plus rien ne compte.
    const { session } = await seedSession();
    await seedRegistration(session.id, 1, ['Léa', 'Paul']);
    await seedRegistration(session.id, 2, ['Anne']);

    await db.delete(openPlaySessionsTable).where(eq(openPlaySessionsTable.id, session.id));

    expect(await db.select().from(openPlayRegistrationsTable).all()).toEqual([]);
    expect(await db.select().from(openPlayGuestsTable).all()).toEqual([]);
  });

  it('accepte plusieurs invités homonymes sous un même hôte', async () => {
    // Pas d'unicité sur les invités, délibérément : deux frères peuvent porter le même
    // prénom d'usage, et la liste est de toute façon remplacée en bloc.
    const { session } = await seedSession();
    await seedRegistration(session.id, 1, ['Léa', 'Léa']);
    expect(await db.select().from(openPlayGuestsTable).all()).toHaveLength(2);
  });
});

describe('créneau récurrent supprimé', () => {
  it('laisse la séance et ses inscrits, en détachant le créneau', async () => {
    const { venue } = await seedSession();
    const { scheduleSlotsTable } = await import('./schema');
    const [slot] = await db
      .insert(scheduleSlotsTable)
      .values({
        seasonCode: '25-26',
        venueId: venue.id,
        weekday: 6,
        startTime: '14:00',
        endTime: '17:00',
        audience: 'jeu_libre',
        createdAt: NOW
      })
      .returning();

    const [generated] = await db
      .insert(openPlaySessionsTable)
      .values({
        seasonCode: '25-26',
        venueId: venue.id,
        slotId: slot.id,
        date: '2026-03-28',
        startTime: '14:00',
        endTime: '17:00',
        createdAt: NOW,
        updatedAt: NOW
      })
      .returning();
    await seedRegistration(generated.id, 1);

    await db.delete(scheduleSlotsTable).where(eq(scheduleSlotsTable.id, slot.id));

    const [kept] = await db
      .select()
      .from(openPlaySessionsTable)
      .where(eq(openPlaySessionsTable.id, generated.id))
      .all();
    expect(kept.slotId).toBeNull();
    expect(await db.select().from(openPlayRegistrationsTable).all()).toHaveLength(1);
  });
});

describe('liste des ouvreurs', () => {
  it('ne désigne pas deux fois la même personne sur une saison', async () => {
    await db
      .insert(openPlayOpenersTable)
      .values({ seasonCode: '25-26', licence: '00000001', createdAt: NOW });

    await expect(
      db
        .insert(openPlayOpenersTable)
        .values({ seasonCode: '25-26', licence: '00000001', createdAt: NOW })
    ).rejects.toThrow();
  });

  it('accepte la même personne sur une autre saison', async () => {
    await db
      .insert(openPlayOpenersTable)
      .values({ seasonCode: '25-26', licence: '00000001', createdAt: NOW });
    const [next] = await db
      .insert(openPlayOpenersTable)
      .values({ seasonCode: '26-27', licence: '00000001', createdAt: NOW })
      .returning();

    expect(next.id).toBeGreaterThan(0);
  });
});
