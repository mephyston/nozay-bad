import { describe, it, expect } from 'vitest';
import {
  articleCorrespond,
  rubriquesFiltrees,
  compterArticles,
  type RubriqueDAide
} from './help-search';

const RUBRIQUES: RubriqueDAide[] = [
  {
    cle: 'comptabilite',
    titre: 'Comptabilité et Trésorerie',
    articles: [
      { id: 'remises', titre: 'Remise de chèques', description: 'Préparer un bordereau' },
      { id: 'rapprochement', titre: 'Rapprochement bancaire' }
    ]
  },
  {
    cle: 'adherents',
    titre: 'Gestion des Adhérents',
    articles: [{ id: 'import', titre: 'Importer les licences', description: 'Depuis Poona' }]
  }
];

describe('articleCorrespond', () => {
  it('ignore les accents — personne ne les tape dans un champ de recherche', () => {
    expect(articleCorrespond({ id: 'a', titre: 'Remise de chèques' }, 'cheque')).toBe(true);
  });

  it('cherche chaque mot séparément, dans n’importe quel ordre', () => {
    expect(articleCorrespond({ id: 'a', titre: 'Remise de chèques' }, 'cheque remise')).toBe(true);
  });

  it('exige tous les mots, pas seulement l’un d’eux', () => {
    expect(articleCorrespond({ id: 'a', titre: 'Remise de chèques' }, 'cheque poona')).toBe(false);
  });

  it('cherche aussi dans la description', () => {
    expect(
      articleCorrespond({ id: 'a', titre: 'Remise de chèques', description: 'Préparer un bordereau' }, 'bordereau')
    ).toBe(true);
  });

  it('cherche aussi dans le nom de la rubrique', () => {
    // « Rapprochement bancaire » ne porte pas le mot « comptabilité » ; sa rubrique, oui.
    expect(articleCorrespond({ id: 'a', titre: 'Rapprochement bancaire' }, 'comptabilite', 'Comptabilité et Trésorerie')).toBe(true);
  });

  it('un terme vide garde tout', () => {
    expect(articleCorrespond({ id: 'a', titre: 'Remise de chèques' }, '   ')).toBe(true);
  });
});

describe('rubriquesFiltrees', () => {
  it('rend les rubriques inchangées sans terme', () => {
    expect(rubriquesFiltrees(RUBRIQUES, '')).toEqual(RUBRIQUES);
  });

  it('ne garde que les articles retenus', () => {
    const r = rubriquesFiltrees(RUBRIQUES, 'cheque');
    expect(r).toHaveLength(1);
    expect(r[0].articles.map((a) => a.id)).toEqual(['remises']);
  });

  it('fait disparaître une rubrique vidée — un en-tête seul laisse croire à un repli', () => {
    expect(rubriquesFiltrees(RUBRIQUES, 'poona').map((r) => r.cle)).toEqual(['adherents']);
  });

  it('ne modifie pas les rubriques reçues', () => {
    rubriquesFiltrees(RUBRIQUES, 'cheque');
    expect(RUBRIQUES[0].articles).toHaveLength(2);
  });

  it('rend une liste vide quand rien ne correspond', () => {
    expect(rubriquesFiltrees(RUBRIQUES, 'badminton lunaire')).toEqual([]);
  });
});

describe('compterArticles', () => {
  it('additionne les articles de toutes les rubriques', () => {
    expect(compterArticles(RUBRIQUES)).toBe(3);
  });

  it('vaut zéro sans rubrique', () => {
    expect(compterArticles([])).toBe(0);
  });
});
