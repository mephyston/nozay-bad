import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { type Db } from '@nba/db';
import { createEvent } from '../create-event/handler';
import { updateEvent } from '../update-event/handler';
import { listEvents } from './handler';
import { InvalidEventDatesError } from '../shared/errors';

const NOW = new Date('2026-06-15T12:00:00Z');

describe('agenda', () => {
  let db: Db;

  beforeEach(async () => {
    ({ db } = await setupMockDb());
  });

  const event = (over: Partial<Parameters<typeof createEvent>[1]> = {}) =>
    createEvent(db, {
      title: 'Tournoi interne', startsAt: '2026-09-20T09:00', category: 'tournoi', ...over
    });

  it('crée en brouillon, avec un slug daté', async () => {
    // Deux stages portent le même nom d'une année sur l'autre : la date les sépare.
    const created = await event({ title: 'Stage jeunes', startsAt: '2026-10-20T09:00', category: 'stage' });
    expect(created.slug).toBe('stage-jeunes-2026-10-20');
    expect(created.status).toBe('draft');
  });

  it('ne montre que les événements publiés et à venir', async () => {
    const passe = await event({ title: 'Passé', startsAt: '2026-01-10T09:00' });
    const futur = await event({ title: 'Futur', startsAt: '2026-09-20T09:00' });
    await updateEvent(db, { eventId: passe.id, status: 'published' });
    await updateEvent(db, { eventId: futur.id, status: 'published' });
    await event({ title: 'Brouillon', startsAt: '2026-09-25T09:00' });

    expect((await listEvents(db, {}, NOW)).map((e) => e.title)).toEqual(['Futur']);
    expect((await listEvents(db, { includePast: true }, NOW)).map((e) => e.title)).toEqual(['Passé', 'Futur']);
  });

  it('garde un événement du jour affiché jusqu’à minuit', async () => {
    // Une compétition ne disparaît pas de l'affiche à son heure de début.
    const today = await event({ title: "Aujourd'hui", startsAt: '2026-06-15T09:00' });
    await updateEvent(db, { eventId: today.id, status: 'published' });
    expect((await listEvents(db, {}, NOW)).map((e) => e.title)).toEqual(["Aujourd'hui"]);
  });

  it('refuse une fin antérieure au début', async () => {
    await expect(
      event({ startsAt: '2026-09-20T18:00', endsAt: '2026-09-20T09:00' })
    ).rejects.toThrow(InvalidEventDatesError);
  });

  it('rejette un lien sortant dangereux au lieu de le nettoyer à l’affichage', async () => {
    const created = await event({ externalUrl: 'javascript:alert(1)' });
    expect(created.externalUrl).toBeNull();
    const safe = await event({ title: 'Autre', externalUrl: 'https://badnet.fr/x', startsAt: '2026-09-21T09:00' });
    expect(safe.externalUrl).toBe('https://badnet.fr/x');
  });

  it('assainit la description', async () => {
    const created = await event({ descriptionHtml: '<h2>Programme</h2><script>alert(1)</script>' });
    expect(created.descriptionHtml).toBe('<h2>Programme</h2>');
  });

  it('annule sans supprimer : la page reste et porte l’information', async () => {
    const created = await event();
    const cancelled = await updateEvent(db, { eventId: created.id, status: 'cancelled' });
    expect(cancelled.status).toBe('cancelled');
    // Un événement annulé n'apparaît plus dans l'agenda public.
    expect(await listEvents(db, {}, NOW)).toHaveLength(0);
  });

  it('refuse deux événements à la même adresse', async () => {
    await event();
    await expect(event()).rejects.toThrow(/adresse/);
  });
});
