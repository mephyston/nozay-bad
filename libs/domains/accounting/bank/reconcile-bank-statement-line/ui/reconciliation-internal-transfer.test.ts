import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Hissé au-dessus des imports par vitest : la référence au faux `toast` vit dans `vi.hoisted`.
const { toastError, toastSuccess } = vi.hoisted(() => ({ toastError: vi.fn(), toastSuccess: vi.fn() }));
vi.mock('@nba/ui', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return { ...actual, toast: { success: toastSuccess, error: toastError } };
});

const { createReconciliationState } = await import('./reconciliation.svelte');
type BankStatementLine = import('./reconciliation-types').BankStatementLine;

/**
 * Le virement entre deux comptes du club, depuis l'une de ses lignes de relevé : création du
 * virement, pointage de la jambe de ce compte, et de celle d'en face quand sa ligne est là.
 */
describe('handleInternalTransfer', () => {
  const originalFetch = globalThis.fetch;
  let appels: any[] = [];

  /** Le débit sur le courant, le 2 ; le crédit sur le livret, le 3 : l'argent a dormi une nuit. */
  const debit: BankStatementLine = {
    id: 7, fitid: 'FIT-7', accountId: '1', amount: -50_000, date: '2026-09-02',
    name: 'VIR VERS LIVRET A', memo: null, status: 'pending', aiSuggestions: null
  };
  const credit: BankStatementLine = {
    id: 8, fitid: 'FIT-8', accountId: '2', amount: 50_000, date: '2026-09-03',
    name: 'VIR DE COMPTE COURANT', memo: null, status: 'pending', aiSuggestions: null
  };

  const etat = (lines: BankStatementLine[] = [debit, credit]) => createReconciliationState({
    bankStatementLines: lines,
    glTransactions: [],
    seasonId: '26-27',
    seasons: [
      { id: '25-26', name: '2025-2026', active: false, startDate: '2025-09-01', endDate: '2026-08-31' },
      { id: '26-27', name: '2026-2027', active: true, startDate: '2026-09-01', endDate: '2027-08-31' }
    ],
    members: [],
    accounts: [
      { id: 1, code: 'current', label: 'Compte Courant', kind: 'bank' },
      { id: 2, code: 'savings', label: 'Livret A', kind: 'bank' },
      { id: 3, code: 'cash', label: 'Caisse', kind: 'cash' },
      { id: 5, code: 'member_advances', label: 'Avances', kind: 'third_party' }
    ]
  });

  const legs = [{ id: 41, transferLeg: 'source' }, { id: 42, transferLeg: 'destination' }];
  const repond = (handler: (body: any) => { ok?: boolean; json: any }) => {
    globalThis.fetch = vi.fn().mockImplementation(async (_url: string, init: any) => {
      const body = JSON.parse(init.body);
      appels.push(body);
      const { ok = true, json } = handler(body);
      return new Response(JSON.stringify(json), { status: ok ? 200 : 400 });
    }) as any;
  };
  const pointe = (body: any) => {
    const line = [debit, credit].find((l) => l.id === body.btId)!;
    return { json: { line: { ...line, status: 'reconciled' }, entries: [{ id: body.ledgerEntryId, bankStatementLineId: body.btId }] } };
  };

  beforeEach(() => { appels = []; toastError.mockClear(); toastSuccess.mockClear(); });
  afterEach(() => { globalThis.fetch = originalFetch; });

  it('propose les comptes actifs sauf celui de la ligne et le compte d’attente', () => {
    const s = etat();
    expect(s.transferCounterpartsFor(debit).map((a) => a.code)).toEqual(['savings', 'cash']);
    expect(s.transferCounterpartsFor(credit).map((a) => a.code)).toEqual(['current', 'cash']);
  });

  it('retrouve la ligne d’en face : même montant, sens opposé, ±7 jours, seule à correspondre', () => {
    const s = etat();
    expect(s.findTransferCounterpartLine(debit, 2)?.id).toBe(8);
    expect(s.findTransferCounterpartLine(credit, 1)?.id).toBe(7);
    // Pas de relevé de caisse.
    expect(s.findTransferCounterpartLine(debit, 3)).toBeNull();
    // Deux candidates : aucune n'est choisie.
    expect(etat([debit, credit, { ...credit, id: 9, date: '2026-09-04' }]).findTransferCounterpartLine(debit, 2)).toBeNull();
    // Trop loin, déjà rapprochée, ou mauvais sens.
    expect(etat([debit, { ...credit, date: '2026-09-20' }]).findTransferCounterpartLine(debit, 2)).toBeNull();
    expect(etat([debit, { ...credit, status: 'reconciled' }]).findTransferCounterpartLine(debit, 2)).toBeNull();
    expect(etat([debit, { ...credit, amount: -50_000 }]).findTransferCounterpartLine(debit, 2)).toBeNull();
  });

  it('depuis le débit : crée courant → livret aux deux dates de valeur, pointe les deux lignes', async () => {
    repond((body) => {
      if (body.action === 'create-transfer') return { json: { legs } };
      if (body.action === 'match') return pointe(body);
      return { json: [] };
    });
    const s = etat();

    await s.handleInternalTransfer(debit, 2, 'Épargne de rentrée');

    expect(appels.find((a) => a.action === 'create-transfer')).toMatchObject({
      seasonId: '26-27', sourceAccountId: '1', destinationAccountId: 'savings',
      amountCents: 50_000, sourceDate: '2026-09-02', destinationDate: '2026-09-03', description: 'Épargne de rentrée'
    });
    const pointages = appels.filter((a) => a.action === 'match');
    expect(pointages).toEqual([
      expect.objectContaining({ btId: 7, ledgerEntryId: 41 }),
      expect.objectContaining({ btId: 8, ledgerEntryId: 42 })
    ]);
    expect(s.bankStatementLines.map((l) => l.status)).toEqual(['reconciled', 'reconciled']);
    expect(toastError).not.toHaveBeenCalled();
    expect(s.isSubmitting).toBe(false);
  });

  it('depuis le crédit : la ligne est la jambe destination, et la source prend la date du débit', async () => {
    repond((body) => {
      if (body.action === 'create-transfer') return { json: { legs } };
      if (body.action === 'match') return pointe(body);
      return { json: [] };
    });
    const s = etat();

    await s.handleInternalTransfer(credit, 1, 'Épargne de rentrée');

    expect(appels.find((a) => a.action === 'create-transfer')).toMatchObject({
      sourceAccountId: 'current', destinationAccountId: '2', sourceDate: '2026-09-02', destinationDate: '2026-09-03'
    });
    expect(appels.filter((a) => a.action === 'match')).toEqual([
      expect.objectContaining({ btId: 8, ledgerEntryId: 42 }),
      expect.objectContaining({ btId: 7, ledgerEntryId: 41 })
    ]);
  });

  it('sans ligne d’en face : une seule jambe pointée, et le message dit où associer l’autre', async () => {
    repond((body) => {
      if (body.action === 'create-transfer') return { json: { legs } };
      if (body.action === 'match') return pointe(body);
      return { json: [] };
    });
    const s = etat([debit]);

    await s.handleInternalTransfer(debit, 3, 'Retrait pour la caisse');

    expect(appels.find((a) => a.action === 'create-transfer')).toMatchObject({
      sourceAccountId: '1', destinationAccountId: 'cash', sourceDate: '2026-09-02', destinationDate: '2026-09-02'
    });
    expect(appels.filter((a) => a.action === 'match')).toHaveLength(1);
    expect(toastSuccess).toHaveBeenCalledWith(expect.stringContaining('Caisse'));
  });

  it('un crédit daté avant le débit ramène les deux jambes à la date de la ligne', async () => {
    repond((body) => {
      if (body.action === 'create-transfer') return { json: { legs } };
      if (body.action === 'match') return pointe(body);
      return { json: [] };
    });
    const s = etat([debit, { ...credit, date: '2026-09-01' }]);

    await s.handleInternalTransfer(debit, 2, 'Épargne');

    expect(appels.find((a) => a.action === 'create-transfer')).toMatchObject({ sourceDate: '2026-09-02', destinationDate: '2026-09-02' });
  });

  it("deux dates sur deux exercices : l'autre jambe prend la date de la ligne, l'exercice est celui de la ligne", async () => {
    repond((body) => {
      if (body.action === 'create-transfer') return { json: { legs } };
      if (body.action === 'match') return pointe(body);
      return { json: [] };
    });
    const s = etat([{ ...debit, date: '2026-08-31' }, credit]);

    await s.handleInternalTransfer({ ...debit, date: '2026-08-31' }, 2, 'Épargne');

    expect(appels.find((a) => a.action === 'create-transfer')).toMatchObject({
      seasonId: '25-26', sourceDate: '2026-08-31', destinationDate: '2026-08-31'
    });
  });

  it('supprime le virement quand le premier pointage échoue', async () => {
    repond((body) => {
      if (body.action === 'create-transfer') return { json: { legs } };
      if (body.action === 'match') return { ok: false, json: { error: 'Refusé.' } };
      if (body.action === 'delete-transaction') return { json: { deletedEntryIds: [41, 42], resetBankStatementLineIds: [] } };
      return { json: [] };
    });
    const s = etat();

    await s.handleInternalTransfer(debit, 2, 'Épargne');

    expect(appels.map((a) => a.action)).toEqual(['create-transfer', 'match', 'delete-transaction']);
    expect(appels[2].txId).toBe(41);
    expect(toastError).toHaveBeenCalledWith('Refusé.');
    expect(s.isSubmitting).toBe(false);
  });

  it("garde le virement quand seul le pointage d'en face échoue, et le dit", async () => {
    repond((body) => {
      if (body.action === 'create-transfer') return { json: { legs } };
      if (body.action === 'match') return body.btId === 8 ? { ok: false, json: { error: 'Ligne déjà couverte.' } } : pointe(body);
      return { json: [] };
    });
    const s = etat();

    await s.handleInternalTransfer(debit, 2, 'Épargne');

    expect(appels.some((a) => a.action === 'delete-transaction')).toBe(false);
    expect(s.bankStatementLines.map((l) => l.status)).toEqual(['reconciled', 'pending']);
    expect(toastError).toHaveBeenCalledWith(expect.stringContaining('Ligne déjà couverte.'));
    expect(s.isSubmitting).toBe(false);
  });

  it('refuse le compte de la ligne comme compte d’en face, sans rien appeler', async () => {
    repond(() => ({ json: [] }));
    const s = etat();

    await s.handleInternalTransfer(debit, 1, 'Épargne');

    expect(appels).toEqual([]);
    expect(toastError).toHaveBeenCalledWith("Le compte d'en face doit être différent de celui de la ligne.");
  });
});
