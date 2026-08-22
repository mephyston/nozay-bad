import { describe, it, expect } from 'vitest';
import { formatSessionDate, sessionStatusLabel, type OpenPlaySession } from './open-play';

/** Une séance à venir, sans inscrit ni ouvreur. */
function session(over: Partial<OpenPlaySession> = {}): OpenPlaySession {
  return {
    id: 1,
    seasonCode: '25-26',
    date: '2026-03-21',
    startTime: '14:00',
    endTime: '17:00',
    minPlayers: 4,
    status: 'open',
    openerFirstName: null,
    openerLastName: null,
    label: null,
    notes: null,
    cancelledReason: null,
    venue: null,
    registrationCount: 0,
    guestCount: 0,
    playerCount: 0,
    needsOpener: false,
    myGuests: null,
    iAmOpener: false,
    ...over
  };
}

describe('date lisible', () => {
  it('rend le jour en toutes lettres, à l’heure de Paris', () => {
    expect(formatSessionDate('2026-03-21')).toBe('samedi 21 mars');
  });

  it('ne glisse pas d’un jour au changement d’heure', () => {
    // Le dimanche du passage à l'heure d'été : à minuit UTC, l'affichage aurait pu
    // reculer d'un jour selon le fuseau du runtime.
    expect(formatSessionDate('2026-03-29')).toBe('dimanche 29 mars');
  });
});

describe('phrase d’état', () => {
  it('dit ce qui manque au seuil', () => {
    expect(sessionStatusLabel(session({ playerCount: 2 }))).toEqual({
      text: '2 joueurs sur 4',
      tone: 'pending'
    });
  });

  it('réclame un ouvreur dès le seuil atteint', () => {
    expect(sessionStatusLabel(session({ playerCount: 4, needsOpener: true }))).toEqual({
      text: 'Il manque un ouvreur',
      tone: 'pending'
    });
  });

  it('nomme l’ouvreur, prénom et initiale', () => {
    // Le nom complet n'a pas à s'afficher : l'adhérent veut savoir que quelqu'un ouvre,
    // pas lire un annuaire.
    expect(
      sessionStatusLabel(
        session({
          status: 'confirmed',
          openerFirstName: 'Marie',
          openerLastName: 'Dupuis',
          playerCount: 5
        })
      )
    ).toEqual({ text: 'Confirmée — ouverte par Marie D.', tone: 'ok' });
  });

  it('donne le motif d’annulation plutôt qu’un statut sec', () => {
    // L'adhérent inscrit doit lire pourquoi il ne joue pas.
    expect(
      sessionStatusLabel(session({ status: 'cancelled', cancelledReason: 'Gymnase fermé' }))
    ).toEqual({ text: 'Gymnase fermé', tone: 'off' });
  });

  it('reste lisible si le motif manque', () => {
    expect(sessionStatusLabel(session({ status: 'cancelled' })).text).toBe('Séance annulée');
  });
});
