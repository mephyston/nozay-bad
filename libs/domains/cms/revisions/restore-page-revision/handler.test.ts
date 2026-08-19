import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { type Db } from '@nba/db';
import { createPage } from '../../pages/create-page/handler';
import { savePageBlocks } from '../../pages/save-page-blocks/handler';
import { getPage } from '../../pages/get-page/handler';
import { publishPage } from '../../pages/publish-page/handler';
import { listPageRevisions } from '../list-page-revisions/handler';
import { restorePageRevision } from './handler';
import { MAX_REVISIONS_PER_PAGE } from '../../shared/revision';

const AUTHOR = 'communication@nozaybad.fr';
const rich = (html: string) => ({ type: 'richtext' as const, payload: { html } });

describe('révisions de page', () => {
  let db: Db;
  let pageId: number;

  beforeEach(async () => {
    ({ db } = await setupMockDb());
    pageId = (await createPage(db, { title: 'Présentation' }, AUTHOR)).id;
  });

  it('capture l’état précédent, pas le nouveau', async () => {
    // C'est la version qui marchait qu'on veut pouvoir retrouver.
    await savePageBlocks(db, { pageId, blocks: [rich('<p>Version 1</p>')] }, AUTHOR);
    await savePageBlocks(db, { pageId, blocks: [rich('<p>Version 2</p>')] }, AUTHOR);

    const revisions = await listPageRevisions(db, { pageId });
    expect(revisions).toHaveLength(2);
    // La plus récente porte l'état d'avant la seconde écriture : la version 1.
    const restored = await restorePageRevision(db, { pageId, revisionId: revisions[0].id }, AUTHOR);
    expect(restored.id).toBe(pageId);
    expect((await getPage(db, { pageId })).blocks).toEqual([{ type: 'richtext', html: '<p>Version 1</p>' }]);
  });

  it('rend la restauration elle-même réversible', async () => {
    await savePageBlocks(db, { pageId, blocks: [rich('<p>A</p>')] }, AUTHOR);
    await savePageBlocks(db, { pageId, blocks: [rich('<p>B</p>')] }, AUTHOR);

    const before = await listPageRevisions(db, { pageId });
    await restorePageRevision(db, { pageId, revisionId: before[0].id }, AUTHOR);

    // Une révision de plus, portant l'état « B » d'avant le retour en arrière.
    const after = await listPageRevisions(db, { pageId });
    expect(after.length).toBe(before.length + 1);
    await restorePageRevision(db, { pageId, revisionId: after[0].id }, AUTHOR);
    expect((await getPage(db, { pageId })).blocks).toEqual([{ type: 'richtext', html: '<p>B</p>' }]);
  });

  it('ne remet en ligne ni l’ancienne adresse ni l’ancien statut', async () => {
    // Restaurer porte le contenu. Remettre un ancien slug casserait les liens
    // entrants, et republier une page volontairement retirée serait une surprise.
    await savePageBlocks(db, { pageId, blocks: [rich('<p>A</p>')] }, AUTHOR);
    await publishPage(db, { pageId, published: true });
    await savePageBlocks(db, { pageId, blocks: [rich('<p>B</p>')] }, AUTHOR);
    await publishPage(db, { pageId, published: false });

    const revisions = await listPageRevisions(db, { pageId });
    const restored = await restorePageRevision(db, { pageId, revisionId: revisions[0].id }, AUTHOR);

    expect(restored.status).toBe('draft');
    expect(restored.path).toBe('/presentation/');
  });

  it('refuse une révision qui appartient à une autre page', async () => {
    const other = await createPage(db, { title: 'Agenda', slug: 'agenda' }, AUTHOR);
    await savePageBlocks(db, { pageId: other.id, blocks: [rich('<p>X</p>')] }, AUTHOR);
    const otherRevisions = await listPageRevisions(db, { pageId: other.id });

    await expect(
      restorePageRevision(db, { pageId, revisionId: otherRevisions[0].id }, AUTHOR)
    ).rejects.toThrow(/introuvable/);
  });

  it('plafonne l’historique pour que la table ne grossisse pas sans fin', async () => {
    for (let i = 0; i < MAX_REVISIONS_PER_PAGE + 5; i++) {
      await savePageBlocks(db, { pageId, blocks: [rich(`<p>v${i}</p>`)] }, AUTHOR);
    }
    const revisions = await listPageRevisions(db, { pageId });
    expect(revisions.length).toBeLessThanOrEqual(MAX_REVISIONS_PER_PAGE);
    // Les plus récentes sont conservées.
    expect(revisions[0].revision).toBeGreaterThan(MAX_REVISIONS_PER_PAGE);
  });

  it('numérote et attribue chaque révision', async () => {
    await savePageBlocks(db, { pageId, blocks: [rich('<p>A</p>')] }, AUTHOR);
    const [revision] = await listPageRevisions(db, { pageId });
    expect(revision.revision).toBe(1);
    expect(revision.authorEmail).toBe(AUTHOR);
    expect(revision.reason).toBe('modification du contenu');
  });
});
