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
 *
 * À quoi s'ajoute, tous comptes confondus, un nombre qui n'appartient à aucun compte :
 * l'**argent en transit** (`computeTransitCents`), sorti d'un compte et pas encore arrivé dans
 * l'autre. Il ne fausse aucun des trois soldes — il explique pourquoi leur somme peut baisser
 * quelques jours sans qu'un euro soit perdu.
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
  amountCents?: number | null;
  status?: string | null;
  bankStatementLineId?: number | null;
  /** Le virement auquel l'écriture appartient, quand c'en est une jambe. */
  transferId?: number | null;
  /** De quel côté du virement : `source` retire l'argent du compte, `destination` l'y verse. */
  transferLeg?: 'source' | 'destination' | string | null;
  /** Nécessaire au seul calcul de l'argent en transit, qui compare les dates des deux jambes. */
  date?: string | null;
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
 * Depuis que le virement interne se tient en deux écritures liées, **toute** écriture ne touche
 * qu'un compte : celui qu'elle nomme. La jambe `source` en retire l'argent, la jambe
 * `destination` l'y verse. Il n'y a plus de cas particulier à deux comptes, et c'est ce qui rend
 * le pointage bancaire possible — chaque jambe fait face à sa propre ligne de relevé.
 */
export function signedEntryAmountCents(entry: TreasuryEntryLike, account: AccountRef): number {
  const amount = entry.amountCents ?? 0;
  if (!matchesAccount(entry.accountId, account)) return 0;

  if (entry.type === 'transfert') {
    if (entry.transferLeg === 'source') return -amount;
    if (entry.transferLeg === 'destination') return amount;
    return 0;
  }

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

/**
 * L'argent en transit à une date : sorti d'un compte, pas encore arrivé dans l'autre.
 *
 * C'est le décalage que l'ancien modèle ne savait pas dire. Un virement tenait en une écriture,
 * donc en une date : un dépôt d'espèces sorti de la caisse le 12 et crédité en banque le 15
 * s'écrivait forcément à l'un ou l'autre jour, et le solde était faux entre les deux — soit
 * l'argent était compté deux fois, soit il n'était compté nulle part.
 *
 * Chaque jambe portant désormais sa propre date de valeur, la trésorerie totale **baisse**
 * réellement pendant le trajet. C'est comptablement exact, mais illisible sans ce nombre : d'où
 * son affichage à part, plutôt qu'une correction qui remettrait l'argent dans un compte où il
 * n'est pas. C'est le rôle que le compte 58 « Virements internes » tient au plan comptable
 * général, sans avoir à faire figurer un compte où le club n'a jamais eu d'argent.
 *
 * Le signe suit l'intuition : positif quand de l'argent est en route.
 */
export function computeTransitCents(entries: TreasuryEntryLike[], asOfDate: string): number {
  const legsByTransfer = new Map<number, TreasuryEntryLike[]>();
  for (const entry of entries) {
    if (entry.type !== 'transfert' || entry.transferId === null || entry.transferId === undefined) continue;
    const legs = legsByTransfer.get(entry.transferId);
    if (legs) legs.push(entry);
    else legsByTransfer.set(entry.transferId, [entry]);
  }

  let transitCents = 0;
  for (const legs of legsByTransfer.values()) {
    const source = legs.find((l) => l.transferLeg === 'source');
    const destination = legs.find((l) => l.transferLeg === 'destination');
    /*
     * Un virement à jambe unique n'est pas de l'argent en transit mais une anomalie de saisie :
     * l'état de rapprochement le signale à part, sous son propre nom.
     */
    if (!source || !destination || !source.date || !destination.date) continue;
    if (source.date <= asOfDate && destination.date > asOfDate) {
      transitCents += source.amountCents ?? 0;
    }
  }
  return transitCents;
}

/**
 * Les virements dont une seule jambe est pointée.
 *
 * Sous l'ancien modèle, c'était l'état normal et inévitable : une écriture, un
 * `bank_statement_line_id`, deux lignes de relevé. Sous le nouveau, c'en est un oubli — et le
 * seul qui puisse encore faire mentir l'état de rapprochement, puisqu'une jambe pointée sort des
 * « écritures non pointées » pendant que sa ligne de relevé reste « non comptabilisée ».
 */
export function findHalfPointedTransferIds(entries: TreasuryEntryLike[]): number[] {
  const pointedByTransfer = new Map<number, { pointed: number; total: number }>();
  for (const entry of entries) {
    if (entry.type !== 'transfert' || entry.transferId === null || entry.transferId === undefined) continue;
    const tally = pointedByTransfer.get(entry.transferId) ?? { pointed: 0, total: 0 };
    tally.total += 1;
    if (entry.bankStatementLineId !== null && entry.bankStatementLineId !== undefined) tally.pointed += 1;
    pointedByTransfer.set(entry.transferId, tally);
  }

  return [...pointedByTransfer.entries()]
    .filter(([, t]) => t.total === 2 && t.pointed === 1)
    .map(([transferId]) => transferId)
    .sort((a, b) => a - b);
}
