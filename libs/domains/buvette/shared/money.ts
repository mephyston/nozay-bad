/** Un montant saisi en euros (« 2,50 »), en centimes. `null` s'il n'est pas lisible. */
export function parseEuros(value: string): number | null {
  const normalized = value.trim().replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  return Math.round(Number(normalized) * 100);
}
