import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { type Db } from '@nba/db';
import { createPage } from './handler';
import { CmsPathConflictError, CmsInvalidSlugError, CmsPageNotFoundError } from '../../shared/errors';

const AUTHOR = 'communication@nozaybad.fr';

describe('createPage', () => {
  let db: Db;

  beforeEach(async () => {
    ({ db } = await setupMockDb());
  });

  it('crée toujours un brouillon, jamais une page en ligne', async () => {
    // Une page vide publiée d'emblée serait indexée avant d'être rédigée.
    const page = await createPage(db, { title: 'Présentation' }, AUTHOR);

    expect(page.status).toBe('draft');
    expect(page.publishedAt).toBeNull();
    expect(page.updatedByEmail).toBe(AUTHOR);
  });

  it('dérive le slug du titre quand il n’est pas fourni', async () => {
    const page = await createPage(db, { title: 'Adultes Loisirs' }, AUTHOR);

    expect(page.slug).toBe('adultes-loisirs');
    expect(page.path).toBe('/adultes-loisirs/');
  });

  it('range la page sous son parent', async () => {
    const parent = await createPage(db, { title: 'Le club', slug: 'le-club' }, AUTHOR);
    const child = await createPage(db, { title: 'Partenaires', parentId: parent.id }, AUTHOR);

    expect(child.path).toBe('/le-club/partenaires/');
  });

  it('refuse une adresse déjà prise, brouillon compris', async () => {
    await createPage(db, { title: 'Présentation' }, AUTHOR);

    await expect(createPage(db, { title: 'Présentation' }, AUTHOR)).rejects.toThrow(CmsPathConflictError);
  });

  it('refuse un slug qui produirait une URL douteuse', async () => {
    await expect(createPage(db, { title: 'X', slug: '../etc' }, AUTHOR)).rejects.toThrow(CmsInvalidSlugError);
    await expect(createPage(db, { title: '!!!' }, AUTHOR)).rejects.toThrow(CmsInvalidSlugError);
  });

  it('refuse un parent inexistant', async () => {
    await expect(createPage(db, { title: 'X', parentId: 999 }, AUTHOR)).rejects.toThrow(CmsPageNotFoundError);
  });
});
