import { readApiError } from '@nba/ui';
import { parseEuros } from '../../shared/money';

const RELAIS = '/admin/api/buvette/catalog';

export interface CatalogItem {
  id: number;
  name: string;
  priceCents: number;
  active: boolean;
  sortOrder: number;
  icon: string | null;
}

export interface CatalogItemValues {
  name: string;
  priceEuros: string;
  active: boolean;
  /** Vide : deviné d'après le nom. */
  icon: string;
}

export { parseEuros };

async function ecrire(payload: Record<string, unknown>, echec: string): Promise<void> {
  const res = await fetch(RELAIS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(await readApiError(res, echec));
}

export function validateItem(values: CatalogItemValues): string | null {
  if (!values.name.trim()) return 'Donnez un nom à cet article.';
  if (parseEuros(values.priceEuros) === null) return 'Saisissez un prix en euros, par exemple 2,50.';
  return null;
}

export function saveItem(id: number | null, values: CatalogItemValues, sortOrder: number): Promise<void> {
  return ecrire(
    {
      action: id === null ? 'create_item' : 'update_item',
      ...(id === null ? {} : { id }),
      name: values.name.trim(),
      priceCents: parseEuros(values.priceEuros),
      active: values.active,
      sortOrder,
      icon: values.icon || null
    },
    "L'article n'a pas pu être enregistré."
  );
}

export function saveMaxBalance(settings: Record<string, unknown>, maxBalanceCents: number): Promise<void> {
  return ecrire(
    {
      action: 'save_settings',
      maxBalanceCents,
      cashPaymentMethodId: settings.cashPaymentMethodId,
      prepaidPaymentMethodId: settings.prepaidPaymentMethodId,
      cardPaymentMethodId: settings.cardPaymentMethodId,
      gapCategoryId: settings.gapCategoryId
    },
    "Le plafond n'a pas pu être enregistré."
  );
}
