import { describe, it, expect } from 'vitest';
import {
  affectationDeCandidat,
  choixDeCreneau,
  classementsDeCandidat,
  detailDeCandidat,
  ecartAuSouhait,
  nomDeCandidat,
  souhaitDeCandidat,
  type CandidatLike
} from './selection-row-model';

const candidat = (patch: Partial<CandidatLike> = {}): CandidatLike => ({
  requestId: 1,
  firstName: 'Simone',
  lastName: 'Durand',
  age: 16,
  category: 'Cadette',
  singles: 'D9',
  doubles: 'P10',
  mixed: null,
  preferredSlot: 2,
  note: null,
  requestCount: 5,
  selectedCount: 2,
  lastSelectedDate: '2026-09-01',
  ...patch
});

describe('projection d’un candidat', () => {
  it('donne le nom complet', () => {
    expect(nomDeCandidat(candidat())).toBe('Simone Durand');
  });

  it('met l’équité sous le nom, accordée', () => {
    // C'est la donnée qui fonde l'ordre de priorité : en troisième ligne d'une carte,
    // elle était invisible au moment du choix.
    expect(detailDeCandidat(candidat())).toBe('16 ans · Cadette · retenu 2 sur 5 demandes');
    expect(detailDeCandidat(candidat({ requestCount: 1 }))).toContain('sur 1 demande');
  });

  it('dit l’âge inconnu plutôt que de le taire', () => {
    expect(detailDeCandidat(candidat({ age: null }))).toContain('âge inconnu');
  });

  it('se passe de catégorie quand il n’y en a pas', () => {
    expect(detailDeCandidat(candidat({ category: null }))).toBe('16 ans · retenu 2 sur 5 demandes');
  });

  it('montre les classements manquants par un tiret', () => {
    // Un classement absent est une information : ce joueur n'est pas classé dans ce tableau.
    expect(classementsDeCandidat(candidat())).toBe('S/D/M D9 / P10 / —');
  });

  it('écrit le souhait, et la note quand il y en a une', () => {
    expect(souhaitDeCandidat(candidat())).toBe('Souhait : créneau 2');
    expect(souhaitDeCandidat(candidat({ preferredSlot: null }))).toBe('Souhait : indifférent');
    expect(souhaitDeCandidat(candidat({ note: 'Arrive à 20 h' }))).toContain('« Arrive à 20 h »');
  });
});

describe('affectation', () => {
  it('affiche le créneau retenu, ou un tiret', () => {
    expect(affectationDeCandidat(2)).toBe('Créneau 2');
    expect(affectationDeCandidat(null)).toBe('—');
    expect(affectationDeCandidat(undefined)).toBe('—');
  });

  it('ne signale le souhait que lorsqu’il n’est pas exaucé', () => {
    /*
      Répéter « souhait : créneau 2 » sous « Créneau 2 » n'apprend rien. L'écart, lui,
      est ce qu'un entraîneur veut voir en relisant sa sélection.
    */
    expect(ecartAuSouhait(candidat({ preferredSlot: 2 }), 2)).toBeUndefined();
    expect(ecartAuSouhait(candidat({ preferredSlot: 2 }), 1)).toBe('souhaitait le 2');
    expect(ecartAuSouhait(candidat({ preferredSlot: 2 }), null)).toBe('souhaitait le 2');
  });

  it('ne dit rien d’un candidat sans préférence', () => {
    expect(ecartAuSouhait(candidat({ preferredSlot: null }), 1)).toBeUndefined();
    expect(ecartAuSouhait(candidat({ preferredSlot: null }), null)).toBeUndefined();
  });
});

describe('choix de créneau', () => {
  const creneaux = [
    { index: 1, libelle: '19:30–20:00' },
    { index: 2, libelle: '20:00–20:30' }
  ];

  it('offre toujours le retrait en tête', () => {
    expect(choixDeCreneau(creneaux, {}, 4)[0]).toEqual({ value: '', label: 'Aucun créneau' });
  });

  it('dit le remplissage de chaque créneau', () => {
    const choix = choixDeCreneau(creneaux, { 1: 2, 2: 4 }, 4);
    expect(choix[1].hint).toBe('2/4');
    expect(choix[2].hint).toBe('complet (4/4)');
  });

  it('propose quand même un créneau complet', () => {
    /*
      Le faire disparaître donnerait une liste qui change de taille sans explication.
      L'entraîneur doit voir qu'il est complet ; l'écran refusera le choix avec sa raison.
    */
    const choix = choixDeCreneau(creneaux, { 1: 9, 2: 9 }, 4);
    expect(choix).toHaveLength(3);
    expect(choix.map((c) => c.value)).toEqual(['', '1', '2']);
  });

  it('traite un créneau jamais rempli comme vide', () => {
    expect(choixDeCreneau(creneaux, {}, 4)[1].hint).toBe('0/4');
  });
});
