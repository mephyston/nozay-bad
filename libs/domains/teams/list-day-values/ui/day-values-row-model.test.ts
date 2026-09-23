import { describe, it, expect } from 'vitest';
import {
  avertissementsDe,
  ecartFr,
  erreursDe,
  etatDeComposition,
  legendeDeComposition,
  libelleDeSignalement,
  lignesDeComposition,
  pastilleDeComposition,
  tonDeComposition,
  valeurFr,
  type EquipeDeJourneeLike
} from './day-values-row-model';

const equipe = (patch: Partial<EquipeDeJourneeLike> = {}): EquipeDeJourneeLike => ({
  teamId: 1,
  name: 'NBA 1',
  divisionLabel: 'D2',
  value: 12.5,
  delta: -1.25,
  conform: true,
  upperTeamName: null,
  upperTeamValue: null,
  filledLines: 4,
  expectedLines: 4,
  captainName: 'Dupont Robert',
  captainLicence: '01234567',
  issues: [],
  ...patch
});

describe('nombres à la française', () => {
  it('écrit la virgule décimale, et le tiret pour l’absence', () => {
    expect(valeurFr(12.5)).toBe('12,50');
    expect(valeurFr(null)).toBe('—');
  });

  it('signe l’écart dans les deux sens', () => {
    expect(ecartFr(1.25)).toBe('+1,25');
    expect(ecartFr(-1.25)).toBe('-1,25');
    expect(ecartFr(0)).toBe('0,00');
    expect(ecartFr(null)).toBe('—');
  });
});

describe('composition', () => {
  it('compte les lignes remplies sur celles attendues', () => {
    expect(lignesDeComposition(equipe({ filledLines: 2, expectedLines: 4 }))).toBe('2/4');
  });

  it('passe au vert quand la composition est complète', () => {
    expect(tonDeComposition(equipe({ filledLines: 4, expectedLines: 4 }))).toBe('success');
    expect(tonDeComposition(equipe({ filledLines: 3, expectedLines: 4 }))).toBe('muted');
  });

  it('ne verdit pas une composition sans ligne attendue', () => {
    // 0/0 n'est pas « complet » : c'est un championnat qui n'attend rien, et le dire
    // en vert ferait croire à une vérification passée.
    expect(tonDeComposition(equipe({ filledLines: 0, expectedLines: 0 }))).toBe('muted');
  });

  it('ne met la valeur d’équipe que quand il y en a une à dire', () => {
    // « valeur — » n'apprend rien : dans le tableau le tiret occupe une colonne et
    // signifie « pas de valeur » ; en légende, il n'est que du bruit.
    expect(legendeDeComposition(equipe(), true)).toBe('valeur 12,50');
    expect(legendeDeComposition(equipe(), false)).toBeUndefined();
    expect(legendeDeComposition(equipe({ value: null }), true)).toBeUndefined();
  });
});

describe('état d’une composition', () => {
  const erreur = { severity: 'error' as const, message: 'x', article: '1' };
  const avertissement = { severity: 'warning' as const, message: 'y', article: '2' };

  it('trie les anomalies par gravité', () => {
    const e = equipe({ issues: [erreur, avertissement] });
    expect(erreursDe(e)).toHaveLength(1);
    expect(avertissementsDe(e)).toHaveLength(1);
  });

  it('accorde le décompte des anomalies', () => {
    expect(etatDeComposition(equipe({ issues: [erreur] })).texte).toBe('1 erreur');
    expect(etatDeComposition(equipe({ issues: [erreur, erreur] })).texte).toBe('2 erreurs');
    expect(etatDeComposition(equipe({ issues: [avertissement] })).texte).toBe('1 avertissement');
  });

  it('dit l’erreur avant le dépassement, et le dépassement avant le reste', () => {
    /*
      L'ordre est celui de la gravité : une erreur d'article fait perdre la rencontre,
      un dépassement de valeur la fait perdre aux deux équipes.
    */
    expect(
      etatDeComposition(equipe({ issues: [erreur], conform: false, upperTeamName: 'NBA 2' })).texte
    ).toBe('1 erreur');
    expect(
      etatDeComposition(equipe({ conform: false, upperTeamName: 'NBA 2', filledLines: 0 })).texte
    ).toBe('Dépasse NBA 2');
  });

  it('distingue la composition absente de celle qu’on ne peut pas vérifier', () => {
    expect(etatDeComposition(equipe({ filledLines: 0 })).texte).toBe('Pas composée');
    expect(etatDeComposition(equipe({ conform: null })).texte).toBe('À vérifier');
  });

  it('dit « Conforme », mais ne le badge pas sur téléphone', () => {
    /*
      Une colonne vide serait illisible, donc le tableau le dit toujours. Une pastille
      sur chaque ligne ne distinguerait plus rien : le silence est l'information.
    */
    const conforme = equipe();
    expect(etatDeComposition(conforme).texte).toBe('Conforme');
    expect(etatDeComposition(conforme).exception).toBe(false);
    expect(pastilleDeComposition(conforme)).toBeUndefined();
  });

  it('badge tout ce qui réclame un geste', () => {
    expect(pastilleDeComposition(equipe({ issues: [erreur] }))?.texte).toBe('1 erreur');
    expect(pastilleDeComposition(equipe({ filledLines: 0 }))?.texte).toBe('Pas composée');
    expect(pastilleDeComposition(equipe({ conform: null }))?.texte).toBe('À vérifier');
  });
});

describe('libellé du signalement', () => {
  it('dit qui est prévenu', () => {
    // Un dépassement de valeur part aux deux capitaines : nommer le seul capitaine de
    // l'équipe laisserait croire que l'autre n'a rien reçu.
    expect(libelleDeSignalement(equipe(), false)).toBe('Signaler au capitaine');
    expect(libelleDeSignalement(equipe({ conform: false }), false)).toBe(
      'Signaler aux deux capitaines'
    );
  });

  it('dit l’envoi en cours', () => {
    expect(libelleDeSignalement(equipe(), true)).toBe('Envoi…');
  });
});
