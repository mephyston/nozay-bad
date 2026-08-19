import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { type Db } from '@nba/db';
import { cmsRedirectsTable } from '../../shared/schema';
import { listRedirects } from './handler';

describe('listRedirects', () => {
  let db: Db;

  beforeEach(async () => {
    ({ db } = await setupMockDb());
  });

  it('rend toutes les redirections, les plus empruntées d’abord', async () => {
    // Les migrations sèment les redirections héritées de WordPress : on repère les
    // lignes du test par leur chemin, jamais par leur position absolue.
    await db
      .insert(cmsRedirectsTable)
      .values([
        { fromPath: '/test-peu-vue/', toPath: '/cible/', statusCode: 301, hitCount: 3, createdAt: new Date() },
        { fromPath: '/test-tres-vue/', toPath: '/cible/', statusCode: 301, hitCount: 9, createdAt: new Date() }
      ])
      .run();

    const redirects = await listRedirects(db);
    const paths = redirects.map((r) => r.fromPath);

    expect(paths.indexOf('/test-tres-vue/')).toBeGreaterThanOrEqual(0);
    expect(paths.indexOf('/test-tres-vue/')).toBeLessThan(paths.indexOf('/test-peu-vue/'));

    // L'invariant de tri vaut pour toute la liste, lignes semées comprises.
    for (let i = 1; i < redirects.length; i++) {
      expect(redirects[i - 1].hitCount).toBeGreaterThanOrEqual(redirects[i].hitCount);
    }
  });

  it('rend aussi les adresses supprimées (410, sans cible)', async () => {
    await db
      .insert(cmsRedirectsTable)
      .values({ fromPath: '/test-supprimee/', toPath: null, statusCode: 410, createdAt: new Date() })
      .run();

    const gone = (await listRedirects(db)).find((r) => r.fromPath === '/test-supprimee/');

    expect(gone).toMatchObject({ toPath: null, statusCode: 410 });
  });
});
