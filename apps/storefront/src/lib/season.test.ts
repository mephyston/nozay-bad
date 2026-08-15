// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { parisToday, seasonAtDate, isSeasonOpen, displaySeason, type Season } from './season';

const season = (code: string, startDate: string, endDate: string, active = false): Season => ({
  id: Number(code.slice(0, 2)),
  code,
  name: `Saison ${code}`,
  startDate,
  endDate,
  active
});

// La saison comptable (`active`) est volontairement posée sur une saison qui n'est PAS
// celle du calendrier : c'est la situation réelle entre la clôture et le 31 août.
const SEASONS: Season[] = [
  season('24-25', '2024-09-01', '2025-08-31'),
  season('25-26', '2025-09-01', '2026-08-31'),
  season('26-27', '2026-09-01', '2027-08-31', true)
];

describe('parisToday', () => {
  it('rend la date parisienne, pas la date UTC', () => {
    // 31 août 22h00 UTC = 1er septembre 00h00 à Paris : l'heure exacte de la bascule.
    expect(parisToday(new Date('2026-08-31T22:00:00Z'))).toBe('2026-09-01');
    expect(parisToday(new Date('2026-08-31T21:59:00Z'))).toBe('2026-08-31');
  });
});

describe('seasonAtDate', () => {
  it('retient la saison dont la fenêtre contient la date', () => {
    expect(seasonAtDate(SEASONS, '2026-01-15')?.code).toBe('25-26');
    expect(seasonAtDate(SEASONS, '2026-08-31')?.code).toBe('25-26');
    expect(seasonAtDate(SEASONS, '2026-09-01')?.code).toBe('26-27');
  });

  it('ne retient rien si aucune saison ne couvre la date', () => {
    expect(seasonAtDate(SEASONS, '2030-01-01')).toBeUndefined();
  });
});

describe('isSeasonOpen — critère de fraîcheur des sessions', () => {
  it('une session de la saison en cours reste valable', () => {
    expect(isSeasonOpen(SEASONS, '25-26', '2026-01-15')).toBe(true);
  });

  it('une session ouverte par anticipation sur la saison suivante reste valable', () => {
    // Sans quoi l'inscrit anticipé serait revérifié à chaque requête d'août.
    expect(isSeasonOpen(SEASONS, '26-27', '2026-01-15')).toBe(true);
  });

  it('la session expire le jour où sa saison se termine', () => {
    expect(isSeasonOpen(SEASONS, '25-26', '2026-08-31')).toBe(true);
    expect(isSeasonOpen(SEASONS, '25-26', '2026-09-01')).toBe(false);
  });

  it('une session sans saison (émise avant le champ) est périmée', () => {
    expect(isSeasonOpen(SEASONS, '', '2026-01-15')).toBe(false);
  });

  it('une saison inconnue est périmée', () => {
    expect(isSeasonOpen(SEASONS, '19-20', '2026-01-15')).toBe(false);
  });
});

describe('displaySeason', () => {
  it('affiche la saison de la session, pas la saison comptable', () => {
    // 26-27 porte `active: true` : si l'affichage la suivait, l'adhérent verrait une
    // cotisation vide pour une saison qu'il ne joue pas encore.
    expect(displaySeason(SEASONS, '25-26', '2026-01-15')?.code).toBe('25-26');
  });

  it('retombe sur le calendrier quand la session n’indique aucune saison', () => {
    expect(displaySeason(SEASONS, '', '2026-01-15')?.code).toBe('25-26');
  });

  it('retombe sur la saison comptable si le calendrier ne couvre rien', () => {
    expect(displaySeason(SEASONS, undefined, '2030-01-01')?.code).toBe('26-27');
  });

  it('ne rend rien si la table est vide', () => {
    expect(displaySeason([], '25-26', '2026-01-15')).toBeUndefined();
  });
});
