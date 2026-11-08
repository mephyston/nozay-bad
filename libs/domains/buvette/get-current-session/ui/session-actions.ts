import { readApiError } from '@nba/ui';

const RELAIS = '/admin/api/buvette/session';

async function ecrire<T>(payload: Record<string, unknown>, echec: string): Promise<T> {
  const res = await fetch(RELAIS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(await readApiError(res, echec));
  return ((await res.json()) as { data: T }).data;
}

export const openCaisse = (openingFloatCents: number, accountingCategoryId: number) =>
  ecrire({ action: 'open_session', openingFloatCents, accountingCategoryId }, "La caisse n'a pas pu être ouverte.");

export const setSessionCategory = (accountingCategoryId: number) =>
  ecrire({ action: 'set_category', accountingCategoryId }, "La catégorie n'a pas pu être changée.");

export const closeCaisse = (sessionId: number, countedCashCents: number) =>
  ecrire<{ gapCents: number }>({ action: 'close_session', id: sessionId, countedCashCents }, "La caisse n'a pas pu être clôturée.");

export const abandonSale = (saleId: number) => ecrire({ action: 'abandon_sale', id: saleId }, "La vente n'a pas pu être abandonnée.");
