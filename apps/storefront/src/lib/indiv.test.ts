import { describe, it, expect } from 'vitest';
import { formatSlot, indivStatusLabel, type IndivSession } from './indiv';

function session(over: Partial<IndivSession> = {}): IndivSession {
  return {
    id: 1,
    date: '2026-03-17',
    startTime: '19:30',
    endTime: '20:30',
    slotCount: 2,
    capacityPerSlot: 2,
    status: 'open',
    label: null,
    notes: null,
    cancelledReason: null,
    venue: null,
    slots: [
      { index: 1, startTime: '19:30', endTime: '20:00' },
      { index: 2, startTime: '20:00', endTime: '20:30' }
    ],
    requestCount: 0,
    selectedCount: 0,
    myRequest: null,
    selectedNames: {},
    ...over
  };
}

describe('état lisible d’une soirée', () => {
  it('compte les candidats face aux places', () => {
    expect(indivStatusLabel(session())).toEqual({ text: 'Aucun candidat pour le moment', tone: 'pending' });
    expect(indivStatusLabel(session({ requestCount: 3 }))).toEqual({ text: '3 candidats pour 4 places', tone: 'pending' });
  });

  it('dit quand les retenus sont annoncés, et pourquoi une soirée est annulée', () => {
    expect(indivStatusLabel(session({ status: 'announced', requestCount: 5, selectedCount: 4 })).tone).toBe('ok');
    expect(indivStatusLabel(session({ status: 'cancelled', cancelledReason: 'Gymnase fermé' }))).toEqual({
      text: 'Gymnase fermé',
      tone: 'off'
    });
  });

  it('écrit le créneau comme l’annonce', () => {
    expect(formatSlot({ index: 1, startTime: '19:30', endTime: '20:00' })).toBe('19h30-20h00');
  });
});
