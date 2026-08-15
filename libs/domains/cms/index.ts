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
import { listPostsRoute } from './posts/list-posts/route';
import { createPostRoute } from './posts/create-post/route';
import { getPostRoute } from './posts/get-post/route';
import { updatePostRoute } from './posts/update-post/route';
import { publishPostRoute } from './posts/publish-post/route';
import { deletePostRoute } from './posts/delete-post/route';
import { notifyPostRoute } from './posts/notify-post/route';
import { listPostCategoriesRoute } from './categories/list-post-categories/route';
import { listPageRedirectsRoute } from './redirects/list-page-redirects/route';
import { listNavItemsRoute } from './navigation/list-nav-items/route';
import { saveNavItemRoute } from './navigation/save-nav-item/route';
import { deleteNavItemRoute } from './navigation/delete-nav-item/route';
import { reorderNavItemsRoute } from './navigation/reorder-nav-items/route';
import { savePostCategoryRoute } from './categories/save-post-category/route';
import { getSiteSettingsRoute } from './settings/get-site-settings/route';
import { saveSiteSettingsRoute } from './settings/save-site-settings/route';

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
cmsRouter.route('/', listPostCategoriesRoute);
cmsRouter.route('/', savePostCategoryRoute);
cmsRouter.route('/', publishPostRoute);
cmsRouter.route('/', listPostsRoute);
cmsRouter.route('/', createPostRoute);
cmsRouter.route('/', getPostRoute);
cmsRouter.route('/', updatePostRoute);
cmsRouter.route('/', deletePostRoute);
cmsRouter.route('/', notifyPostRoute);
// `/nav/reorder` avant `/nav/:id` : le segment littéral doit gagner sur le motif.
cmsRouter.route('/', listPageRedirectsRoute);
cmsRouter.route('/', reorderNavItemsRoute);
cmsRouter.route('/', listNavItemsRoute);
cmsRouter.route('/', saveNavItemRoute);
cmsRouter.route('/', deleteNavItemRoute);
cmsRouter.route('/', getSiteSettingsRoute);
cmsRouter.route('/', saveSiteSettingsRoute);
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
export { listPosts } from './posts/list-posts/handler';
export { getPost } from './posts/get-post/handler';
export { notifyPost } from './posts/notify-post/handler';
export { listPostCategories } from './categories/list-post-categories/handler';
export { listNavItems } from './navigation/list-nav-items/handler';
export type { NavItemView } from './navigation/list-nav-items/dto';
export { getSiteSettings, SITE_SETTINGS_DEFAULTS } from './settings/get-site-settings/handler';
export type { SiteSettingsView } from './settings/get-site-settings/dto';
export { listPageRevisions } from './revisions/list-page-revisions/handler';
export { restorePageRevision } from './revisions/restore-page-revision/handler';
export { BLOCK_TYPES } from './shared/blocks';
export type { BlockType, BlockPayload } from './shared/blocks';
