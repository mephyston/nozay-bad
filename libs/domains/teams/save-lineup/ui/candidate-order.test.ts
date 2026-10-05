import { describe, it, expect } from 'vitest';
import type { LineupCandidate } from '../../get-lineup/dto';
import { trierParClassement } from './candidate-order';

const joueur = (lastName: string, champs: Partial<LineupCandidate> = {}): LineupCandidate => ({
  licence: lastName,
  firstName: '',
  lastName,
  gender: 'H',
  category: null,
  mutation: 'none',
  singles: null,
  doubles: null,
  mixed: null,
  cpphSingles: null,
  cpphDoubles: null,
  cpphMixed: null,
  inRoster: true,
  eligibleDisciplines: ['singles', 'doubles', 'mixed'],
  unavailableReason: null,
  ...champs
});

const noms = (liste: LineupCandidate[]) => liste.map((c) => c.lastName);

describe('trierParClassement', () => {
  const candidats = [
    joueur('Arnaud', { singles: 'D9', doubles: 'R5', mixed: 'P10' }),
    joueur('Bernard', { singles: 'R4', doubles: 'D8', mixed: 'D7' }),
    joueur('Colin', { singles: 'P11', doubles: 'P12', mixed: 'R6' })
  ];

  it('range un tableau de simple par le classement en simple, du mieux classé au moins bien classé', () => {
    expect(noms(trierParClassement(candidats, 'SH'))).toEqual(['Bernard', 'Arnaud', 'Colin']);
  });

  it('range un double par le classement en double, et le mixte par le mixte', () => {
    expect(noms(trierParClassement(candidats, 'DH'))).toEqual(['Arnaud', 'Bernard', 'Colin']);
    expect(noms(trierParClassement(candidats, 'MX'))).toEqual(['Colin', 'Bernard', 'Arnaud']);
  });

  it('place NC devant le non-compétiteur, qui ferme la liste', () => {
    const liste = [joueur('Sans'), joueur('Nc', { singles: 'NC' }), joueur('Promo', { singles: 'P12' })];
    expect(noms(trierParClassement(liste, 'SD'))).toEqual(['Promo', 'Nc', 'Sans']);
  });

  it('départage un même classement par la cote CPPH, puis par le nom', () => {
    const liste = [
      joueur('Zola', { singles: 'R6' }),
      joueur('Martin', { singles: 'R6', cpphSingles: 900 }),
      joueur('Dupont', { singles: 'R6', cpphSingles: 1100 }),
      joueur('Albert', { singles: 'R6' })
    ];
    expect(noms(trierParClassement(liste, 'SH'))).toEqual(['Dupont', 'Martin', 'Albert', 'Zola']);
  });

  it('ne modifie pas la liste reçue', () => {
    const copie = [...candidats];
    trierParClassement(candidats, 'SH');
    expect(candidats).toEqual(copie);
  });
});
