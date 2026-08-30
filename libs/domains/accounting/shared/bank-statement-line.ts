import { signedEntryAmountCents, type AccountRef, type TreasuryEntryLike } from './balances';

export class BankStatementLine {
  id: number;
  status: string;
  amount: number;
  date: string;
  label: string;

  constructor(data: any) {
    this.id = data.id;
    this.status = data.status || 'pending';
    this.amount = data.amountCents ?? data.amount ?? 0;
    this.date = data.date;
    this.label = data.name ?? data.label ?? '';
  }

  canBeReconciled(): boolean {
    return this.status === 'pending';
  }
}

/**
 * Une écriture rattachée à une ligne de relevé, quelle que soit la forme sous laquelle elle
 * arrive.
 *
 * La base la nomme `amountCents` (c'est le nom Drizzle de la colonne) ; l'écran la reçoit sous
 * `amount`, parce que `list-ledger-entries` l'aliase ainsi. Les deux formes se lisent **ici**,
 * une fois pour toutes : le cumul du rapprochement lisait `t.amount` sur des lignes venues de
 * la base, donc `undefined`, donc `NaN` — et la ligne partiellement pointée ne se soldait
 * jamais, sans qu'aucun message ne le dise.
 */
export interface LinkedEntryLike extends TreasuryEntryLike {
  amount?: number | null;
}

/** La ligne de relevé, réduite à ce dont la couverture a besoin. */
export interface CoverableBankLine {
  accountId?: number | string | null;
  amountCents?: number | null;
  amount?: number | null;
}

function lineAccount(line: CoverableBankLine): AccountRef {
  /*
   * Le code du compte n'est pas relu en base : `matchesAccount` compare d'abord les
   * identifiants, et une écriture venue de la base en porte toujours un. La chaîne vide ne
   * peut rattacher aucune écriture par erreur — `accountId` est `NOT NULL` et entier.
   */
  const raw = line.accountId;
  return { id: typeof raw === 'number' ? raw : Number(raw), code: typeof raw === 'string' ? raw : '' };
}

function lineAmountCents(line: CoverableBankLine): number {
  return line.amountCents ?? line.amount ?? 0;
}

/**
 * Ce que les écritures rattachées couvrent d'une ligne de relevé, **signé**.
 *
 * Le cumul précédent additionnait des `Math.abs` : une recette et une dépense s'ajoutaient au
 * lieu de se compenser. Or un salaire net se ventile précisément ainsi — un brut au débit et
 * une retenue au crédit sur la même ligne de relevé. Le sens vient de `signedEntryAmountCents`,
 * seul endroit qui sache qu'une jambe `source` retire l'argent et une jambe `destination` l'y
 * verse.
 */
export function coverageCents(entries: LinkedEntryLike[], line: CoverableBankLine): number {
  const account = lineAccount(line);
  return entries.reduce(
    (sum, entry) => sum + signedEntryAmountCents({ ...entry, amountCents: entry.amountCents ?? entry.amount ?? 0 }, account),
    0
  );
}

/**
 * Ce qu'il reste à rapprocher sur une ligne, exprimé **dans son sens** et donc positif.
 *
 * Zéro : la ligne est exactement couverte, elle peut basculer. Négatif : les écritures
 * rattachées dépassent le montant de la ligne — un état que le rapprochement refuse désormais
 * de créer.
 */
export function remainingToReconcileCents(entries: LinkedEntryLike[], line: CoverableBankLine): number {
  const amount = lineAmountCents(line);
  // Le `+ 0` ramène le `-0` d'une ligne au débit exactement couverte à un zéro ordinaire.
  return (amount - coverageCents(entries, line)) * (amount < 0 ? -1 : 1) + 0;
}
