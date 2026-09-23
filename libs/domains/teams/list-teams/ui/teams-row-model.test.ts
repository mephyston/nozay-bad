import { describe, it, expect, vi } from 'vitest';
import {
  detailDEquipe,
  effectifDEquipe,
  gestesDEquipe,
  gestesDEquipeAuTableau,
  legendeDEffectif,
  nomDeStaff,
  signalementsDEquipe,
  tonDEffectif,
  type EquipeLike
} from './teams-row-model';

const equipe = (patch: Partial<EquipeLike> = {}): EquipeLike => ({
  id: 1,
  name: 'NBA 1',
  championshipLabel: 'Interclubs départemental',
  divisionLabel: 'D2',
  poolLabel: 'Poule A',
  captain: { firstName: 'Robert', lastName: 'Dupont' },
  viceCaptain: null,
  rosterCount: 8,
  matchCount: 7,
  active: true,
  ...patch
});

describe('projection d’une équipe', () => {
  it('situe l’équipe sous son nom', () => {
    expect(detailDEquipe(equipe())).toBe('Interclubs départemental · D2 · Poule A');
  });

  it('se passe de poule quand il n’y en a pas', () => {
    expect(detailDEquipe(equipe({ poolLabel: null }))).toBe('Interclubs départemental · D2');
  });

  it('accorde l’effectif, singulier à zéro', () => {
    expect(effectifDEquipe(equipe({ rosterCount: 0 }))).toBe('0');
    expect(legendeDEffectif(equipe({ rosterCount: 0 }))).toBe('joueur');
    expect(legendeDEffectif(equipe({ rosterCount: 1 }))).toBe('joueur');
    expect(legendeDEffectif(equipe({ rosterCount: 8 }))).toBe('joueurs');
  });

  it('met en retrait une équipe encore sans joueur', () => {
    expect(tonDEffectif(equipe({ rosterCount: 0 }))).toBe('muted');
    expect(tonDEffectif(equipe({ rosterCount: 1 }))).toBe('foreground');
  });

  it('nomme le staff, et dit son absence', () => {
    expect(nomDeStaff({ firstName: 'Robert', lastName: 'Dupont' })).toBe('Dupont Robert');
    expect(nomDeStaff(null)).toBe('—');
    expect(nomDeStaff(undefined)).toBe('—');
  });
});

describe('signalements', () => {
  it('ne badge pas le cas courant', () => {
    expect(signalementsDEquipe(equipe())).toEqual([]);
  });

  it('signale l’inactivité et le capitaine manquant', () => {
    expect(signalementsDEquipe(equipe({ active: false })).map((s) => s.label)).toEqual(['Inactive']);
    expect(signalementsDEquipe(equipe({ captain: null })).map((s) => s.label)).toEqual([
      'Sans capitaine'
    ]);
  });

  it('ne badge jamais le vice-capitaine manquant', () => {
    // Beaucoup d'équipes n'en ont pas : ce n'est pas un manque, et le signaler ferait
    // une pastille sur presque chaque ligne.
    expect(signalementsDEquipe(equipe({ viceCaptain: null }))).toEqual([]);
  });
});

describe('gestes', () => {
  const gestes = () => ({
    onRoster: vi.fn(),
    onFixtures: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn()
  });

  it('met en tête le geste réversible', () => {
    const liste = gestesDEquipe({ canWrite: true, canDelete: true }, gestes());
    expect(liste[0].id).toBe('rencontres');
  });

  it('n’offre que les rencontres en lecture seule', () => {
    expect(gestesDEquipe({}, gestes()).map((a) => a.id)).toEqual(['rencontres']);
  });

  it('sépare écriture et suppression', () => {
    expect(gestesDEquipe({ canWrite: true }, gestes()).map((a) => a.id)).toEqual([
      'rencontres',
      'modifier'
    ]);
    expect(gestesDEquipe({ canDelete: true }, gestes()).map((a) => a.id)).toEqual([
      'rencontres',
      'supprimer'
    ]);
  });

  it('ne pose pas de question de son cru sur la suppression', () => {
    // L'écran en pose une, et la sienne énumère ce qui part avec l'équipe.
    const liste = gestesDEquipe({ canDelete: true }, gestes());
    expect(liste.find((a) => a.id === 'supprimer')?.confirm).toBeUndefined();
  });

  it('ajoute staff et effectif pour le menu du tableau, jamais pour le balayage', () => {
    /*
      L'appui sur une ligne ouvre déjà le staff et l'effectif ; le balayage ne doit pas
      le refaire. Le tableau, lui, n'a pas de ligne cliquable et doit tout offrir.
    */
    const g = gestes();
    expect(gestesDEquipe({ canWrite: true }, g).map((a) => a.id)).not.toContain('effectif');
    const tableau = gestesDEquipeAuTableau({ canWrite: true }, g);
    expect(tableau[0].id).toBe('effectif');
    tableau[0].run(equipe());
    expect(g.onRoster).toHaveBeenCalled();
  });
});
