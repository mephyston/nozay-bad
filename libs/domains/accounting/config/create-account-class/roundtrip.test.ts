import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { type Db } from '@nba/db';
import { sql } from 'drizzle-orm';
import { createAccountClass } from './handler';
import { UpdateAccountClassRepository } from '../update-account-class/repository';
import { DeleteAccountClassRepository } from '../delete-account-class/repository';

/**
 * Sur une vraie base, et non un dépôt simulé : le défaut était entre le handler et D1.
 * Une classe « 511 » créée depuis l'écran ressortait « 511.0 », que le relais refusait
 * ensuite — ni modifiable, ni supprimable (vu en production le 16/09/2026).
 */
describe('classe de compte — le code reste un texte', () => {
  let db: Db;
  beforeEach(async () => {
    ({ db } = await setupMockDb());
  });

  it('enregistre « 511 » tel quel, et le retrouve à la modification comme à la suppression', async () => {
    const created = await createAccountClass(db, { code: '511', label: "Valeurs à l'encaissement", type: 'tresorerie' });
    expect(created.code).toBe('511');
    const [row] = await db.all<{ code: string; t: string }>(sql`SELECT code, typeof(code) AS t FROM account_classes WHERE id = ${created.id}`);
    expect(row).toEqual({ code: '511', t: 'text' });

    const updated = await new UpdateAccountClassRepository().updateAccountClass(db, '511', { label: 'Valeurs à encaisser' });
    expect(updated?.label).toBe('Valeurs à encaisser');

    const deleted = await new DeleteAccountClassRepository().deleteAccountClass(db, '511');
    expect(deleted?.id).toBe(created.id);
  });
});
