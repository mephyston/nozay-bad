import { readApiError } from '@nba/ui';
import type { BankStatementLine, GLTransaction, Invoice, SplitRow } from './reconciliation-types';

/**
 * Destinations des écritures : les relais du domaine, et non la page hôte.
 *
 * L'adresse de la page était écrite en dur ici, ce qui liait ce module à l'écran qui
 * l'hébergeait sans que rien ne le rappelle.
 *
 * L'import d'un relevé est un **dépôt de fichier** : il a sa propre route, où il porte
 * enfin `accounting:bank:import` — le catalogue déclarait cette permission, et elle
 * n'était appliquée nulle part, l'import s'exécutant avant toute garde.
 */
const RELAIS = '/admin/api/accounting/reconciliation';
const DEPOT_RELEVE = '/admin/api/accounting/upload?doc=bank-statement';

/**
 * Ce qu'une écriture de rapprochement renvoie désormais : la ligne de relevé telle qu'elle est
 * après l'opération, et les écritures qui lui sont rattachées. C'est de quoi remettre l'écran à
 * jour sur place, là où il ne savait que se recharger entier.
 */
export interface ReconcileOutcome {
  line: BankStatementLine | null;
  entries: GLTransaction[];
}

async function postAction<T>(body: unknown, fallbackError: string): Promise<T> {
  const res = await fetch(RELAIS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(await readApiError(res, fallbackError));
  return (await res.json()) as T;
}

function toOutcome(json: any): ReconcileOutcome {
  return { line: json?.line ?? null, entries: json?.entries ?? [] };
}

export async function apiLoadUnpaidInvoices(selectedSeason: string): Promise<Invoice[]> {
  const res = await fetch(RELAIS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'get-unpaid-invoices',
      season: selectedSeason
    })
  });
  if (!res.ok) throw new Error('Impossible de charger les factures');
  const json = (await res.json()) as any;
  return (json.data || [])
    .filter((inv: Invoice) => inv.status === 'draft' || inv.status === 'sent')
    .map((inv: any) => ({
      ...inv,
      totalAmount: inv.totalAmount ?? inv.totalAmountCents ?? 0,
      categoryBreakdown: inv.categoryBreakdown ?? []
    }));
}

export async function apiBulkReconcile(requests: any[]): Promise<{ lines: BankStatementLine[]; entries: GLTransaction[] }> {
  const json = await postAction<any>({ action: 'bulk', requests }, 'Erreur lors du rapprochement en masse.');
  return { lines: json?.lines ?? [], entries: json?.entries ?? [] };
}

export interface ImportSummary {
  read?: number;
  inserted?: number;
  skipped?: number;
  accountCode?: string;
  balanceRecorded?: boolean;
  balanceDate?: string | null;
}

export async function apiImportOfx(file: File, selectedAccount: string): Promise<ImportSummary> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('accountId', selectedAccount);
  const res = await fetch(DEPOT_RELEVE, { method: 'POST', body: formData });
  if (!res.ok) throw new Error(await readApiError(res, 'Erreur importation.'));
  try {
    const json = await res.json();
    return (json && typeof json === 'object' ? json : {}) as ImportSummary;
  } catch {
    // Une réponse sans corps exploitable ne doit pas faire échouer un import réussi.
    return {};
  }
}

export async function apiAnalyzeAi(season: string, btId?: number): Promise<{ count: number; lines: BankStatementLine[] }> {
  const body = btId ? { action: 'analyze', season, btId } : { action: 'analyze', season };
  const json = await postAction<any>(body, 'Erreur analyse.');
  return { count: json?.count ?? 0, lines: json?.lines ?? [] };
}

export async function apiMatchLedgerEntry(btId: number, ledgerEntryId: number, memberId: number | null): Promise<ReconcileOutcome> {
  return toOutcome(await postAction({ action: 'match', btId, ledgerEntryId, memberId }, 'Erreur association.'));
}

/**
 * L'exercice de rattachement est transmis, et il ne se déduit pas de la date.
 *
 * `get-season-reports` bâtit le compte de résultat sur `season_id` et la trésorerie sur
 * la **date** : une cotisation encaissée en août pour la rentrée porte la saison
 * suivante et une date d'août, et c'est ce que le cut-off décrit. Le déduire de la date
 * la faisait compter dans le résultat de l'exercice qui se clôture — soit précisément
 * l'erreur que le rattachement est censé empêcher.
 *
 * L'API garde son repli sur la date pour un appelant qui n'en transmet aucun.
 */
export async function apiCreateAndMatchSplit(bt: BankStatementLine, memberId: number | null, targetSeasonId: string, splits: SplitRow[], accrualType: string, accrualNote: string): Promise<ReconcileOutcome> {
  return toOutcome(await postAction({
      action: 'create',
      btId: bt.id,
      memberId,
      transactions: splits.map((s, index) => ({
        seasonId: targetSeasonId,
        type: (((bt as any).amountCents ?? bt.amount ?? 0) < 0)
          ? (s.amount >= 0 ? 'depense' : 'recette')
          : (s.amount >= 0 ? 'recette' : 'depense'),
        accountId: bt.accountId,
        category: s.category,
        amount: Math.round(Math.abs(s.amount) * 100),
        date: bt.date,
        /* Une ligne de relevé est, par définition, de l'argent passé par la banque. Le mode ne se
           demande plus : l'API retient le moyen actif de nature « virement ». */
        paymentMethod: '',
        description: s.label || `${bt.name} (Partie ${index + 1})`,
        reference: bt.memo || bt.fitid,
        /* La part l'emporte sur la valeur commune : c'est ce qui permet à un virement groupé de
           régler deux cotisations, ou trois factures, en une seule ligne de relevé. */
        memberId: s.memberId ?? memberId ?? null,
        invoiceId: s.invoiceId ?? null,
        accrualType,
        accrualNote
      }))
  }, 'Erreur création.'));
}

export async function apiCreateAndMatchSingle(
  bt: BankStatementLine,
  memberId: number | null,
  targetSeasonId: string,
  category: string,
  amountToLink: number,
  accrualType: string,
  accrualNote: string,
  /**
   * Sur une ligne au débit : l'argent rendu sur une recette (trop-perçu d'une cotisation). Il
   * part en recette **négative** dans sa catégorie — une diminution de produit, pas une charge.
   * Le cumul signé du rapprochement la compte bien au débit de la ligne.
   */
  refund = false
): Promise<ReconcileOutcome> {
  const btAmt = (bt as any).amountCents ?? bt.amount ?? 0;
  const rawAccountId = bt.accountId;
  const isRefund = refund && btAmt < 0;
  const cents = Math.round(amountToLink * 100);
  return toOutcome(await postAction({
      action: 'create',
      btId: bt.id,
      memberId,
      transaction: {
        seasonId: targetSeasonId,
        type: btAmt < 0 && !isRefund ? 'depense' : 'recette',
        accountId: rawAccountId,
        category,
        amount: isRefund ? -Math.abs(cents) : cents,
        date: bt.date,
        /* Une ligne de relevé est, par définition, de l'argent passé par la banque. Le mode ne se
           demande plus : l'API retient le moyen actif de nature « virement ». */
        paymentMethod: '',
        description: bt.name,
        reference: bt.memo || bt.fitid,
        accrualType,
        accrualNote
      }
  }, 'Erreur lors du rapprochement.'));
}

/**
 * Un virement interne, créé depuis une ligne de relevé.
 *
 * Deux jambes, une par compte, chacune avec sa date de valeur. La réponse porte les jambes et
 * leurs identifiants : c'est par eux que l'écran pointe ensuite la jambe de chaque compte contre
 * sa ligne de relevé. Le virement reçu d'une adhérente en est un cas particulier : sa jambe
 * `source` est le compte d'attente, qui n'a pas de relevé.
 */
export async function apiCreateInternalTransfer(input: {
  seasonId: string;
  sourceAccountId: string;
  destinationAccountId: string;
  amountCents: number;
  sourceDate: string;
  destinationDate: string;
  description: string;
  reference?: string | null;
}): Promise<{ legs: { id: number; transferLeg: 'source' | 'destination' }[] }> {
  const json = await postAction<any>(
    {
      action: 'create-transfer',
      seasonId: input.seasonId,
      sourceAccountId: input.sourceAccountId,
      destinationAccountId: input.destinationAccountId,
      amountCents: input.amountCents,
      sourceDate: input.sourceDate,
      destinationDate: input.destinationDate,
      description: input.description,
      reference: input.reference ?? null
    },
    "Le virement n'a pas pu être enregistré."
  );
  const legs = json?.legs ?? json?.data?.legs ?? [];
  if (!Array.isArray(legs) || legs.length === 0) throw new Error("Le virement a été créé sans ses jambes : impossible de le pointer.");
  return { legs };
}

/** Dissocier une jambe de virement en supprime deux : c'est le serveur qui dit lesquelles. */
export async function apiDeleteLedgerEntry(txId: number): Promise<{ deletedEntryIds: number[]; resetBankStatementLineIds: number[] }> {
  const json = await postAction<any>({ action: 'delete-transaction', txId }, 'Erreur lors de la suppression.');
  return {
    deletedEntryIds: json?.deletedEntryIds ?? [txId],
    resetBankStatementLineIds: json?.resetBankStatementLineIds ?? []
  };
}

/** L'état de rapprochement par compte — le seul nombre que le client ne peut pas recalculer. */
export async function apiLoadReconciliationStatements(season: string): Promise<any[]> {
  const json = await postAction<any>({ action: 'get-reconciliation-statements', season }, "Impossible de relire l'état de rapprochement.");
  return json?.data ?? [];
}


