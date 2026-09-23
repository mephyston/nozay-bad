import { describe, it, expect } from 'vitest';
import { pastillesDeFichier, resumeDImport } from './import-summary';

describe('résumé d’un import', () => {
  it('accorde tout, et ne dit que ce qui existe', () => {
    /*
      « 0 ligne illisible » annoncé à chaque import ferait chercher un problème là où
      il n'y en a pas.
    */
    expect(
      resumeDImport({
        imported: 214,
        eloDate: '2026-09-03',
        nonCompetitors: 0,
        unmatched: [],
        errors: []
      })
    ).toBe('214 classements importés au 2026-09-03.');
  });

  it('met le singulier à un', () => {
    expect(
      resumeDImport({ imported: 1, eloDate: '2026-09-03', nonCompetitors: 1, unmatched: [{}], errors: [{}] })
    ).toBe(
      '1 classement importé au 2026-09-03, 1 non compétiteur ignoré, 1 compétiteur sans adhérent, 1 ligne illisible.'
    );
  });

  it('met le singulier à zéro', () => {
    // Le français le veut ainsi, et « 0 classements » se lit comme une faute.
    expect(
      resumeDImport({ imported: 0, eloDate: '2026-09-03', nonCompetitors: 0, unmatched: [], errors: [] })
    ).toBe('0 classement importé au 2026-09-03.');
  });

  it('énonce les trois réserves quand elles existent', () => {
    const texte = resumeDImport({
      imported: 200,
      eloDate: '2026-09-03',
      nonCompetitors: 12,
      unmatched: [{}, {}],
      errors: [{}, {}, {}]
    });
    expect(texte).toContain('12 non compétiteurs ignorés');
    expect(texte).toContain('2 compétiteurs sans adhérent');
    expect(texte).toContain('3 lignes illisibles');
  });
});

describe('pastilles du fichier choisi', () => {
  it('annonce toujours le nombre de compétiteurs', () => {
    // C'est la seule occasion de s'apercevoir qu'on a pris le mauvais export.
    expect(
      pastillesDeFichier({ competiteurs: 1, nonCompetiteurs: 0, saisons: [], erreurs: 0 })
    ).toEqual([{ label: '1 compétiteur', variant: 'secondary' }]);
  });

  it('ajoute les non-compétiteurs, les saisons et les erreurs, dans cet ordre', () => {
    const liste = pastillesDeFichier({
      competiteurs: 200,
      nonCompetiteurs: 12,
      saisons: ['26-27'],
      erreurs: 2
    });
    expect(liste.map((p) => p.label)).toEqual([
      '200 compétiteurs',
      '12 non compétiteurs',
      'Saison 26-27',
      '2 lignes illisibles'
    ]);
    expect(liste.at(-1)?.variant).toBe('destructive');
  });

  it('tait ce qui est à zéro', () => {
    const liste = pastillesDeFichier({
      competiteurs: 200,
      nonCompetiteurs: 0,
      saisons: [],
      erreurs: 0
    });
    expect(liste).toHaveLength(1);
  });
});
