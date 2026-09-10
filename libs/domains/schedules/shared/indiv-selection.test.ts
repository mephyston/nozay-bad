import { describe, it, expect } from 'vitest';
import { ageAt, announcementText, proposeSelection, rankCandidates } from './indiv-selection';

const c = (requestId: number, over: Partial<{ age: number | null; selectedCount: number; requestedAt: number; preferredSlot: number | null }> = {}) => ({
  requestId,
  age: 30,
  selectedCount: 0,
  requestedAt: requestId,
  preferredSlot: null,
  ...over
});

describe('âge au jour de la soirée', () => {
  it('compte l’anniversaire au jour près, sans fuseau', () => {
    expect(ageAt('2010-03-17', '2026-03-17')).toBe(16);
    expect(ageAt('2010-03-18', '2026-03-17')).toBe(15);
    expect(ageAt(null, '2026-03-17')).toBeNull();
    expect(ageAt('17/03/2010', '2026-03-17')).toBeNull();
  });
});

describe('classement des candidats', () => {
  it('fait passer d’abord ceux qui ont eu le moins de séances, puis les plus jeunes', () => {
    const ranked = rankCandidates([
      c(1, { selectedCount: 2, age: 15 }),
      c(2, { selectedCount: 0, age: 40 }),
      c(3, { selectedCount: 0, age: 16 }),
      c(4, { selectedCount: 1, age: 12 })
    ]);
    expect(ranked.map((r) => r.requestId)).toEqual([3, 2, 4, 1]);
  });

  it('départage à égalité par l’ordre des demandes, l’âge inconnu en dernier', () => {
    const ranked = rankCandidates([
      c(9, { age: 20, requestedAt: 300 }),
      c(8, { age: 20, requestedAt: 100 }),
      c(7, { age: null, requestedAt: 50 })
    ]);
    expect(ranked.map((r) => r.requestId)).toEqual([8, 9, 7]);
  });
});

describe('proposition de répartition', () => {
  const layout = { slotCount: 2, capacityPerSlot: 2 };

  it('remplit dans l’ordre de priorité en respectant les préférences', () => {
    const picks = proposeSelection(
      [c(1, { preferredSlot: 2 }), c(2), c(3, { preferredSlot: 2 }), c(4), c(5)],
      layout
    );
    expect(picks).toEqual([
      { requestId: 1, slot: 2 },
      { requestId: 2, slot: 1 },
      { requestId: 3, slot: 2 },
      { requestId: 4, slot: 1 }
    ]);
  });

  it('saute une préférence ferme sur un créneau plein plutôt que de la contredire', () => {
    const picks = proposeSelection(
      [c(1, { preferredSlot: 1 }), c(2, { preferredSlot: 1 }), c(3, { preferredSlot: 1 }), c(4)],
      layout
    );
    expect(picks).toEqual([
      { requestId: 1, slot: 1 },
      { requestId: 2, slot: 1 },
      { requestId: 4, slot: 2 }
    ]);
  });

  it('ignore une préférence hors de la soirée', () => {
    expect(proposeSelection([c(1, { preferredSlot: 5 })], layout)).toEqual([]);
  });
});

describe('texte de l’annonce', () => {
  it('écrit une ligne par créneau, « personne » quand il est vide', () => {
    const text = announcementText({
      dateLabel: 'mardi 17 mars',
      venueName: 'Pierre Dupuis',
      slots: [
        { index: 1, startTime: '19:30', endTime: '20:00' },
        { index: 2, startTime: '20:00', endTime: '20:30' }
      ],
      selectedBySlot: { 1: ['Alice D.', 'Bob M.'] }
    });
    expect(text).toBe('Indiv mardi 17 mars — Pierre Dupuis\n19h30-20h00 : Alice D., Bob M.\n20h00-20h30 : personne');
  });
});
