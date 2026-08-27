import { describe, it, expect } from 'vitest';
import { staffContacts } from './staff-contacts';

/**
 * Un capitaine est joint au titre de sa fonction, pas au titre de son foyer.
 *
 * `staffContacts` s'appuyait sur `getContactEmailsForMember`, qui rend l'adresse de l'adhérent
 * **et celles de ses représentants légaux**. C'est le bon outil pour joindre une famille — une
 * commande à régler, une cotisation impayée — mais pas pour prévenir un capitaine d'une anomalie
 * de composition : le parent n'a ni le contexte ni la main pour corriger quoi que ce soit.
 *
 * L'adresse n'est pas un canal ici mais une **identité** : `push_subscriptions.email` est la clé
 * sous laquelle un appareil s'enregistre, celle de la session OTP. Cibler l'adresse d'un parent
 * revient donc à viser les appareils du parent.
 */
const member = (over: Record<string, any>) => ({
  id: 1,
  personId: 1,
  licence: '01234567',
  seasonId: 1,
  lastName: 'Durand',
  firstName: 'Léa',
  gender: 'F' as const,
  birthDate: '2008-04-02',
  email: 'lea.durand@example.org',
  phone: null,
  parent1Name: 'Marc Durand',
  parent1Email: 'marc.durand@example.org',
  parent1Phone: null,
  parent2Name: null,
  parent2Email: null,
  parent2Phone: null,
  status: 'active',
  type: 'adherent',
  amountDueCents: 0,
  amountReceivedCents: 0,
  ...over
}) as any;

describe('staffContacts', () => {
  it("ne retient que l'adresse personnelle, jamais celle des représentants légaux", () => {
    const byLicence = new Map([['01234567', member({})]]);

    const { emails, names } = staffContacts(byLicence, ['01234567']);

    expect(emails).toEqual(['lea.durand@example.org']);
    expect(emails).not.toContain('marc.durand@example.org');
    expect(names).toEqual(['Léa Durand']);
  });

  it("laisse injoignable un membre du staff sans adresse, plutôt que d'écrire à ses parents", () => {
    /*
     * C'est un trou de l'annuaire à combler, pas quelque chose à contourner : router vers le
     * parent ferait croire le capitaine prévenu alors qu'il ne l'est pas.
     */
    const byLicence = new Map([['01234567', member({ email: null })]]);

    const { emails, names } = staffContacts(byLicence, ['01234567']);

    expect(emails).toEqual([]);
    // Le nom reste connu : il sert à écrire « rapprochez-vous de … » dans l'autre message.
    expect(names).toEqual(['Léa Durand']);
  });

  it('déduplique et ignore les licences absentes ou nulles', () => {
    const byLicence = new Map([
      ['01234567', member({})],
      ['07654321', member({ licence: '07654321', firstName: 'Paul', email: 'LEA.DURAND@example.org' })]
    ]);

    const { emails, names } = staffContacts(byLicence, ['01234567', '07654321', null, '09999999']);

    expect(emails).toEqual(['lea.durand@example.org']);
    expect(names).toEqual(['Léa Durand', 'Paul Durand']);
  });
});
