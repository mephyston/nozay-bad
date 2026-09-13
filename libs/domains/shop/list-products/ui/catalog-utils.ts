import type { Member } from './catalog-types';
import { CASH_PAYMENT_METHODS, paymentMethodsList } from './catalog-types';

export function formatMemberName(m: Member | null): string {
  if (!m) return '';
  const maskedLast = m.lastName
    ? (m.lastName.length > 2 && !m.lastName.endsWith('.') ? `${m.lastName[0]}.` : m.lastName)
    : '';
  return `${maskedLast} ${m.firstName}`.trim();
}

export function formatLicence(licence: string): string {
  if (!licence) return '***';
  if (licence.includes('*')) return licence;
  if (licence.length <= 4) return '***';
  return `${licence.slice(0, 2)}***${licence.slice(-2)}`;
}

/** Libellé lisible d'un mode de paiement ; la valeur brute à défaut. */
export function paymentMethodLabel(value: string): string {
  return paymentMethodsList.find((pm) => pm.value === value)?.label ?? value;
}

/**
 * Le paiement demande-t-il encore un geste hors de l'application ?
 *
 * Virement, chèque et coupons se règlent ailleurs ou plus tard ; les espèces, elles,
 * ne rejoignent la caisse que si quelqu'un les remet à l'entraîneur ou au trésorier.
 * Sans le dire au moment de la commande, l'adhérent repart en croyant avoir payé.
 */
export function requiresCashHandover(paymentMethod: string): boolean {
  return CASH_PAYMENT_METHODS.includes(paymentMethod);
}

/**
 * Motif suggéré pour le libellé d'un virement : l'article puis le nom complet.
 *
 * Un virement arrive sur le relevé sans autre indice que son libellé ; quand il est
 * vide ou vaut « virement », le trésorier doit deviner à qui et à quoi l'attribuer.
 * Le nom n'est pas masqué ici, contrairement à l'affichage : le libellé est destiné au
 * relevé du club, pas à l'écran.
 */
export function transferReference(productName: string, member: Member | null): string {
  return [productName, member?.firstName, member?.lastName]
    .map((part) => part?.trim() ?? '')
    .filter(Boolean)
    .join(' ');
}

/** Le paiement se fait-il par virement, auquel cas il faut donner les coordonnées du club ? */
export function requiresBankTransfer(paymentMethod: string): boolean {
  return paymentMethod === 'virement';
}

/**
 * Coordonnées bancaires du club, affichées à l'adhérent qui commande par virement.
 *
 * Elles viennent de la configuration du club (`club_settings`), passées par la page :
 * la boutique n'en connaît pas d'autre, et les factures lisent les mêmes.
 */
export interface ClubBankDetails {
  holder: string;
  iban: string;
  bic: string;
}
