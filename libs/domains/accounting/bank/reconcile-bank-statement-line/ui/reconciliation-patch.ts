import type { BankStatementLine, GLTransaction, ReconciliationStateFields } from './reconciliation-types';

/**
 * Le rapiéçage local de l'état après une écriture.
 *
 * Chaque action se terminait par `flashAndReload` : une navigation douce sur la même URL, donc
 * un rendu serveur complet de la page et une ré-hydratation des deux îles, pour **une** ligne
 * rapprochée. Sur un relevé de deux cents lignes, c'était deux cents reconstructions de page —
 * et deux béquilles en `sessionStorage` pour retrouver le focus et le défilement au retour.
 *
 * Ce module applique à la place ce que le serveur vient de répondre. Tous les `$derived` de
 * l'état — compteurs, file affichée, écritures liées, reste à rapprocher — s'en déduisent seuls.
 */

/** Le relevé porte son montant sous deux noms selon la réponse ; l'écran lit les deux. */
function normalizeLine(line: any): BankStatementLine {
  const cents = line.amountCents ?? line.amount ?? 0;
  return { ...line, amount: cents, amountCents: cents };
}

export function createPatchActions(s: ReconciliationStateFields) {
  /** Remplace une ligne de relevé par sa version fraîche, en conservant sa place dans la liste. */
  function replaceLine(line: BankStatementLine) {
    const next = normalizeLine(line);
    s.bankStatementLines = s.bankStatementLines.map((l) => (l.id === next.id ? next : l));
    if (s.selectedTx?.id === next.id) s.selectedTx = next;
  }

  /**
   * Applique le compte rendu d'un rapprochement.
   *
   * `entries` est l'ensemble **complet** des écritures rattachées à la ligne après l'opération :
   * celles qui n'y figurent plus doivent donc en être détachées localement, sans quoi une
   * écriture dissociée continuerait de compter dans le total lié.
   */
  function applyOutcome(outcome: { line: BankStatementLine | null; entries: GLTransaction[] }) {
    const entries = outcome.entries ?? [];
    const lineId = outcome.line?.id ?? entries[0]?.bankStatementLineId ?? null;

    if (lineId !== null) {
      const keptIds = new Set(entries.map((e) => e.id));
      s.glTransactions = s.glTransactions.filter(
        (gt) => gt.bankStatementLineId !== lineId || keptIds.has(gt.id)
      );
    }

    const byId = new Map(s.glTransactions.map((gt) => [gt.id, gt]));
    for (const entry of entries) byId.set(entry.id, { ...byId.get(entry.id), ...entry });
    s.glTransactions = [...byId.values()];

    if (outcome.line) replaceLine(outcome.line);
  }

  /** Le même compte rendu, pour un lot. */
  function applyOutcomes(lines: BankStatementLine[], entries: GLTransaction[]) {
    const byLine = new Map<number, GLTransaction[]>();
    for (const entry of entries) {
      const id = entry.bankStatementLineId;
      if (id === null || id === undefined) continue;
      if (!byLine.has(id)) byLine.set(id, []);
      byLine.get(id)!.push(entry);
    }
    for (const line of lines) applyOutcome({ line, entries: byLine.get(line.id) ?? [] });
  }

  /** Un changement de statut seul : masquer, rétablir. Rien d'autre ne bouge en base. */
  function applyStatus(ids: number[], status: BankStatementLine['status']) {
    const targets = new Set(ids);
    s.bankStatementLines = s.bankStatementLines.map((l) => (targets.has(l.id) ? { ...l, status } : l));
    if (s.selectedTx && targets.has(s.selectedTx.id)) {
      s.selectedTx = { ...s.selectedTx, status };
    }
  }

  /**
   * Une dissociation. Le serveur dit ce qui a réellement disparu : dissocier une jambe de
   * virement en supprime deux, et fait retomber jusqu'à deux lignes de relevé en attente.
   */
  function applyDeletion(deletedEntryIds: number[], resetBankStatementLineIds: number[]) {
    const removed = new Set(deletedEntryIds);
    s.glTransactions = s.glTransactions.filter((gt) => !removed.has(gt.id));
    if (resetBankStatementLineIds.length > 0) applyStatus(resetBankStatementLineIds, 'pending');
  }

  /**
   * L'identifiant de la ligne à ouvrir ensuite — **à lire avant** d'appliquer le compte rendu.
   *
   * Une fois la ligne rapprochée ou masquée, elle a quitté la file : la chercher après coup ne
   * donne plus sa position, et l'écran repartait alors en tête de liste au lieu d'avancer. On
   * repère donc le voisin tant que la ligne traitée est encore là.
   */
  function pickNextId(currentId: number): number | null {
    const queue = s.displayedTransactions;
    const index = queue.findIndex((t) => t.id === currentId);
    if (index === -1) return null;
    return queue[index + 1]?.id ?? queue[index - 1]?.id ?? null;
  }

  /** Ouvre une ligne désignée par son identifiant, relue dans l'état courant. */
  function selectById(id: number | null) {
    s.selectedTx = id === null ? null : (s.bankStatementLines.find((l) => l.id === id) ?? null);
  }

  /** Les suggestions fraîchement calculées, posées sur les lignes concernées. */
  function applyAnalyzed(lines: BankStatementLine[]) {
    if (lines.length === 0) return;
    const byId = new Map(lines.map((l) => [l.id, normalizeLine(l)]));
    s.bankStatementLines = s.bankStatementLines.map((l) => byId.get(l.id) ?? l);
    if (s.selectedTx && byId.has(s.selectedTx.id)) s.selectedTx = byId.get(s.selectedTx.id)!;
  }

  return { applyOutcome, applyOutcomes, applyStatus, applyDeletion, applyAnalyzed, pickNextId, selectById, replaceLine };
}
