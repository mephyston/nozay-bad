import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { type Db } from '@nba/db';
import { createPage } from '../create-page/handler';
import { getPage } from '../get-page/handler';
import { savePageBlocks } from './handler';
import { CmsBlockPayloadError, CmsPageNotFoundError } from '../../shared/errors';

const AUTHOR = 'communication@nozaybad.fr';

describe('savePageBlocks', () => {
  let db: Db;
  let pageId: number;

  beforeEach(async () => {
    ({ db } = await setupMockDb());
    pageId = (await createPage(db, { title: 'Présentation' }, AUTHOR)).id;
  });

  it('remplace intégralement les blocs, sans laisser de trace des précédents', async () => {
    await savePageBlocks(db, {
      pageId,
      blocks: [
        { type: 'richtext', payload: { html: '<p>Un</p>' } },
        { type: 'richtext', payload: { html: '<p>Deux</p>' } },
        { type: 'richtext', payload: { html: '<p>Trois</p>' } }
      ]
    });

    await savePageBlocks(db, { pageId, blocks: [{ type: 'richtext', payload: { html: '<p>Seul</p>' } }] });

    const { blocks } = await getPage(db, { pageId });
    expect(blocks).toEqual([{ type: 'richtext', html: '<p>Seul</p>' }]);
  });

  it('accepte de réordonner sans buter sur l’index unique des positions', async () => {
    // Le `DELETE` et les `INSERT` partent dans un seul `db.batch()` : sans cela, le
    // second bloc heurterait la position encore occupée par l'ancien premier.
    await savePageBlocks(db, {
      pageId,
      blocks: [
        { type: 'richtext', payload: { html: '<p>A</p>' } },
        { type: 'richtext', payload: { html: '<p>B</p>' } }
      ]
    });

    await savePageBlocks(db, {
      pageId,
      blocks: [
        { type: 'richtext', payload: { html: '<p>B</p>' } },
        { type: 'richtext', payload: { html: '<p>A</p>' } }
      ]
    });

    const { blocks } = await getPage(db, { pageId });
    expect(blocks).toEqual([
      { type: 'richtext', html: '<p>B</p>' },
      { type: 'richtext', html: '<p>A</p>' }
    ]);
  });

  it('assainit chaque bloc avant écriture', async () => {
    await savePageBlocks(db, {
      pageId,
      blocks: [{ type: 'richtext', payload: { html: '<h2>Tarifs</h2><script>alert(1)</script>' } }]
    });

    const { blocks } = await getPage(db, { pageId });
    expect(blocks).toEqual([{ type: 'richtext', html: '<h2>Tarifs</h2>' }]);
  });

  it('n’écrit rien du tout si un seul bloc est refusé', async () => {
    // Validation complète avant la moindre écriture : une page à moitié enregistrée
    // serait pire que le refus, puisque l'éditeur croirait avoir sauvegardé.
    await savePageBlocks(db, { pageId, blocks: [{ type: 'richtext', payload: { html: '<p>Initial</p>' } }] });

    await expect(
      savePageBlocks(db, {
        pageId,
        blocks: [
          { type: 'richtext', payload: { html: '<p>Nouveau</p>' } },
          { type: 'richtext', payload: { html: '<p>   </p>' } }
        ]
      })
    ).rejects.toThrow(CmsBlockPayloadError);

    const { blocks } = await getPage(db, { pageId });
    expect(blocks).toEqual([{ type: 'richtext', html: '<p>Initial</p>' }]);
  });

  it('accepte une page vidée de tous ses blocs', async () => {
    await savePageBlocks(db, { pageId, blocks: [{ type: 'richtext', payload: { html: '<p>A</p>' } }] });
    const result = await savePageBlocks(db, { pageId, blocks: [] });

    expect(result).toMatchObject({ pageId, count: 0 });
    expect((await getPage(db, { pageId })).blocks).toEqual([]);
  });

  it('refuse une page inexistante', async () => {
    await expect(savePageBlocks(db, { pageId: 999, blocks: [] })).rejects.toThrow(CmsPageNotFoundError);
  });
});
