import { describe, it, expect } from 'vitest';
import {
  sommeDe,
  partDeFeminines,
  ligneDAge,
  lignesDePyramide,
  pourcentage,
  ligneDeRenouvellement,
  ligneDePerte,
  type CategorieDAge
} from './dashboard-rows';

const categorie = (p: Partial<CategorieDAge> = {}): CategorieDAge => ({
  code: 'P1',
  label: 'Poussin',
  birthYears: '2016-2017',
  youth: true,
  f: 3,
  m: 5,
  total: 8,
  ...p
});

describe('sommeDe', () => {
  it('additionne les trois colonnes', () => {
    expect(sommeDe([categorie(), categorie({ code: 'P2', f: 1, m: 1, total: 2 })])).toEqual({
      f: 4,
      m: 6,
      total: 10
    });
  });

  it('vaut zéro sur une liste vide', () => {
    expect(sommeDe([])).toEqual({ f: 0, m: 0, total: 0 });
  });
});

describe('partDeFeminines', () => {
  it('arrondit au pourcent', () => {
    expect(partDeFeminines({ f: 1, m: 2, total: 3 })).toBe(33);
  });

  it("ne divise pas par zéro : sans effectif, il n'y a rien à mesurer", () => {
    expect(partDeFeminines({ f: 0, m: 0, total: 0 })).toBeNull();
  });
});

describe('ligneDAge', () => {
  it('porte la répartition et les années sous le nom', () => {
    const l = ligneDAge(categorie());
    expect(l.titre).toBe('Poussin');
    expect(l.sousTitre).toBe('3 F · 5 H · nés en 2016-2017');
    expect(l.valeur).toBe('8');
    expect(l.section).toBe('Jeunes');
  });

  it('range les non-jeunes chez les adultes', () => {
    expect(ligneDAge(categorie({ youth: false })).section).toBe('Adultes');
  });

  it('signale une catégorie sans personne', () => {
    expect(ligneDAge(categorie({ f: 0, m: 0, total: 0 })).vide).toBe(true);
  });
});

describe('lignesDePyramide', () => {
  const ages = [
    categorie({ code: 'P1', total: 8 }),
    categorie({ code: 'V1', label: 'Vétéran', youth: false, f: 2, m: 4, total: 6 }),
    categorie({ code: 'MB', label: 'Mini-bad', f: 0, m: 0, total: 0 })
  ];

  it('écarte les catégories vides — dérouler des zéros n’apprend rien', () => {
    expect(lignesDePyramide(ages).map((l) => l.cle)).toEqual(['P1', 'V1']);
  });

  it('met les jeunes avant les adultes', () => {
    const sections = lignesDePyramide(ages).map((l) => l.section);
    expect(sections).toEqual(['Jeunes', 'Adultes']);
  });

  it('rend une liste vide quand tout est à zéro', () => {
    expect(lignesDePyramide([categorie({ f: 0, m: 0, total: 0 })])).toEqual([]);
  });
});

describe('pourcentage', () => {
  it('arrondit et suffixe', () => {
    expect(pourcentage(1, 3)).toBe('33 %');
  });

  it('rend un tiret plutôt que de diviser par zéro', () => {
    expect(pourcentage(0, 0)).toBe('—');
  });
});

describe('ligneDeRenouvellement', () => {
  it("dit d'où vient l'effectif", () => {
    const l = ligneDeRenouvellement({ group: 'Loisir', total: 30, renewed: 22, newcomers: 8 });
    expect(l.titre).toBe('Loisir');
    expect(l.sousTitre).toBe('22 renouvelés · 8 nouveaux');
    expect(l.valeur).toBe('30');
  });

  it('accorde au singulier', () => {
    const l = ligneDeRenouvellement({ group: 'Jeunes', total: 2, renewed: 1, newcomers: 1 });
    expect(l.sousTitre).toBe('1 renouvelé · 1 nouveau');
  });
});

describe('ligneDePerte', () => {
  it('dit ce que la perte pèse dans le groupe', () => {
    const l = ligneDePerte({ group: 'Loisir', previousTotal: 40, lapsed: 10 });
    expect(l.valeur).toBe('10');
    expect(l.sousTitre).toBe('sur 40 en n-1 · 25 % de perte');
    expect(l.alerte).toBe(true);
  });

  it("ne signale rien quand personne n'est parti", () => {
    expect(ligneDePerte({ group: 'Compétition', previousTotal: 12, lapsed: 0 }).alerte).toBe(false);
  });
});
