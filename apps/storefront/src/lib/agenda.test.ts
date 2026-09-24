import { describe, it, expect } from 'vitest';
import { dateDuRendezVous } from './agenda';

describe('dateDuRendezVous', () => {
  it('écrit le jour et l’heure', () => {
    expect(dateDuRendezVous('2026-10-03T19:30:00')).toBe('samedi 3 octobre à 19h30');
  });

  it('tait une heure vide : un rendez-vous à minuit pile n’existe pas', () => {
    expect(dateDuRendezVous('2026-10-03T00:00:00')).toBe('samedi 3 octobre');
    expect(dateDuRendezVous('2026-10-03')).toBe('samedi 3 octobre');
  });

  it('ne recule pas d’un jour : les dates sont locales, jamais UTC', () => {
    // Relue en UTC, une soirée du 3 à 19h30 s'affichait le 3 ou le 2 selon le fuseau
    // du runtime ; c'est le piège qui a déjà mordu la pastille de date.
    expect(dateDuRendezVous('2026-03-29T22:00:00')).toBe('dimanche 29 mars à 22h00');
  });

  it('rend une chaîne vide plutôt qu’une date inventée', () => {
    expect(dateDuRendezVous('pas une date')).toBe('');
  });
});
