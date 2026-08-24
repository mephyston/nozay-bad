/**
 * Le calcul des soldes de trésorerie, en un seul endroit.
 *
 * La même boucle « à-nouveau + Σ écritures » était réécrite quatre fois — grand livre,
 * rapports, clôture, encart de solde — et trois des quatre ignoraient `status`. Résultat :
 * quatre nombres qui se prétendaient tous « le solde », dont un seul tenait compte des
 * chèques encore en coffre. Le trésorier comparait l'encart du grand livre à son relevé,
 * ne tombait pas juste, et concluait que le logiciel comptait mal.
 *
 * Il n'y a pas deux soldes mais trois, et ce module les nomme :
 *
 * - `grossCents` — le **solde comptable** : à-nouveau + toutes les écritures saisies.
 *   C'est celui des livres ; c'est lui qui se reporte à-nouveau d'un exercice sur l'autre.
 * - `bankTheoreticalCents` — le **solde bancaire théorique** : ce que la banque devrait
 *   afficher, une fois retirées les écritures qui ne l'ont pas encore atteinte.
 * - le **solde bancaire réel**, qui ne se calcule pas : il vient du relevé et de lui seul
 *   (`bank_statement_balances`). Aucune écriture ne le déplace — c'est le fond de la
 *   remarque « une écriture ne doit pas impacter le solde bancaire ».
 *
 * L'écart entre les deux premiers tient à deux décalages, et à eux seuls :
 * un chèque encaissé dans les livres mais pas encore déposé (`in_vault`), et une dépense
 * saisie mais pas encore débitée (`pending_debit`, typiquement une CB à débit différé).
 */

/** Un compte de trésorerie, tel que `accounts` le porte. */
export interface AccountRef {
  id: number;
  code: string;
  label?: string;
}

/**
 * Une écriture, vue par le calcul de solde.
 *
 * `accountId` accepte l'identifiant numérique **ou** le code : les deux représentations
 * cohabitent dans le dépôt (les rapports raisonnent en codes, la base en identifiants), et
 * le calcul ne peut pas se permettre d'en manquer une — une écriture non reconnue disparaît
 * du solde sans le moindre message.
 */
export interface TreasuryEntryLike {
  type?: string | null;
  accountId?: number | string | null;
  destinationAccountId?: number | string | null;
  amountCents?: number | null;
  status?: string | null;
  bankStatementLineId?: number | null;
}

export interface AccountBalance {
  accountId: number;
  accountCode: string;
  accountLabel?: string;
  initialBalanceCents: number;
  /** À-nouveau + toutes les écritures. Le solde des livres. */
  grossCents: number;
  /** Recettes saisies mais encore en coffre : encaissées dans les livres, pas en banque. */
  inVaultCents: number;
  /** Dépenses saisies mais pas encore débitées par la banque. */
  pendingDebitCents: number;
  /** `grossCents − inVaultCents + pendingDebitCents` : ce que la banque devrait afficher. */
  bankTheoreticalCents: number;
}

/** Les mêmes agrégats, tous comptes confondus. */
export type AccountBalanceTotals = Omit<AccountBalance, 'accountId' | 'accountCode' | 'accountLabel'>;

/** Un à-nouveau, tel que `season_balances` le porte. */
export interface InitialBalanceLike {
  accountId?: number | string | null;
  initialBalanceCents?: number | null;
}

/**
 * Reconnaît un compte sous ses deux écritures possibles.
 *
 * `Number('current')` vaut `NaN`, qui n'est égal à rien : le test numérique ne peut donc pas
 * rattacher par erreur un code à un identifiant.
 */
export function matchesAccount(value: number | string | null | undefined, account: AccountRef): boolean {
  if (value === null || value === undefined) return false;
  if (value === account.id || value === account.code) return true;
  return typeof value === 'string' && value !== '' && Number(value) === account.id;
}

/**
 * Le montant d'une écriture, signé du point de vue d'un compte donné.
 *
 * Un transfert compte deux fois, en négatif sur le compte d'origine et en positif sur le
 * compte de destination : c'est le seul type d'écriture qui touche deux comptes.
 */
export function signedEntryAmountCents(entry: TreasuryEntryLike, account: AccountRef): number {
  const amount = entry.amountCents ?? 0;
  const isSource = matchesAccount(entry.accountId, account);

  if (entry.type === 'transfert') {
    let signed = 0;
    if (isSource) signed -= amount;
    if (matchesAccount(entry.destinationAccountId, account)) signed += amount;
    return signed;
  }

  if (!isSource) return 0;
  if (entry.type === 'recette') return amount;
  if (entry.type === 'depense') return -amount;
  return 0;
}

/**
 * L'à-nouveau d'un compte, cherché sous les deux représentations.
 */
export function findInitialBalanceCents(initialBalances: InitialBalanceLike[], account: AccountRef): number {
  const row = initialBalances.find((b) => matchesAccount(b.accountId, account));
  return row?.initialBalanceCents ?? 0;
}

export function computeAccountBalance(
  account: AccountRef,
  initialBalanceCents: number,
  entries: TreasuryEntryLike[]
): AccountBalance {
  let grossCents = initialBalanceCents;
  let inVaultCents = 0;
  let pendingDebitCents = 0;

  for (const entry of entries) {
    grossCents += signedEntryAmountCents(entry, account);

    /*
     * Les deux corrections ne valent que dans un sens chacune : un chèque « en coffre » est
     * forcément une recette qu'on a comptée trop tôt, un « débit en attente » forcément une
     * dépense qu'on a comptée trop tôt. Le statut posé sur l'autre sens n'aurait pas de
     * signification, et l'appliquer quand même ferait dériver le théorique du réel.
     */
    if (!matchesAccount(entry.accountId, account)) continue;
    if (entry.status === 'in_vault' && entry.type === 'recette') {
      inVaultCents += entry.amountCents ?? 0;
    } else if (entry.status === 'pending_debit' && entry.type === 'depense') {
      pendingDebitCents += entry.amountCents ?? 0;
    }
  }

  return {
    accountId: account.id,
    accountCode: account.code,
    accountLabel: account.label,
    initialBalanceCents,
    grossCents,
    inVaultCents,
    pendingDebitCents,
    bankTheoreticalCents: grossCents - inVaultCents + pendingDebitCents
  };
}

export function computeAccountBalances(
  accounts: AccountRef[],
  initialBalances: InitialBalanceLike[],
  entries: TreasuryEntryLike[]
): AccountBalance[] {
  return accounts.map((account) =>
    computeAccountBalance(account, findInitialBalanceCents(initialBalances, account), entries)
  );
}

export function sumAccountBalances(balances: AccountBalance[]): AccountBalanceTotals {
  return balances.reduce<AccountBalanceTotals>(
    (totals, b) => ({
      initialBalanceCents: totals.initialBalanceCents + b.initialBalanceCents,
      grossCents: totals.grossCents + b.grossCents,
      inVaultCents: totals.inVaultCents + b.inVaultCents,
      pendingDebitCents: totals.pendingDebitCents + b.pendingDebitCents,
      bankTheoreticalCents: totals.bankTheoreticalCents + b.bankTheoreticalCents
    }),
    { initialBalanceCents: 0, grossCents: 0, inVaultCents: 0, pendingDebitCents: 0, bankTheoreticalCents: 0 }
  );
}

/**
 * Le total signé des écritures d'un compte qui ne sont rattachées à aucune ligne de relevé.
 *
 * C'est l'une des deux jambes de l'état de rapprochement : ce que les livres portent et que
 * la banque n'a pas (encore) vu. La qualification par `status` en est un sous-ensemble —
 * un chèque en coffre est non pointé par construction — mais l'inverse est faux : une
 * écriture `cleared` jamais pointée est, elle, une anomalie à instruire.
 */
export function unpointedEntryTotalCents(entries: TreasuryEntryLike[], account: AccountRef): number {
  return entries
    .filter((e) => e.bankStatementLineId === null || e.bankStatementLineId === undefined)
    .reduce((sum, e) => sum + signedEntryAmountCents(e, account), 0);
}
