import { readApiError } from '@nba/ui';

/** Passe par l'écran de session : l'interrupteur s'y manœuvre, à côté de la caisse ouverte. */
export async function setCardPayments(enabled: boolean): Promise<void> {
  const res = await fetch('/admin/api/buvette/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'set_card_payments', enabled })
  });
  if (!res.ok) throw new Error(await readApiError(res, enabled ? "La CB n'a pas pu être rétablie." : "La CB n'a pas pu être suspendue."));
}
