import { type MemberSummary } from '@nba/members-api';
import { normalizeLicence } from './ranking';

export interface StaffContactsResult {
  emails: string[];
  names: string[];
}

/**
 * Annuaire du staff : licences normalisées, adresse de contact, nom affichable.
 *
 * **Seule l'adresse personnelle est retenue**, jamais celles des représentants légaux.
 *
 * Cette fonction utilisait `getContactEmailsForMember`, qui rend l'adresse de l'adhérent *et*
 * celles de ses parents. C'est le bon outil pour joindre un **foyer** — une commande à régler,
 * une cotisation impayée — mais pas pour joindre un capitaine : la fonction est portée par une
 * personne, pas par une famille. Un constat de composition partait donc chez des parents qui
 * n'ont ni le contexte ni la main pour corriger quoi que ce soit, et gonflait au passage le
 * nombre de destinataires annoncé (jusqu'à trois adresses par personne).
 *
 * Un capitaine sans adresse personnelle n'est donc pas joignable, et c'est volontaire : c'est un
 * trou de l'annuaire à combler, pas quelque chose à contourner en écrivant à ses parents.
 *
 * L'adresse vient de `MemberSummary`, déjà chargé par l'appelant : plus aucune requête par
 * membre du staff — chacune consommait une sous-requête du Worker.
 */
export function staffContacts(
  byLicence: Map<string, MemberSummary>,
  licences: Array<string | null>
): StaffContactsResult {
  const emails = new Set<string>();
  const names: string[] = [];
  for (const raw of licences) {
    if (!raw) continue;
    const member = byLicence.get(normalizeLicence(raw));
    if (!member) continue;
    names.push(`${member.firstName} ${member.lastName}`.trim());
    const email = member.email?.trim().toLowerCase();
    if (email) emails.add(email);
  }
  return { emails: [...emails], names };
}
