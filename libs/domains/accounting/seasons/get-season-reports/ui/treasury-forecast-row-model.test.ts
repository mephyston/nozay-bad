import { describe, it, expect } from 'vitest';
import {
  estRealise,
  totalDuMois,
  mouvementDuMois,
  ligneDePrevision,
  lignesDePrevision,
  type PointDePrevision
} from './treasury-forecast-row-model';

function point(p: Partial<PointDePrevision> = {}): PointDePrevision {
  return {
    month: '2026-09',
    label: 'sept. 2026',
    realTotal: null,
    realCurrent: null,
    realSavings: null,
    projectedTotal: null,
    projectedCurrent: null,
    projectedSavings: null,
    projectedRecettes: 0,
    projectedDepenses: 0,
    ...p
  };
}

describe('estRealise', () => {
  it('un mois dont le total réel est connu est réalisé', () => {
    expect(estRealise(point({ realTotal: 150_00 }))).toBe(true);
  });

  it("un total réel de zéro reste un fait, pas une absence", () => {
    // `0` est un solde comme un autre ; seul `null` dit « pas encore connu ».
    expect(estRealise(point({ realTotal: 0 }))).toBe(true);
  });

  it('un mois sans total réel est une projection', () => {
    expect(estRealise(point({ projectedTotal: 900_00 }))).toBe(false);
  });
});

describe('totalDuMois', () => {
  it('prend la projection quand elle existe', () => {
    expect(totalDuMois(point({ projectedTotal: 900_00, realTotal: 150_00 }))).toBe(900_00);
  });

  it('se rabat sur le réel', () => {
    expect(totalDuMois(point({ realTotal: 150_00 }))).toBe(150_00);
  });

  it('vaut zéro quand rien n’est connu', () => {
    expect(totalDuMois(point())).toBe(0);
  });
});

describe('mouvementDuMois', () => {
  it('donne les recettes puis les dépenses', () => {
    const texte = mouvementDuMois(point({ projectedRecettes: 1234_00, projectedDepenses: 567_00 }));
    expect(texte).toContain('+1');
    expect(texte).toContain('−');
    expect(texte.indexOf('+')).toBeLessThan(texte.indexOf('−'));
  });

  it('n’écrit que ce qui existe', () => {
    expect(mouvementDuMois(point({ projectedRecettes: 1234_00 }))).not.toContain('−');
    expect(mouvementDuMois(point({ projectedDepenses: 567_00 }))).not.toContain('+');
  });

  it('dit un mois sans mouvement, plutôt que deux signes orphelins', () => {
    expect(mouvementDuMois(point())).toBe('aucun mouvement');
  });
});

describe('ligneDePrevision', () => {
  it('porte le mois, son mouvement et son total', () => {
    const l = ligneDePrevision(
      point({ label: 'oct. 2026', projectedTotal: 4200_00, projectedRecettes: 500_00 })
    );
    expect(l.titre).toBe('oct. 2026');
    expect(l.sousTitre).toContain('+500');
    expect(l.valeur).toContain('4');
    expect(l.ton).toBe('foreground');
  });

  it('un découvert prend le ton destructif', () => {
    expect(ligneDePrevision(point({ projectedTotal: -1200_00 })).ton).toBe('destructive');
  });

  it('ne signale que le réalisé — un prévisionnel est fait de projections', () => {
    expect(ligneDePrevision(point({ realTotal: 150_00 })).legende).toBe('réalisé');
    expect(ligneDePrevision(point({ projectedTotal: 150_00 })).legende).toBeUndefined();
  });

  it('la clé est le mois, stable d’un rendu à l’autre', () => {
    expect(ligneDePrevision(point({ month: '2027-03' })).cle).toBe('2027-03');
  });
});

describe('lignesDePrevision', () => {
  it('garde l’ordre chronologique reçu', () => {
    const lignes = lignesDePrevision([
      point({ month: '2026-09', label: 'sept. 2026' }),
      point({ month: '2026-10', label: 'oct. 2026' })
    ]);
    expect(lignes.map((l) => l.cle)).toEqual(['2026-09', '2026-10']);
  });
});
