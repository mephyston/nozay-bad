import { Hono } from 'hono';

import { resolveRouteRoute } from './routing/resolve-route/route';
import { listPagesRoute } from './pages/list-pages/route';
import { createPageRoute } from './pages/create-page/route';
import { savePageBlocksRoute } from './pages/save-page-blocks/route';
import { publishPageRoute } from './pages/publish-page/route';
import { getPageRoute } from './pages/get-page/route';
import { updatePageRoute } from './pages/update-page/route';
import { deletePageRoute } from './pages/delete-page/route';
import { getContentVersionRoute } from './publishing/get-content-version/route';
import { listMediaRoute } from './media/list-media/route';
import { uploadMediaRoute } from './media/upload-media/route';
import { getMediaRoute } from './media/get-media/route';
import { deleteMediaRoute } from './media/delete-media/route';
import { listPageRevisionsRoute } from './revisions/list-page-revisions/route';
import { restorePageRevisionRoute } from './revisions/restore-page-revision/route';

export type Bindings = {
  DB: D1Database;
};

export const cmsRouter = new Hono<{ Bindings: Bindings }>();

// L'ordre compte : Hono retient la première route qui correspond. Les segments
// littéraux passent donc avant les motifs à paramètre, sinon `/pages/:id` capterait
// `/pages/12/blocks` et `/pages/12/publish`.
cmsRouter.route('/', resolveRouteRoute);
cmsRouter.route('/', getContentVersionRoute);
cmsRouter.route('/', restorePageRevisionRoute);
cmsRouter.route('/', listPageRevisionsRoute);
cmsRouter.route('/', savePageBlocksRoute);
cmsRouter.route('/', publishPageRoute);
cmsRouter.route('/', listPagesRoute);
cmsRouter.route('/', createPageRoute);
cmsRouter.route('/', getPageRoute);
cmsRouter.route('/', updatePageRoute);
cmsRouter.route('/', deletePageRoute);
cmsRouter.route('/', listMediaRoute);
cmsRouter.route('/', uploadMediaRoute);
cmsRouter.route('/', getMediaRoute);
cmsRouter.route('/', deleteMediaRoute);

// API publique du contexte.
export { resolveRoute } from './routing/resolve-route/handler';
export type { ResolveRouteInput, ResolveRouteOutput } from './routing/resolve-route/dto';
export { listPages } from './pages/list-pages/handler';
export { getPage } from './pages/get-page/handler';
export { getContentVersion, bumpContentVersion } from './shared/cache-version';
export { normalisePath, slugify, buildPath, ROOT_PATH } from './shared/slug';
export { listMedia } from './media/list-media/handler';
export { getMedia } from './media/get-media/handler';
export { listPageRevisions } from './revisions/list-page-revisions/handler';
export { restorePageRevision } from './revisions/restore-page-revision/handler';
export { BLOCK_TYPES } from './shared/blocks';
export type { BlockType, BlockPayload } from './shared/blocks';
