import { describe, it, expect } from 'vitest';
import { normalize, searchNav } from './nav-search';
import { NAV_GROUPS, QUICK_ACTIONS } from './nav';

describe('normalize', () => {
  it('efface accents, casse et ponctuation', () => {
    expect(normalize('  Remises de chèques ! ')).toBe('remises de cheques');
    expect(normalize('Accès & Rôles')).toBe('acces roles');
  });
});

describe('searchNav', () => {
  const search = (q: string) => searchNav(NAV_GROUPS, QUICK_ACTIONS, q);

  it('ne rend rien sans saisie', () => {
    expect(search('')).toEqual([]);
    expect(search('   ')).toEqual([]);
  });

  it('trouve la page par son nom, puis la saisie rapide qui la concerne', () => {
    const hits = search('commande');
    expect(hits[0]).toMatchObject({ kind: 'page', name: 'Commandes', group: 'Boutique', href: '/admin/shop/orders' });
    expect(hits[1]).toMatchObject({ kind: 'action', name: 'Nouvelle commande' });
  });

  it('classe le nom avant la rubrique ou le mot-clé', () => {
    // « Boutique » est la rubrique de deux pages : les deux sortent, dans l'ordre du menu.
    expect(search('boutique').map((h) => h.name)).toEqual(['Produits', 'Commandes', 'Nouvelle commande']);
    // « Pages » est un nom, et « page » un mot-clé du pied de page : le nom d'abord.
    expect(search('page')[0].name).toBe('Pages');
  });

  it('cherche sans accents et par mot-clé', () => {
    expect(search('cheque')[0].name).toBe('Remises de chèques');
    expect(search('VIREMENT')[0].name).toBe('Rapprochement bancaire');
    expect(search('adhésion')[0].name).toBe('Liste des adhérents');
  });

  it('exige tous les mots tapés', () => {
    const hits = search('remise cheque');
    expect(hits.map((h) => h.name)).toEqual(['Remises de chèques', 'Enregistrer un chèque']);
    expect(search('chèque licorne')).toEqual([]);
  });

  it('porte l’événement des saisies rapides', () => {
    const action = search('nouvelle note').find((h) => h.kind === 'action');
    expect(action).toMatchObject({ name: 'Nouvelle note de frais', event: 'open-new-expense', pathPrefix: '/admin/expenses' });
  });

  it('ne cherche que dans ce qu’on lui donne — les pages filtrées par les droits n’apparaissent pas', () => {
    const sansCompta = NAV_GROUPS.filter((g) => g.label !== 'Comptabilité');
    expect(searchNav(sansCompta, [], 'virement')).toEqual([]);
  });

  it('borne le nombre de résultats', () => {
    expect(searchNav(NAV_GROUPS, QUICK_ACTIONS, 'e', 3)).toHaveLength(3);
  });
});
