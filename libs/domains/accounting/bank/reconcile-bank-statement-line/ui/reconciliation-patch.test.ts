import { describe, it, expect } from 'vitest';
import { createPatchActions } from './reconciliation-patch';
import type { BankStatementLine, ReconciliationStateFields } from './reconciliation-types';

const line = (over: Record<string, any> = {}): BankStatementLine => ({
  id: 1, fitid: 'F1', accountId: 'current', amount: 1000, amountCents: 1000,
  date: '2026-02-16', name: 'VIR DUPONT', memo: null, status: 'pending', aiSuggestions: null,
  ...over
});

const entry = (over: Record<string, any> = {}) => ({
  id: 10, type: 'recette', accountId: 1, amount: 1000, date: '2026-02-16',
  description: 'Cotisation', category: 'Adhésions', bankStatementLineId: 1, ...over
});

/** Un état minimal : seuls les champs que le rapiéçage touche ou lit. */
function makeState(over: Partial<ReconciliationStateFields> = {}) {
  return {
    bankStatementLines: [line(), line({ id: 2, name: 'PRLV ASSURANCE', amount: -880, amountCents: -880 })],
    glTransactions: [],
    displayedTransactions: [],
    selectedTx: null,
    ...over
  } as unknown as ReconciliationStateFields;
}

describe('applyOutcome', () => {
  it('remplace la ligne à sa place et normalise son montant', () => {
    const s = makeState();
    const patch = createPatchActions(s);

    // Le serveur renvoie la ligne brute : le montant n'y porte qu'un seul des deux noms.
    patch.applyOutcome({ line: { ...line(), amount: undefined, amountCents: 1000, status: 'reconciled' } as any, entries: [] });

    expect(s.bankStatementLines.map((l) => l.id)).toEqual([1, 2]);
    expect(s.bankStatementLines[0].status).toBe('reconciled');
    expect(s.bankStatementLines[0].amount).toBe(1000);
    expect(s.bankStatementLines[0].amountCents).toBe(1000);
  });

  it('ajoute les écritures créées au grand livre local', () => {
    const s = makeState();
    const patch = createPatchActions(s);

    patch.applyOutcome({ line: line({ status: 'reconciled' }) as any, entries: [entry()] as any });

    expect(s.glTransactions).toHaveLength(1);
    expect(s.glTransactions[0]).toMatchObject({ id: 10, bankStatementLineId: 1 });
  });

  it('met à jour une écriture existante sans la dupliquer', () => {
    const s = makeState({ glTransactions: [entry({ bankStatementLineId: null }) as any] });
    const patch = createPatchActions(s);

    patch.applyOutcome({ line: line({ status: 'reconciled' }) as any, entries: [entry()] as any });

    expect(s.glTransactions).toHaveLength(1);
    expect(s.glTransactions[0].bankStatementLineId).toBe(1);
  });

  /*
    `entries` est l'ensemble complet des écritures de la ligne après l'opération. Celles qui n'y
    figurent plus en ont été détachées : les garder ferait compter deux fois dans le total lié.
  */
  it('détache localement les écritures que le serveur ne renvoie plus', () => {
    const s = makeState({
      glTransactions: [entry({ id: 10 }) as any, entry({ id: 11 }) as any, entry({ id: 12, bankStatementLineId: 99 }) as any]
    });
    const patch = createPatchActions(s);

    patch.applyOutcome({ line: line() as any, entries: [entry({ id: 10 })] as any });

    // 11 était liée à cette ligne et disparaît ; 12 relève d'une autre ligne et reste.
    expect(s.glTransactions.map((gt) => gt.id).sort()).toEqual([10, 12]);
  });

  it('suit la sélection courante quand c\'est elle qui change', () => {
    const s = makeState({ selectedTx: line() as any });
    const patch = createPatchActions(s);

    patch.applyOutcome({ line: line({ status: 'reconciled' }) as any, entries: [] });

    expect(s.selectedTx?.status).toBe('reconciled');
  });
});

describe('applyStatus', () => {
  it('change l’état d’un lot de lignes en une passe', () => {
    const s = makeState();
    const patch = createPatchActions(s);

    patch.applyStatus([1, 2], 'reconciled');

    expect(s.bankStatementLines.every((l) => l.status === 'reconciled')).toBe(true);
  });

  it('laisse intactes les lignes hors du lot', () => {
    const s = makeState();
    const patch = createPatchActions(s);

    patch.applyStatus([2], 'reconciled');

    expect(s.bankStatementLines[0].status).toBe('pending');
    expect(s.bankStatementLines[1].status).toBe('reconciled');
  });
});

describe('applyDeletion', () => {
  /*
    Dissocier une jambe de virement en supprime deux, et fait retomber jusqu'à deux lignes de
    relevé en attente. Le client ne peut pas le déduire de l'identifiant qu'il a envoyé.
  */
  it('retire toutes les écritures supprimées et rouvre les lignes concernées', () => {
    const s = makeState({
      bankStatementLines: [line({ status: 'reconciled' }), line({ id: 2, status: 'reconciled' })],
      glTransactions: [entry({ id: 10 }) as any, entry({ id: 11, bankStatementLineId: 2 }) as any, entry({ id: 12, bankStatementLineId: 99 }) as any]
    });
    const patch = createPatchActions(s);

    patch.applyDeletion([10, 11], [1, 2]);

    expect(s.glTransactions.map((gt) => gt.id)).toEqual([12]);
    expect(s.bankStatementLines.every((l) => l.status === 'pending')).toBe(true);
  });

  it('ne rouvre aucune ligne quand le serveur n\'en désigne pas', () => {
    const s = makeState({
      bankStatementLines: [line({ status: 'reconciled' })],
      glTransactions: [entry({ id: 10 }) as any]
    });
    const patch = createPatchActions(s);

    patch.applyDeletion([10], []);

    expect(s.glTransactions).toHaveLength(0);
    expect(s.bankStatementLines[0].status).toBe('reconciled');
  });
});

describe('pickNextId / selectById', () => {
  it('désigne la ligne suivante de la file', () => {
    const queue = [line({ id: 1 }), line({ id: 2 }), line({ id: 3 })];
    const s = makeState({ bankStatementLines: queue, displayedTransactions: queue as any, selectedTx: queue[0] as any });
    const patch = createPatchActions(s);

    patch.selectById(patch.pickNextId(1));

    expect(s.selectedTx?.id).toBe(2);
  });

  it('recule sur la précédente en fin de file', () => {
    const queue = [line({ id: 1 }), line({ id: 2 })];
    const s = makeState({ bankStatementLines: queue, displayedTransactions: queue as any, selectedTx: queue[1] as any });
    const patch = createPatchActions(s);

    patch.selectById(patch.pickNextId(2));

    expect(s.selectedTx?.id).toBe(1);
  });

  it("ne désigne rien quand la ligne traitée était seule dans la file", () => {
    const queue = [line({ id: 1 })];
    const s = makeState({ bankStatementLines: queue, displayedTransactions: queue as any, selectedTx: queue[0] as any });
    const patch = createPatchActions(s);

    patch.selectById(patch.pickNextId(1));

    expect(s.selectedTx).toBeNull();
  });

  /*
    Le voisin doit se lire AVANT que la ligne ne quitte la file. Le repérer après revenait à ne
    pas la trouver — et l'écran repartait alors en tête de liste au lieu d'avancer.
  */
  it("désigne le voisin même si la ligne quitte la file entre-temps", () => {
    const queue = [line({ id: 1 }), line({ id: 2 }), line({ id: 3 })];
    const s = makeState({ bankStatementLines: queue, displayedTransactions: queue as any, selectedTx: queue[0] as any });
    const patch = createPatchActions(s);

    const nextId = patch.pickNextId(1);
    patch.applyStatus([1], 'reconciled');
    s.displayedTransactions = s.bankStatementLines.filter((l) => l.status === 'pending') as any;
    patch.selectById(nextId);

    expect(s.selectedTx?.id).toBe(2);
  });

  it("ne désigne rien pour une ligne absente de la file", () => {
    const queue = [line({ id: 5 }), line({ id: 6 })];
    const s = makeState({ bankStatementLines: queue, displayedTransactions: queue as any, selectedTx: line({ id: 1 }) as any });
    const patch = createPatchActions(s);

    patch.selectById(patch.pickNextId(1));

    expect(s.selectedTx).toBeNull();
  });
});

describe('applyOutcomes', () => {
  it('répartit les écritures du lot sur leurs lignes respectives', () => {
    const s = makeState();
    const patch = createPatchActions(s);

    patch.applyOutcomes(
      [line({ status: 'reconciled' }), line({ id: 2, status: 'reconciled' })] as any,
      [entry({ id: 10, bankStatementLineId: 1 }), entry({ id: 11, bankStatementLineId: 2 })] as any
    );

    expect(s.bankStatementLines.every((l) => l.status === 'reconciled')).toBe(true);
    expect(s.glTransactions.map((gt) => gt.id).sort()).toEqual([10, 11]);
  });
});
