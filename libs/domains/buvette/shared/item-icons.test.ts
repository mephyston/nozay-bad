import { describe, expect, it } from 'vitest';
import { guessItemIcon, resolveItemIcon } from './item-icons';

describe('pictogrammes des articles', () => {
  it.each([
    ['Café', 'coffee'],
    ['Coca-Cola 33 cl', 'soda'],
    ['Eau minérale', 'water'],
    ['Croque-monsieur', 'sandwich'],
    ['Sandwich jambon beurre', 'sandwich'],
    ['Cheeseburger', 'burger'],
    ['Part de pizza', 'pizza'],
    ['Pâtes bolognaise', 'pasta'],
    ['Barre chocolatée', 'candy'],
    ['Twix', 'candy'],
    ['Crêpe au sucre', 'cake'],
    ['Pomme', 'fruit'],
    ['Chips', 'snack'],
    ['Bière pression', 'beer']
  ])('« %s » donne %s', (name, key) => {
    expect(guessItemIcon(name)).toBe(key);
  });

  it('un nom inconnu n\'a pas de pictogramme : l\'initiale prend le relais', () => {
    expect(guessItemIcon('Ticket tombola')).toBeNull();
  });

  it('le choix du catalogue l\'emporte, un choix inconnu est ignoré', () => {
    expect(resolveItemIcon('Café', 'cake')).toBe('cake');
    expect(resolveItemIcon('Café', 'licorne')).toBe('coffee');
  });
});
