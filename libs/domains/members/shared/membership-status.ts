/**
 * Statut d'une adhésion, tel qu'affiché face à chaque adhérent et tel qu'il ouvre ou non
 * l'espace adhérent.
 *
 * Il se déduit du règlement de la cotisation lu dans l'export Poona — et de lui seul, à une
 * exception près : un dossier que Poona dit annulé reste `suspendu`, quels que soient les
 * montants. Avant le 2026-09-06, le statut recopiait la colonne « dossier » de Poona
 * (finalisé → valide, sinon suspendu) : un adhérent qui n'avait pas encore payé s'affichait
 * donc « Suspendu », ce qui n'est pas ce que le mot veut dire.
 */
export type MembershipStatus = 'valide' | 'suspendu' | 'incomplet' | 'en_attente';

export const MEMBERSHIP_STATUSES: readonly MembershipStatus[] = ['valide', 'incomplet', 'en_attente', 'suspendu'];

export const MEMBERSHIP_STATUS_LABELS: Record<MembershipStatus, string> = {
  valide: 'Validé',
  incomplet: 'Paiement partiel',
  en_attente: 'En attente de paiement',
  suspendu: 'Suspendu'
};

/** Variante de `Badge` (@nba/ui) associée à chaque statut. */
export const MEMBERSHIP_STATUS_VARIANTS: Record<MembershipStatus, 'success' | 'warning' | 'secondary' | 'destructive'> = {
  valide: 'success',
  incomplet: 'warning',
  en_attente: 'secondary',
  suspendu: 'destructive'
};

export function membershipStatusLabel(status: string): string {
  return MEMBERSHIP_STATUS_LABELS[status as MembershipStatus] ?? status;
}

export function membershipStatusVariant(status: string): 'success' | 'warning' | 'secondary' | 'destructive' {
  return MEMBERSHIP_STATUS_VARIANTS[status as MembershipStatus] ?? 'secondary';
}

/**
 * L'espace adhérent s'ouvre dès qu'un règlement, même partiel, a été reçu. Un dossier
 * annulé ou sans le moindre versement n'entre pas.
 */
export function membershipGrantsAccess(status: string): boolean {
  return status === 'valide' || status === 'incomplet';
}

/**
 * Les statuts qui font un adhérent de la saison, quel que soit l'état de son règlement.
 *
 * C'est le périmètre de ce que le club montre et annonce à ses membres — les
 * anniversaires en premier lieu : un dossier en attente de paiement est un adhérent,
 * un dossier annulé n'en est plus un. Distinct de `membershipGrantsAccess`, qui décide
 * de l'entrée dans l'espace adhérent et exige un premier versement.
 */
export const ENROLLED_MEMBERSHIP_STATUSES: readonly MembershipStatus[] = ['valide', 'incomplet', 'en_attente'];

export interface MembershipStatusInput {
  /** Colonne « Statut » ou « Adhérent validé » de l'export, brute. */
  rawStatus: string;
  /** Colonne « État de dossier » de Poona (« Dossier finalisé », « Dossier annulé »…), si présente. */
  rawDossier?: string;
  /** Le fichier porte-t-il les colonnes de règlement (« Payé », « Montant reçu »…) ? */
  hasPaymentColumns: boolean;
  paid: boolean;
  amountReceivedCents: number;
  amountRemainingCents: number;
}

/** Le dossier est-il annulé côté Poona (ou marqué suspendu par un export de l'application) ? */
function isCancelled(rawStatus: string, rawDossier: string): boolean {
  const value = rawStatus.trim().toLowerCase();
  return value === 'suspendu' || value.includes('annulé') || rawDossier.trim().toLowerCase().includes('annulé');
}

/**
 * Dérive le statut d'une adhésion à l'import.
 *
 * - dossier annulé → `suspendu`, avant tout autre critère ;
 * - avec les colonnes de règlement : soldé (`Payé` = Oui ou plus rien à devoir) → `valide`,
 *   un versement reçu mais un reste dû → `incomplet`, rien reçu → `en_attente` ;
 * - sans elles (export minimal), on ne sait rien du paiement : dossier finalisé ou colonne
 *   absente → `valide`, « Non » → `en_attente`.
 */
export function deriveMembershipStatus(input: MembershipStatusInput): MembershipStatus {
  if (isCancelled(input.rawStatus, input.rawDossier ?? '')) return 'suspendu';

  if (input.hasPaymentColumns) {
    if (input.paid || input.amountRemainingCents <= 0) return 'valide';
    return input.amountReceivedCents > 0 ? 'incomplet' : 'en_attente';
  }

  return input.rawStatus.trim().toLowerCase() === 'non' ? 'en_attente' : 'valide';
}
