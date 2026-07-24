
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { importBankStatement } from './handler';
import { ImportBankStatementRepository } from './repository';
vi.mock('./repository');

describe('importBankStatement', () => {
  let db: any;
  beforeEach(() => {
    vi.clearAllMocks();
    db = { transaction: vi.fn(async (cb) => cb(db)) };
  });
  it('should execute successfully', async () => {
    const mockRepoInstance = {
      insertBankStatementLine: vi.fn().mockResolvedValue({ changes: 1 })
    };
    (vi.mocked(ImportBankStatementRepository) as any).mockImplementation(function() { return mockRepoInstance; });
    const content = "<ACCTID>123\n<STMTTRN>\n<FITID>123\n<TRNAMT>12.0\n<DTPOSTED>20230101\n<NAME>Test\n</STMTTRN>";
    await (importBankStatement as any)(db, content, 'auto');
    expect(mockRepoInstance.insertBankStatementLine).toHaveBeenCalled();
  });
  it('should throw error', async () => {
    const mockRepoInstance = {
      insertBankStatementLine: vi.fn().mockRejectedValue(new Error('err'))
    };
    (vi.mocked(ImportBankStatementRepository) as any).mockImplementation(function() { return mockRepoInstance; });
    const content = "<ACCTID>123\n<STMTTRN>\n<FITID>123\n<TRNAMT>12.0\n<DTPOSTED>20230101\n<NAME>Test\n</STMTTRN>";
    await expect((importBankStatement as any)(db, content, 'auto')).rejects.toThrow();
  });
});
