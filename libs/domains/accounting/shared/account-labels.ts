/**
 * Libellés et options des comptes de trésorerie, pour l'affichage.
 *
 * Module volontairement **pur**, sans base de données : les écrans reçoivent la liste des
 * comptes (le bilan de trésorerie, ou `GET /accounting/accounts`) et s'y réfèrent par ici.
 *
 * Il remplace quatre tables `{ current: 'Compte Courant', … }` recopiées dans le grand livre,
 * le rapport, l'export et le rapprochement : chacune figeait trois comptes, si bien qu'un
 * compte ajouté après le seed s'affichait « ? » dans le sens d'un virement. Les comptes sont
 * des données, leurs libellés aussi.
 */
export interface AccountLike {
  /** Identifiant numérique, celui que portent les écritures. */
  id?: number | string | null;
  code: string;
  label?: string | null;
}

/** Le compte désigné par un identifiant numérique ou par un code, sous l'une ou l'autre forme. */
export function findAccount<T extends AccountLike>(
  accounts: readonly T[],
  value: number | string | null | undefined
): T | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const wanted = String(value);
  return accounts.find((a) => a.code === wanted || (a.id !== null && a.id !== undefined && String(a.id) === wanted));
}

/** Le libellé d'un compte, ou la valeur telle quelle quand la liste ne le connaît pas. */
export function accountLabelOf(
  accounts: readonly AccountLike[],
  value: number | string | null | undefined
): string {
  const account = findAccount(accounts, value);
  if (account) return account.label || account.code;
  return value === null || value === undefined ? '?' : String(value);
}

/** Les options d'un sélecteur de compte. La valeur est le **code**, ce que l'API attend. */
export function toAccountOptions(accounts: readonly AccountLike[]): { value: string; label: string }[] {
  return accounts.map((a) => ({ value: a.code, label: a.label || a.code }));
}
