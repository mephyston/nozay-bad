import { describe, it, expect, vi, beforeEach } from 'vitest';
import { importBankStatement, parseOFX, parseLedgerBalance } from './handler';
import { ImportBankStatementRepository } from './repository';
vi.mock('./repository');

const OFX_ONE_TX = "<ACCTID>123\n<STMTTRN>\n<FITID>123\n<TRNAMT>12.0\n<DTPOSTED>20230101\n<NAME>Test\n</STMTTRN>";

const OFX_WITH_BALANCE = `<ACCTID>123
<STMTTRN>
<FITID>123
<TRNAMT>12.0
<DTPOSTED>20230101
<NAME>Test
</STMTTRN>
<LEDGERBAL>
<BALAMT>1234.56
<DTASOF>20230131120000
</LEDGERBAL>`;

function mockRepo(over: Record<string, any> = {}) {
  const instance = {
    getAccountByCode: vi.fn().mockResolvedValue({ id: 1, code: 'current' }),
    insertBankStatementLine: vi.fn().mockResolvedValue({ changes: 1 }),
    upsertBankStatementBalance: vi.fn().mockResolvedValue(undefined),
    ...over
  };
  (vi.mocked(ImportBankStatementRepository) as any).mockImplementation(function () { return instance; });
  return instance;
}

describe('parseLedgerBalance', () => {
  it("lit le solde arrêté par la banque et normalise sa date", () => {
    expect(parseLedgerBalance(OFX_WITH_BALANCE)).toEqual({ date: '2023-01-31', balanceCents: 123456 });
  });

  it('accepte un solde négatif', () => {
    expect(parseLedgerBalance('<LEDGERBAL>\n<BALAMT>-42.10\n<DTASOF>20240301\n</LEDGERBAL>'))
      .toEqual({ date: '2024-03-01', balanceCents: -4210 });
  });

  it("rend null quand le relevé n'en porte pas", () => {
    expect(parseLedgerBalance(OFX_ONE_TX)).toBeNull();
  });

  /*
   * `<AVAILBAL>` est un solde *disponible* — autorisations en cours déduites — qui ne
   * correspond à aucun arrêté. Le lire à la place du solde comptable ferait boucler l'état de
   * rapprochement sur le mauvais nombre.
   */
  it("ne confond pas le solde comptable avec le solde disponible qui le suit", () => {
    const ofx = '<LEDGERBAL>\n<BALAMT>100.00\n<DTASOF>20240301\n<AVAILBAL>\n<BALAMT>80.00\n<DTASOF>20240301\n';
    expect(parseLedgerBalance(ofx)).toEqual({ date: '2024-03-01', balanceCents: 10000 });
  });
});

describe('parseOFX', () => {
  it('rend les mouvements et le solde', () => {
    const parsed = parseOFX(OFX_WITH_BALANCE);
    expect(parsed.transactions).toHaveLength(1);
    expect(parsed.balance).toEqual({ date: '2023-01-31', balanceCents: 123456 });
  });
});

describe('importBankStatement', () => {
  let db: any;
  beforeEach(() => {
    vi.clearAllMocks();
    db = { transaction: vi.fn(async (cb) => cb(db)) };
  });

  it('should execute successfully', async () => {
    const repo = mockRepo();
    await (importBankStatement as any)(db, OFX_ONE_TX, 'auto');
    expect(repo.insertBankStatementLine).toHaveBeenCalled();
  });

  it('should throw error', async () => {
    mockRepo({ insertBankStatementLine: vi.fn().mockRejectedValue(new Error('err')) });
    await expect((importBankStatement as any)(db, OFX_ONE_TX, 'auto')).rejects.toThrow();
  });

  /*
   * Le dépôt repliait tout `accountId` non numérique sur `1` : un relevé de livret partait
   * sur le compte courant sans la moindre erreur.
   */
  it("écrit les lignes sur l'identifiant du compte demandé, pas sur son code", async () => {
    const repo = mockRepo({ getAccountByCode: vi.fn().mockResolvedValue({ id: 2, code: 'savings' }) });
    const result = await importBankStatement(db, OFX_ONE_TX, 'savings');

    expect(repo.getAccountByCode).toHaveBeenCalledWith(db, 'savings');
    expect(repo.insertBankStatementLine).toHaveBeenCalledWith(db, expect.objectContaining({ accountId: 2 }));
    expect(result.accountCode).toBe('savings');
  });

  it('refuse un compte inconnu plutôt que de retomber sur le compte courant', async () => {
    mockRepo({ getAccountByCode: vi.fn().mockResolvedValue(undefined) });
    await expect(importBankStatement(db, OFX_ONE_TX, 'livret-b')).rejects.toThrow('introuvable');
  });

  it('enregistre le solde arrêté par la banque', async () => {
    const repo = mockRepo();
    const result = await importBankStatement(db, OFX_WITH_BALANCE, 'auto');

    expect(repo.upsertBankStatementBalance).toHaveBeenCalledWith(db, expect.objectContaining({
      accountId: 1,
      date: '2023-01-31',
      balanceCents: 123456
    }));
    expect(result.balanceRecorded).toBe(true);
  });

  /*
   * Réimporter un relevé déjà chargé n'apporte aucun mouvement — mais c'est justement
   * l'arrêté le plus récent qui sert au rapprochement, et il doit être enregistré quand même.
   */
  it("enregistre le solde même quand aucun mouvement n'est nouveau", async () => {
    const repo = mockRepo({ insertBankStatementLine: vi.fn().mockResolvedValue({ changes: 0 }) });
    const result = await importBankStatement(db, OFX_WITH_BALANCE, 'auto');

    expect(result.count).toBe(0);
    expect(repo.upsertBankStatementBalance).toHaveBeenCalled();
  });

  it("n'invente pas de solde quand le fichier n'en porte pas", async () => {
    const repo = mockRepo();
    const result = await importBankStatement(db, OFX_ONE_TX, 'auto');

    expect(repo.upsertBankStatementBalance).not.toHaveBeenCalled();
    expect(result.balanceRecorded).toBe(false);
  });
});
