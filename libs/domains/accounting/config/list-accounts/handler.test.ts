import { describe, it, expect } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { listAccounts } from './handler';

describe('listAccounts (Integration)', () => {
  it('rend les comptes semés avec leur classe, le porte-monnaie Badnet compris', async () => {
    const { db } = await setupMockDb();

    const accounts = await listAccounts(db);

    expect(accounts.map((a) => a.code)).toEqual(['current', 'savings', 'cash', 'badnet']);
    const badnet = accounts.find((a) => a.code === 'badnet');
    expect(badnet).toMatchObject({ label: 'Porte-monnaie Badnet', classCode: '4091', classType: 'tresorerie' });
    expect(accounts.every((a) => a.classType === 'tresorerie')).toBe(true);
  });
});
