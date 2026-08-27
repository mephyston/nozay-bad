import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { type Db } from '@nba/db';
import { saveVenue } from '../save-venue/handler';
import { createScheduleSlot } from '../create-schedule-slot/handler';
import { updateScheduleSlot } from '../update-schedule-slot/handler';
import { listScheduleSlots } from './handler';
import { InvalidSlotTimesError, VenueNotFoundError } from '../shared/errors';

describe('créneaux', () => {
  let db: Db;
  let venueId: number;

  beforeEach(async () => {
    ({ db } = await setupMockDb());
    venueId = (await saveVenue(db, { code: 'pierre-dupuis', name: 'Gymnase Pierre Dupuis' })).id;
  });

  const slot = (over: Partial<Parameters<typeof createScheduleSlot>[1]> = {}) =>
    createScheduleSlot(db, {
      venueId, weekday: 1,
      startTime: '18:00', endTime: '19:30', audience: 'jeunes', ...over
    });

  it('trie par jour puis par heure — l’ordre du tableau affiché', async () => {
    await slot({ weekday: 3, startTime: '14:15', endTime: '15:45' });
    await slot({ weekday: 1, startTime: '19:30', endTime: '21:00' });
    await slot({ weekday: 1, startTime: '18:00', endTime: '19:30' });

    const list = await listScheduleSlots(db);
    expect(list.map((s) => `${s.weekday} ${s.startTime}`)).toEqual(['1 18:00', '1 19:30', '3 14:15']);
  });

  it('joint le gymnase', async () => {
    await slot();
    const [first] = await listScheduleSlots(db);
    expect(first.venue?.name).toBe('Gymnase Pierre Dupuis');
  });

  it('refuse un créneau qui finit avant de commencer', async () => {
    // Un intervalle inversé s'affiche sans erreur et fausse tout le tableau.
    await expect(slot({ startTime: '21:00', endTime: '19:00' })).rejects.toThrow(InvalidSlotTimesError);
  });

  it('refuse un gymnase inexistant', async () => {
    await expect(slot({ venueId: 999 })).rejects.toThrow(VenueNotFoundError);
  });

  it('cache les créneaux désactivés au site, les garde pour l’administration', async () => {
    const created = await slot();
    await updateScheduleSlot(db, { slotId: created.id, active: false });

    expect(await listScheduleSlots(db)).toHaveLength(0);
    expect(await listScheduleSlots(db, { includeInactive: true })).toHaveLength(1);
  });

  it('filtre par public', async () => {
    await slot({ audience: 'minibad' });
    await slot({ audience: 'adultes_loisir', weekday: 2 });
    await slot({ audience: 'jeunes', weekday: 4 });

    expect(await listScheduleSlots(db, { audiences: ['minibad'] })).toHaveLength(1);
    expect(await listScheduleSlots(db, { audiences: ['minibad', 'jeunes'] })).toHaveLength(2);
    expect(await listScheduleSlots(db)).toHaveLength(3);
  });

  it('refuse une modification qui inverserait l’intervalle', async () => {
    // Ne changer qu'une borne peut rendre invalide un créneau jusque-là correct.
    const created = await slot({ startTime: '18:00', endTime: '19:30' });
    await expect(updateScheduleSlot(db, { slotId: created.id, startTime: '20:00' })).rejects.toThrow(
      InvalidSlotTimesError
    );
  });

  it('met à jour un gymnase existant plutôt que d’en créer un second', async () => {
    const again = await saveVenue(db, { code: 'pierre-dupuis', name: 'Gymnase P. Dupuis', city: 'Nozay' });
    expect(again.id).toBe(venueId);
    expect(again.city).toBe('Nozay');
  });
});
