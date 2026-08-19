import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { type Db } from '@nba/db';
import { createPage } from '../create-page/handler';
import { publishPage } from './handler';
import { getContentVersion } from '../../shared/cache-version';
import { CmsPageNotFoundError } from '../../shared/errors';

const AUTHOR = 'communication@nozaybad.fr';

describe('publishPage', () => {
  let db: Db;
  let pageId: number;

  beforeEach(async () => {
    ({ db } = await setupMockDb());
    pageId = (await createPage(db, { title: 'Présentation' }, AUTHOR)).id;
  });

  it('publie et date la mise en ligne', async () => {
    const now = new Date('2026-08-08T10:00:00Z');
    const page = await publishPage(db, { pageId, published: true }, now);

    expect(page.status).toBe('published');
    expect(page.publishedAt).toEqual(now);
  });

  it('garde la date d’origine quand on republie après correction', async () => {
    // Sinon la page remonterait en tête des listes à chaque retouche, et son
    // `datePublished` mentirait à Google.
    const first = new Date('2026-08-08T10:00:00Z');
    await publishPage(db, { pageId, published: true }, first);
    await publishPage(db, { pageId, published: false }, new Date('2026-08-09T10:00:00Z'));
    const republished = await publishPage(db, { pageId, published: true }, new Date('2026-08-10T10:00:00Z'));

    expect(republished.publishedAt).toEqual(first);
  });

  it('dépublie sans effacer la date de première mise en ligne', async () => {
    await publishPage(db, { pageId, published: true });
    const page = await publishPage(db, { pageId, published: false });

    expect(page.status).toBe('draft');
    expect(page.publishedAt).not.toBeNull();
  });

  it('renouvelle le cache du site dans les deux sens', async () => {
    const before = await getContentVersion(db);
    await publishPage(db, { pageId, published: true });
    const afterPublish = await getContentVersion(db);
    await publishPage(db, { pageId, published: false });
    const afterUnpublish = await getContentVersion(db);

    expect(afterPublish).toBeGreaterThan(before);
    expect(afterUnpublish).toBeGreaterThan(afterPublish);
  });

  it('refuse une page inexistante', async () => {
    await expect(publishPage(db, { pageId: 999, published: true })).rejects.toThrow(CmsPageNotFoundError);
  });
});
