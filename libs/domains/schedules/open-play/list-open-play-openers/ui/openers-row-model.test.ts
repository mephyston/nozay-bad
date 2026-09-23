import { describe, it, expect, vi } from 'vitest';
import {
  adherentsProposes,
  compteurDOuvreur,
  detailDOuvreur,
  gestesDOuvreur,
  legendeDOuvreur,
  nomDOuvreur,
  pastilleDOuvreur,
  tonDOuvreur,
  type AdherentLike,
  type OuvreurLike
} from './openers-row-model';

const ouvreur = (patch: Partial<OuvreurLike> = {}): OuvreurLike => ({
  id: 1,
  licence: '01234567',
  sessionsOpened: 3,
  name: 'Robert Dupont',
  ...patch
});

describe('projection d’un ouvreur', () => {
  it('prend le nom pour titre, et la licence pour détail', () => {
    expect(nomDOuvreur(ouvreur())).toBe('Robert Dupont');
    expect(detailDOuvreur(ouvreur())).toBe('01234567');
  });

  it('montre la licence quand l’annuaire ne la connaît pas', () => {
    /*
      Faire disparaître la ligne serait perdre l'information utile : un ouvreur qui n'a
      pas repris sa licence doit se voir.
    */
    const inconnu = ouvreur({ name: null });
    expect(nomDOuvreur(inconnu)).toBe('Licence 01234567');
    expect(pastilleDOuvreur(inconnu)).toBe('licence inconnue');
  });

  it('ne répète pas la licence quand elle sert déjà de titre', () => {
    expect(detailDOuvreur(ouvreur({ name: null }))).toBeUndefined();
  });

  it('traite un nom fait d’espaces comme un nom absent', () => {
    expect(nomDOuvreur(ouvreur({ name: '  ' }))).toBe('Licence 01234567');
    expect(pastilleDOuvreur(ouvreur({ name: '  ' }))).toBe('licence inconnue');
  });

  it('ne badge pas le cas courant', () => {
    expect(pastilleDOuvreur(ouvreur())).toBeUndefined();
  });

  it('accorde le compteur, singulier à zéro', () => {
    expect(compteurDOuvreur(ouvreur({ sessionsOpened: 0 }))).toBe('0');
    expect(legendeDOuvreur(ouvreur({ sessionsOpened: 0 }))).toBe('séance ouverte');
    expect(legendeDOuvreur(ouvreur({ sessionsOpened: 1 }))).toBe('séance ouverte');
    expect(legendeDOuvreur(ouvreur({ sessionsOpened: 4 }))).toBe('séances ouvertes');
  });

  it('met en retrait celui qui n’a encore rien ouvert', () => {
    expect(tonDOuvreur(ouvreur({ sessionsOpened: 0 }))).toBe('muted');
    expect(tonDOuvreur(ouvreur({ sessionsOpened: 1 }))).toBe('foreground');
  });
});

describe('gestes', () => {
  it('n’offre rien sans droit d’écriture', () => {
    expect(gestesDOuvreur({}, { onRemove: vi.fn() })).toEqual([]);
  });

  it('offre la reprise de clé, sans question de son cru', () => {
    // L'écran en pose une, et la sienne dit ce que le retrait ne fait pas : les
    // séances déjà acceptées ne sont pas annulées.
    const liste = gestesDOuvreur({ canWrite: true }, { onRemove: vi.fn() });
    expect(liste.map((a) => a.id)).toEqual(['reprendre']);
    expect(liste[0].confirm).toBeUndefined();
    expect(liste[0].tone).toBe('destructive');
  });
});

describe('adhérents proposés', () => {
  const annuaire: AdherentLike[] = [
    { licence: '00000001', firstName: 'Robert', lastName: 'Dupont' },
    { licence: '00000002', firstName: 'Simone', lastName: 'Durand' },
    { licence: '00000003', firstName: 'Paul', lastName: 'Duroc' }
  ];

  it('ne propose rien en deçà de trois lettres', () => {
    expect(adherentsProposes(annuaire, new Set(), 'du')).toEqual([]);
    expect(adherentsProposes(annuaire, new Set(), '  ')).toEqual([]);
  });

  it('cherche dans le prénom, le nom et la licence', () => {
    expect(adherentsProposes(annuaire, new Set(), 'dur').map((m) => m.licence)).toEqual([
      '00000002',
      '00000003'
    ]);
    expect(adherentsProposes(annuaire, new Set(), '0000000 1'.replace(' ', '')).length).toBe(1);
  });

  it('écarte ceux qui détiennent déjà une clé', () => {
    expect(adherentsProposes(annuaire, new Set(['00000002']), 'dur').map((m) => m.licence)).toEqual([
      '00000003'
    ]);
  });

  it('dédoublonne par licence', () => {
    /*
      Une liste keyée sur une clé en double fait planter l'îlot entier : le champ reste
      affiché, rendu côté serveur, mais plus rien ne réagit. Un composant d'affichage
      ne doit pas mourir d'un doublon dans ses données.
    */
    const avecDoublon = [...annuaire, { licence: '00000002', firstName: 'Simone', lastName: 'Durand' }];
    expect(adherentsProposes(avecDoublon, new Set(), 'durand')).toHaveLength(1);
  });

  it('s’arrête au maximum demandé', () => {
    const beaucoup = Array.from({ length: 30 }, (_, i) => ({
      licence: String(i).padStart(8, '0'),
      firstName: 'Durand',
      lastName: `N°${i}`
    }));
    expect(adherentsProposes(beaucoup, new Set(), 'durand')).toHaveLength(8);
    expect(adherentsProposes(beaucoup, new Set(), 'durand', 3)).toHaveLength(3);
  });
});
