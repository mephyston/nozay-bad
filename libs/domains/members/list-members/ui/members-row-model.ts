import type { Tone } from '@nba/ui';
import { membershipStatusLabel, type MembershipStatus } from '../../shared/membership-status';
import type { Member } from './members-table-types';

/**
 * Le ton d'un statut d'adhésion, en un seul endroit.
 *
 * La vue mobile portait jusqu'ici une cascade de ternaires de couleur, et la vue
 * tableau un `Badge` d'une autre variante : deux vérités pour un même statut. Le
 * jeton sémantique règle la question — et le libellé vient de
 * `membershipStatusLabel`, qui l'écrivait déjà pour le tableau.
 */
const TON_PAR_STATUT: Record<MembershipStatus, Tone> = {
  valide: 'success',
  incomplet: 'warning',
  en_attente: 'muted',
  suspendu: 'destructive',
};

export function membershipStatusTone(status: string): Tone {
  return TON_PAR_STATUT[status as MembershipStatus] ?? 'muted';
}

export type LigneAdherent = {
  href: string;
  titre: string;
  sousTitre: string;
  valeur: string;
  ton: Tone;
};

/**
 * Projection d'un adhérent en ligne de liste.
 *
 * Le nom identifie, la licence situe, le statut est la seule valeur qui compte à
 * droite — le genre, le type et la date de naissance vivent sur la fiche, où on va
 * d'un appui.
 */
export function ligneAdherent(member: Member, saison: string): LigneAdherent {
  return {
    href: `/admin/members/${member.licence}?season=${saison}`,
    titre: `${member.lastName} ${member.firstName}`,
    sousTitre: `Licence ${member.licence}`,
    valeur: membershipStatusLabel(member.status),
    ton: membershipStatusTone(member.status),
  };
}
