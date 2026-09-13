import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Hissé au-dessus des imports par vitest : la référence au faux `toast` vit dans `vi.hoisted`.
const { toastError } = vi.hoisted(() => ({ toastError: vi.fn() }));
vi.mock('@nba/ui', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return { ...actual, toast: { success: vi.fn(), error: toastError } };
});

const { createReconciliationState } = await import('./reconciliation.svelte');
type BankStatementLine = import('./reconciliation-types').BankStatementLine;

/**
 * Le virement reçu d'une adhérente, depuis sa ligne de relevé : deux appels au relais, la
 * création du virement puis le pointage de sa jambe bancaire — et la suppression du virement
 * si le pointage échoue, pour ne rien laisser d'orphelin.
 */
describe('handleMemberTransfer', () => {
  const originalFetch = globalThis.fetch;
  let appels: any[] = [];

  const line: BankStatementLine = {
    id: 7, fitid: 'FIT-7', accountId: 'current', amount: 2500, date: '2026-09-02',
    name: 'VIR MLE DUPONT', memo: null, status: 'pending', aiSuggestions: null
  };

  const etat = () => createReconciliationState({
    bankStatementLines: [line],
    glTransactions: [],
    seasonId: '26-27',
    seasons: [
      { id: '25-26', name: '2025-2026', active: false, startDate: '2025-09-01', endDate: '2026-08-31' },
      { id: '26-27', name: '2026-2027', active: true, startDate: '2026-09-01', endDate: '2027-08-31' }
    ],
    members: [],
    // Le compte d'attente et le compte de la ligne se lisent des comptes du club, par nature.
    accounts: [
      { id: 1, code: 'current', label: 'Compte Courant', kind: 'bank' },
      { id: 5, code: 'member_advances', label: 'Avances', kind: 'third_party' }
    ]
  });

  const repond = (handler: (body: any) => { ok?: boolean; json: any }) => {
    globalThis.fetch = vi.fn().mockImplementation(async (_url: string, init: any) => {
      const body = JSON.parse(init.body);
      appels.push(body);
      const { ok = true, json } = handler(body);
      return new Response(JSON.stringify(json), { status: ok ? 200 : 400 });
    }) as any;
  };

  beforeEach(() => { appels = []; toastError.mockClear(); });
  afterEach(() => { globalThis.fetch = originalFetch; });

  it('crée le virement compte d’attente → courant, puis pointe sa jambe bancaire', async () => {
    repond((body) => {
      if (body.action === 'create-transfer') return { json: { legs: [{ id: 41, transferLeg: 'source' }, { id: 42, transferLeg: 'destination' }] } };
      if (body.action === 'match') return { json: { line: { ...line, status: 'reconciled' }, entries: [{ id: 42, bankStatementLineId: 7 }] } };
      return { json: [] };
    });
    const s = etat();

    await s.handleMemberTransfer(line, 'Reçu de Mme Dupont');

    const creation = appels.find((a) => a.action === 'create-transfer');
    expect(creation).toMatchObject({
      seasonId: '26-27', sourceAccountId: 'member_advances', destinationAccountId: 'current',
      amountCents: 2500, sourceDate: '2026-09-02', destinationDate: '2026-09-02', description: 'Reçu de Mme Dupont'
    });
    const pointage = appels.find((a) => a.action === 'match');
    expect(pointage).toMatchObject({ btId: 7, ledgerEntryId: 42 });
    expect(appels.some((a) => a.action === 'delete-transaction')).toBe(false);
    expect(toastError).not.toHaveBeenCalled();
    expect(s.bankStatementLines[0].status).toBe('reconciled');
  });

  it("rattache le virement à l'exercice de la date de la ligne, pas à celui affiché", async () => {
    repond((body) => {
      if (body.action === 'create-transfer') return { json: { legs: [{ id: 41, transferLeg: 'source' }, { id: 42, transferLeg: 'destination' }] } };
      if (body.action === 'match') return { json: { line: { ...line, status: 'reconciled' }, entries: [{ id: 42, bankStatementLineId: 7 }] } };
      return { json: [] };
    });
    const s = etat();

    // Une ligne d'août, rapprochée depuis 26-27 : sans cela, la garde d'exercice refusait.
    await s.handleMemberTransfer({ ...line, date: '2026-08-21' }, 'Reçu de Mme Eyharts');

    const creation = appels.find((a) => a.action === 'create-transfer');
    expect(creation).toMatchObject({ seasonId: '25-26', sourceDate: '2026-08-21' });
  });

  it('supprime le virement quand le pointage échoue, et le dit', async () => {
    repond((body) => {
      if (body.action === 'create-transfer') return { json: { legs: [{ id: 41, transferLeg: 'source' }, { id: 42, transferLeg: 'destination' }] } };
      if (body.action === 'match') return { ok: false, json: { error: 'Cette écriture appartient à un autre compte que la ligne de relevé.' } };
      if (body.action === 'delete-transaction') return { json: { deletedEntryIds: [41, 42], resetBankStatementLineIds: [] } };
      return { json: [] };
    });
    const s = etat();

    await s.handleMemberTransfer(line, 'Reçu de Mme Dupont');

    expect(appels.map((a) => a.action)).toEqual(['create-transfer', 'match', 'delete-transaction']);
    expect(appels[2].txId).toBe(42);
    expect(toastError).toHaveBeenCalled();
    expect(s.isSubmitting).toBe(false);
  });

  it("montre le message de l'API, et non l'enveloppe JSON, quand la création est refusée", async () => {
    const refus = "La date de l'écriture sort des bornes de l'exercice sélectionné.";
    repond((body) => {
      if (body.action === 'create-transfer') return { ok: false, json: { success: false, error: refus } };
      return { json: [] };
    });
    const s = etat();

    await s.handleMemberTransfer(line, 'Reçu de Mme Dupont');

    // Le toast recevait `{"success":false,"error":"…"}` tel quel, accolades comprises.
    expect(toastError).toHaveBeenCalledWith(refus);
    expect(appels.map((a) => a.action)).toEqual(['create-transfer']);
    expect(s.isSubmitting).toBe(false);
  });

  it("refuse une ligne au débit sans rien appeler", async () => {
    repond(() => ({ json: [] }));
    const s = etat();

    await s.handleMemberTransfer({ ...line, amount: -2500 }, 'Reçu de X');

    expect(appels).toEqual([]);
    expect(toastError).toHaveBeenCalledWith("Un virement reçu d'une adhérente est une ligne au crédit.");
  });
});
