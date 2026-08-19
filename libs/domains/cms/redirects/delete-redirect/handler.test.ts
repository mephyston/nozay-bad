import { describe, it, expect, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { setupMockDb } from '@nba/db/test-utils';
import { type Db } from '@nba/db';
import { cmsRedirectsTable } from '../../shared/schema';
import { getContentVersion } from '../../shared/cache-version';
import { CmsRedirectNotFoundError } from '../../shared/errors';
import { createRedirect } from '../create-redirect/handler';
import { deleteRedirect } from './handler';

describe('deleteRedirect', () => {
  let db: Db;

  beforeEach(async () => {
    ({ db } = await setupMockDb());
  });

  it('refuse un identifiant inconnu', async () => {
    await expect(deleteRedirect(db, 999_999)).rejects.toThrow(CmsRedirectNotFoundError);
  });

  it('supprime la ligne et invalide le cache du site public', async () => {
    const redirect = await createRedirect(db, { fromPath: '/test-a-purger/', toPath: '/cible/' });
    const before = await getContentVersion(db);

    await deleteRedirect(db, redirect.id);

    const row = await db
      .select()
      .from(cmsRedirectsTable)
      .where(eq(cmsRedirectsTable.fromPath, '/test-a-purger/'))
      .get();
    expect(row).toBeUndefined();
    expect(await getContentVersion(db)).toBeGreaterThan(before);
  });
});
