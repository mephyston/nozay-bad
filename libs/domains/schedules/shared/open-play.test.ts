import { describe, it, expect } from 'vitest';
import {
  remplissageDeSeance,
  DEFAULT_MIN_PLAYERS,
  MAX_OPEN_PLAY_GUESTS,
  datesInRange,
  daysBetween,
  isNamedGuest,
  isUpcomingDate,
  isValidDate,
  isoWeekday
} from './open-play';

describe('dates du jeu libre', () => {
  it('refuse un 31 février, que le format seul laisserait passer', () => {
    expect(isValidDate('2026-02-28')).toBe(true);
    expect(isValidDate('2026-02-31')).toBe(false);
    expect(isValidDate('2026-13-01')).toBe(false);
    expect(isValidDate('14/03/2026')).toBe(false);
    expect(isValidDate('')).toBe(false);
  });

  it('laisse la séance du jour ouverte jusqu’à minuit', () => {
    // Une séance de 14 h reste inscriptible à 18 h : l'adhérent qui arrive en cours de
    // séance doit pouvoir se compter, c'est même là que le compte importe le plus.
    const duringTheSession = new Date('2026-03-14T18:00:00Z');
    expect(isUpcomingDate('2026-03-14', duringTheSession)).toBe(true);
    expect(isUpcomingDate('2026-03-13', duringTheSession)).toBe(false);
    expect(isUpcomingDate('2026-03-15', duringTheSession)).toBe(true);
  });

  it('donne le jour ISO, lundi valant 1 et dimanche 7', () => {
    expect(isoWeekday('2026-03-16')).toBe(1); // lundi
    expect(isoWeekday('2026-03-21')).toBe(6); // samedi
    expect(isoWeekday('2026-03-22')).toBe(7); // dimanche, et non 0
  });

  it('ne glisse pas d’un jour aux changements d’heure', () => {
    // Le piège que midi UTC neutralise : à minuit, ces deux dates pourraient basculer
    // sur la veille selon le fuseau du runtime, et la génération poserait les séances un
    // jour trop tôt — deux fois l'an, donc jamais remarqué tout de suite.
    expect(isoWeekday('2026-03-29')).toBe(7); // passage à l'heure d'été
    expect(isoWeekday('2026-10-25')).toBe(7); // retour à l'heure d'hiver
  });
});

describe('déroulé d’une période', () => {
  it('ne retient que les jours de semaine demandés, bornes comprises', () => {
    // Du lundi 16 au dimanche 29 mars : deux samedis, deux dimanches.
    const dates = datesInRange('2026-03-16', '2026-03-29', new Set([6, 7]));
    expect(dates).toEqual(['2026-03-21', '2026-03-22', '2026-03-28', '2026-03-29']);
  });

  it('inclut les bornes quand elles tombent le bon jour', () => {
    expect(datesInRange('2026-03-21', '2026-03-21', new Set([6]))).toEqual(['2026-03-21']);
    expect(datesInRange('2026-03-21', '2026-03-21', new Set([7]))).toEqual([]);
  });

  it('traverse un changement d’heure sans perdre ni doubler de date', () => {
    const dates = datesInRange('2026-03-27', '2026-03-31', new Set([1, 2, 3, 4, 5, 6, 7]));
    expect(dates).toEqual([
      '2026-03-27',
      '2026-03-28',
      '2026-03-29',
      '2026-03-30',
      '2026-03-31'
    ]);
  });

  it('rend une période vide quand les bornes sont inversées', () => {
    expect(datesInRange('2026-03-29', '2026-03-16', new Set([6, 7]))).toEqual([]);
  });

  it('compte les jours bornes comprises', () => {
    expect(daysBetween('2026-03-16', '2026-03-16')).toBe(1);
    expect(daysBetween('2026-03-16', '2026-03-22')).toBe(7);
    // Une année bissextile complète, pour que le plafond de génération se règle dessus.
    expect(daysBetween('2028-01-01', '2028-12-31')).toBe(366);
  });
});

describe('garde-fous de saisie', () => {
  it('exige un prénom ET un nom pour un invité', () => {
    expect(isNamedGuest({ firstName: 'Léa', lastName: 'Martin' })).toBe(true);
    expect(isNamedGuest({ firstName: '  ', lastName: 'Martin' })).toBe(false);
    expect(isNamedGuest({ firstName: 'Léa', lastName: '' })).toBe(false);
  });

  it('borne les invités plus bas que les accompagnants d’un événement', () => {
    // Un terrain accueille quatre joueurs : trois invités forment un double complet
    // autour de leur hôte. Au-delà, c'est une sortie de groupe.
    expect(MAX_OPEN_PLAY_GUESTS).toBe(3);
    expect(DEFAULT_MIN_PLAYERS).toBe(4);
  });
});

describe('remplissageDeSeance', () => {
  it('dit ce qui manque tant que le seuil n’est pas atteint', () => {
    expect(remplissageDeSeance(2, 4).texte).toBe('Il manque 2 joueurs pour ouvrir');
    expect(remplissageDeSeance(3, 4).texte).toBe('Il manque 1 joueur pour ouvrir');
    expect(remplissageDeSeance(2, 4).ouvrable).toBe(false);
  });

  it('dit l’absence plutôt que « il manque 4 joueurs » sur une séance vide', () => {
    expect(remplissageDeSeance(0, 4).texte).toBe("Personne d'inscrit — il en faut 4 pour ouvrir");
  });

  it('ne parle plus du seuil une fois atteint : seul le nombre d’inscrits compte', () => {
    // « 4 joueurs sur 4 » se lisait « complet » ; un gymnase à quatre terrains en
    // accueille seize.
    expect(remplissageDeSeance(4, 4)).toEqual({ texte: '4 joueurs inscrits', ouvrable: true });
    expect(remplissageDeSeance(12, 4).texte).toBe('12 joueurs inscrits');
  });

  it('accorde au singulier', () => {
    expect(remplissageDeSeance(1, 1).texte).toBe('1 joueur inscrit');
  });
});
