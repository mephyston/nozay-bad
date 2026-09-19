import { describe, it, expect } from 'vitest';
import { compareVariantLabels, productDisplayName } from './product';

describe('productDisplayName', () => {
  it('compose le nom du parent et le libellé de la déclinaison', () => {
    expect(productDisplayName({ name: 'Maillot du club', variantLabel: 'L' })).toBe('Maillot du club — L');
  });

  it('rend le nom seul pour un produit sans déclinaison', () => {
    expect(productDisplayName({ name: 'Yonex BG65' })).toBe('Yonex BG65');
    expect(productDisplayName({ name: 'Yonex BG65', variantLabel: null })).toBe('Yonex BG65');
    expect(productDisplayName({ name: 'Yonex BG65', variantLabel: '  ' })).toBe('Yonex BG65');
  });
});

describe('compareVariantLabels', () => {
  const sorted = (labels: string[]) => [...labels].sort(compareVariantLabels);

  it('trie les tailles textiles dans leur ordre, pas celui de l’alphabet', () => {
    expect(sorted(['XL', 'S', 'XXXL', 'M', 'XS', 'L', 'XXL'])).toEqual(['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']);
  });

  it('trie les âges et pointures comme des nombres', () => {
    expect(sorted(['12 ans', '8 ans', '10 ans'])).toEqual(['8 ans', '10 ans', '12 ans']);
  });

  it('place les tailles lettrées avant les nombres, et le reste après, par ordre alphabétique', () => {
    expect(sorted(['Rouge', '10 ans', 'M', 'Bleu', 'XS'])).toEqual(['XS', 'M', '10 ans', 'Bleu', 'Rouge']);
  });

  it('ignore la casse et les espaces autour des tailles', () => {
    expect(sorted(['xl', ' s ', 'M'])).toEqual([' s ', 'M', 'xl']);
  });
});
