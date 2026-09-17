import { describe, it, expect } from 'vitest';
import { membersForSeason, toMemberItems } from './member-options';

const seasons = [
  { id: 1, code: '25-26' },
  { id: 2, code: '26-27' }
];
const members = [
  { id: 10, firstName: 'Léa', lastName: 'Martin', licence: '07001234', seasonCode: '25-26' },
  { id: 20, firstName: 'Léa', lastName: 'Martin', licence: '07001234', seasonCode: '26-27' },
  { id: 21, firstName: 'Ana', lastName: 'Bernard', licence: null, seasonCode: '26-27' }
];

describe('membersForSeason', () => {
  it('ne propose que les adhésions de l’exercice visé, désigné par son identifiant ou son code', () => {
    // La même personne a une adhésion par exercice : une seule des deux doit rester.
    expect(membersForSeason(members, seasons, '2').map((m) => m.id)).toEqual([20, 21]);
    expect(membersForSeason(members, seasons, '26-27').map((m) => m.id)).toEqual([20, 21]);
    expect(membersForSeason(members, seasons, '1').map((m) => m.id)).toEqual([10]);
  });

  it('rend une liste vide plutôt que tout l’annuaire quand l’exercice est inconnu ou absent', () => {
    expect(membersForSeason(members, seasons, '')).toEqual([]);
    expect(membersForSeason(members, seasons, '99')).toEqual([]);
  });
});

describe('toMemberItems', () => {
  it('trie par nom et porte la licence en détail', () => {
    const items = toMemberItems(membersForSeason(members, seasons, '2'));
    expect(items.map((i) => i.label)).toEqual(['Bernard Ana', 'Martin Léa']);
    expect(items[1]).toMatchObject({ value: '20', detail: '07001234' });
    expect(items[0].detail).toBeUndefined();
  });
});
