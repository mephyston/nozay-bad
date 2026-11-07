import { readApiError } from '@nba/ui';

const RELAIS = '/admin/api/buvette/catalog';

export interface CatalogItem {
  id: number;
  name: string;
  priceCents: number;
  accountingCategoryId: number;
  active: boolean;
  sortOrder: number;
}

export interface CatalogItemValues {
  name: string;
  priceEuros: string;
  accountingCategoryId: number;
  active: boolean;
}

/** Un montant saisi en euros (« 2,50 »), en centimes. `null` s'il n'est pas lisible. */
export function parseEuros(value: string): number | null {
  const normalized = value.trim().replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  return Math.round(Number(normalized) * 100);
}

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
  if (!values.accountingCategoryId) return 'Choisissez une catégorie comptable.';
  return null;
}

export function saveItem(id: number | null, values: CatalogItemValues, sortOrder: number): Promise<void> {
  return ecrire(
    {
      action: id === null ? 'create_item' : 'update_item',
      ...(id === null ? {} : { id }),
      name: values.name.trim(),
      priceCents: parseEuros(values.priceEuros),
      accountingCategoryId: values.accountingCategoryId,
      active: values.active,
      sortOrder
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
      gapCategoryId: settings.gapCategoryId
    },
    "Le plafond n'a pas pu être enregistré."
  );
}
