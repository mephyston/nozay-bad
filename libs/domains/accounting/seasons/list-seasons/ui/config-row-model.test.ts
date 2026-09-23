import { describe, it, expect, vi } from 'vitest';
import type { AccountClass } from './settings-types';
import {
  classeDe,
  detailDeCompte,
  gestesDExercice,
  libelleDeType,
  rattachementDeProduit,
  signalementsDExercice,
  codesDeCategorie,
  libelleAdherent,
  parLibelle,
  signalementsDeCategorie,
  tonDeCodes
} from './config-row-model';

const CLASSES: AccountClass[] = [
  { code: '70', label: 'Ventes de produits et prestations', type: 'recette' },
  { code: '60', label: 'Achats de matières', type: 'depense' }
];

describe('résolution d’une classe', () => {
  it('trouve par son code', () => {
    /*
      Par le code, et rien d'autre. Le tableau cherchait d'abord par identifiant, mais
      ni `AccountClass` ni `Category` ne portent ce champ : la comparaison valait
      `undefined === undefined`. Invisible tant que le code vivait dans un `.svelte`,
      que rien ne type dans les domaines.
    */
    expect(classeDe(CLASSES, '70')?.label).toContain('Ventes');
    expect(classeDe(CLASSES, '60')?.label).toContain('Achats');
  });

  it('ne trouve rien sans catalogue ni sans code', () => {
    expect(classeDe(undefined, '70')).toBeUndefined();
    expect(classeDe(CLASSES, null)).toBeUndefined();
    expect(classeDe(CLASSES, '99')).toBeUndefined();
  });
});

describe('codes d’une catégorie', () => {
  it('donne le couple recette / dépense', () => {
    expect(codesDeCategorie({ receiptCode: '70', expenseCode: '60' }, CLASSES)).toBe('70 / 60');
  });

  it('se rabat sur le code stocké quand la classe est inconnue', () => {
    expect(codesDeCategorie({ receiptCode: '75', expenseCode: null }, CLASSES)).toBe('75 / —');
  });

  it('met en retrait une catégorie sans aucune correspondance', () => {
    const vide = { receiptCode: null, expenseCode: null };
    expect(codesDeCategorie(vide, CLASSES)).toBe('— / —');
    expect(tonDeCodes(vide)).toBe('muted');
    expect(tonDeCodes({ ...vide, receiptCode: '70' })).toBe('foreground');
  });
});

describe('libellé adhérent', () => {
  it('ne se répète pas quand il est identique', () => {
    // Les deux le sont sur la plupart des catégories : une seconde ligne pour rien.
    expect(libelleAdherent({ adminLabel: 'Cordages', adherentLabel: 'Cordages' })).toBeUndefined();
    expect(libelleAdherent({ adminLabel: 'Cordages', adherentLabel: '  Cordages ' })).toBeUndefined();
  });

  it('se dit quand il diffère', () => {
    expect(libelleAdherent({ adminLabel: 'Avances Badnet', adherentLabel: 'Inscriptions tournois' })).toBe(
      'Adhérents : Inscriptions tournois'
    );
  });

  it('se tait quand il manque', () => {
    expect(libelleAdherent({ adminLabel: 'Cordages', adherentLabel: '' })).toBeUndefined();
  });
});

describe('signalements', () => {
  it('ne badge pas le cas courant', () => {
    // Le tableau badgeait « Actif » sur chaque ligne : plus rien ne s'y distinguait.
    expect(signalementsDeCategorie({ active: true, hideInExpenses: false })).toEqual([]);
    expect(signalementsDeCategorie({ active: undefined, hideInExpenses: false })).toEqual([]);
  });

  it('signale l’inactivité et l’exclusion des notes de frais', () => {
    expect(signalementsDeCategorie({ active: false, hideInExpenses: true }).map((s) => s.label)).toEqual([
      'Inactive',
      'Hors notes de frais'
    ]);
  });
});

describe('ordre de lecture', () => {
  it('trie sans tenir compte des accents ni de la casse', () => {
    const liste = [{ adminLabel: 'Épuisette' }, { adminLabel: 'avances' }, { adminLabel: 'Zèbre' }];
    expect(parLibelle(liste).map((c) => c.adminLabel)).toEqual(['avances', 'Épuisette', 'Zèbre']);
  });

  it('ne modifie pas la liste reçue', () => {
    const liste = [{ adminLabel: 'b' }, { adminLabel: 'a' }];
    parLibelle(liste);
    expect(liste.map((c) => c.adminLabel)).toEqual(['b', 'a']);
  });
});

describe('type d’une classe de compte', () => {
  it('l’écrit en français', () => {
    // Les tableaux affichaient la valeur brute de l'API — « depense », sans accent.
    expect(libelleDeType('recette')).toBe('Recette');
    expect(libelleDeType('depense')).toBe('Dépense');
    expect(libelleDeType('tresorerie')).toBe('Trésorerie');
  });

  it('rend telle quelle une valeur qu’il ne connaît pas', () => {
    // Mieux vaut montrer la donnée que de la taire : c'est un type à ajouter.
    expect(libelleDeType('bricole')).toBe('bricole');
  });
});

describe('compte de trésorerie', () => {
  it('situe le compte par sa classe', () => {
    expect(detailDeCompte({ classCode: '512', classType: 'tresorerie' })).toBe('512 · Trésorerie');
  });
});

describe('exercice comptable', () => {
  it('ne signale que ce qui compte', () => {
    /*
      Un seul exercice est actif à la fois, et c'est celui sur lequel tout s'impute :
      le savoir d'un coup d'œil est la raison d'être de cet écran.
    */
    expect(signalementsDExercice({ active: false })).toEqual([]);
    expect(signalementsDExercice({ active: true }).map((s) => s.label)).toEqual(['Active']);
  });

  it('dit l’actif avant le clos, et l’à-nouveau en dernier', () => {
    expect(
      signalementsDExercice({ active: true, closed: true, isAutoFilled: true }).map((s) => s.label)
    ).toEqual(['Active', 'Clos', 'À-nouveau repris']);
  });
});

describe('catégorie de produits', () => {
  const comptables = [{ id: 7, adminLabel: 'Volants' }];

  it('nomme sa catégorie comptable, avec son intitulé', () => {
    // Les deux libellés sont souvent identiques : « Volants » sous « Volants » se lit
    // comme une répétition sans objet.
    expect(rattachementDeProduit({ accountingCategoryId: 7 }, comptables)).toBe(
      'Comptabilité : Volants'
    );
  });

  it('dit l’absence de rattachement plutôt que de la taire', () => {
    // Une catégorie de produits sans rattachement ne se comptabilise nulle part.
    expect(rattachementDeProduit({ accountingCategoryId: 99 }, comptables)).toBe(
      'Sans catégorie comptable'
    );
  });
});

describe('gestes d’un exercice', () => {
  const gestes = () => ({ onSoldes: vi.fn(), onActiver: vi.fn(), onCloturer: vi.fn() });

  it('met la consultation en tête', () => {
    // C'est elle qu'un balayage long exécute : elle ne doit rien changer.
    const liste = gestesDExercice({ id: '1', active: false }, gestes());
    expect(liste[0].id).toBe('soldes');
  });

  it('n’offre plus que les soldes sur un exercice clos', () => {
    // On n'y écrit plus : proposer « Activer » ou « Clôturer » serait une promesse vide.
    expect(gestesDExercice({ id: '1', active: false, closed: true }, gestes()).map((a) => a.id)).toEqual([
      'soldes'
    ]);
  });

  it('n’offre pas d’activer ce qui l’est déjà', () => {
    expect(gestesDExercice({ id: '1', active: true }, gestes()).map((a) => a.id)).toEqual([
      'soldes',
      'cloturer'
    ]);
  });

  it('offre l’activation d’un exercice dormant', () => {
    expect(gestesDExercice({ id: '1', active: false }, gestes()).map((a) => a.id)).toEqual([
      'soldes',
      'activer',
      'cloturer'
    ]);
  });
});
