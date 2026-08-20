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
