import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
  type AnySQLiteColumn
} from 'drizzle-orm/sqlite-core';
import { BLOCK_TYPES } from './blocks';

/**
 * Contenu du site public.
 *
 * **Toutes** les tables du domaine vivent dans ce fichier, y compris celles dont la
 * tranche n'est pas encore écrite. `libs/shared/db/drizzle.config.ts` résout
 * `libs/domains/<domaine>/shared/schema.ts` avec un glob à **un seul niveau** de
 * profondeur. Un `schema.ts` rangé sous une capacité (`cms/pages/shared/`) serait
 * invisible de
 * drizzle-kit — et `check-schema-integrity.js` le signalerait pourtant comme résolu,
 * puisqu'il cherche par nom de fichier et non via le glob. La panne serait silencieuse
 * jusqu'à la prochaine régénération des migrations.
 *
 * Préfixe `cms_` sur toutes les tables : `pages`, `posts`, `media` et `redirects` sont
 * des génériques d'un seul mot dans une base D1 **unique**, partagée avec la
 * comptabilité, la boutique et les adhérents.
 */

// ---------------------------------------------------------------------------
// Pages et blocs
// ---------------------------------------------------------------------------

export const cmsPagesTable = sqliteTable(
  'cms_pages',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    /** Dernier segment d'URL, sans barre oblique : « presentation ». */
    slug: text('slug').notNull(),
    /**
     * Chemin complet servi au public, barres obliques encadrantes comprises :
     * « /presentation/ ».
     *
     * Dénormalisé volontairement. Résoudre une URL est le chemin chaud du site : on ne
     * remonte pas l'arbre des parents à chaque requête. Le handler le recalcule à
     * chaque changement de slug ou de parent, pour la page et sa descendance.
     */
    path: text('path').notNull(),
    parentId: integer('parent_id').references((): AnySQLiteColumn => cmsPagesTable.id, {
      onDelete: 'set null'
    }),
    title: text('title').notNull(),
    status: text('status', { enum: ['draft', 'published'] })
      .notNull()
      .default('draft'),
    /**
     * Rôle de la page.
     *
     * `home` **désigne la racine** : la page qui le porte est servie à « / » (cf.
     * `buildPagePath`). C'est aujourd'hui le seul effet de cette colonne — le rendu,
     * lui, découle entièrement des blocs de la page, jamais de son gabarit.
     *
     * `landing` n'est lu par aucun code : hérité d'une intention de découpage par
     * gabarit qui n'a pas eu lieu, il est conservé pour ne pas réécrire l'énumération
     * sans besoin, mais l'administration ne le propose pas.
     */
    template: text('template', { enum: ['default', 'home', 'landing'] })
      .notNull()
      .default('default'),
    seoTitle: text('seo_title'),
    seoDescription: text('seo_description'),
    ogImageMediaId: integer('og_image_media_id').references(() => cmsMediaTable.id, {
      onDelete: 'set null'
    }),
    /** Page volontairement hors index (remerciements, page technique). */
    noindex: integer('noindex', { mode: 'boolean' }).notNull().default(false),
    navOrder: integer('nav_order').notNull().default(0),
    /**
     * Date de première publication, et non de création : un brouillon rédigé la
     * semaine dernière puis publié aujourd'hui doit dater d'aujourd'hui. Nulle tant
     * que la page est un brouillon.
     */
    publishedAt: integer('published_at', { mode: 'timestamp' }),
    updatedByEmail: text('updated_by_email').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
  },
  (table) => ({
    // Unique : deux pages ne peuvent pas répondre à la même URL, brouillon compris.
    // Un brouillon réserve donc son chemin — c'est voulu, sans quoi publier pourrait
    // échouer sur un conflit découvert au dernier moment.
    pathIdx: uniqueIndex('cms_pages_path_idx').on(table.path),
    navIdx: index('cms_pages_parent_nav_idx').on(table.parentId, table.navOrder)
  })
);

export const cmsPageBlocksTable = sqliteTable(
  'cms_page_blocks',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    pageId: integer('page_id')
      .notNull()
      .references(() => cmsPagesTable.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    /**
     * Discriminant de l'union TypeScript.
     *
     * Repris de `BLOCK_TYPES` et non recopié : la liste était écrite deux fois, et
     * ajouter un type de bloc échouait au `typecheck` sur cette ligne, loin de la
     * modification. `enum` ne produit ici aucune contrainte SQL — c'est du typage —
     * donc l'alignement ne demande aucune migration.
     */
    type: text('type', { enum: BLOCK_TYPES }).notNull(),
    /** Charge utile JSON, validée **et assainie** par l'API avant écriture. */
    payload: text('payload').notNull()
  },
  (table) => ({
    // Unique (page, position) : l'enregistrement remplace TOUS les blocs d'une page en
    // un seul `db.batch()`. D1 n'a pas de transaction interactive (ADR-0002), mais un
    // batch est atomique : aucune position en double n'est jamais observable.
    positionIdx: uniqueIndex('cms_page_blocks_page_position_idx').on(table.pageId, table.position)
  })
);

export const cmsPageRevisionsTable = sqliteTable(
  'cms_page_revisions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    pageId: integer('page_id')
      .notNull()
      .references(() => cmsPagesTable.id, { onDelete: 'cascade' }),
    /** Numéro croissant par page, calculé à l'écriture (MAX + 1). */
    revision: integer('revision').notNull(),
    /** Instantané complet : métadonnées **et** blocs sérialisés. Restaurer = réécrire. */
    snapshot: text('snapshot').notNull(),
    authorEmail: text('author_email').notNull(),
    /** Motif court, saisi ou déduit (« publication », « restauration de la v4 »). */
    reason: text('reason'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
  },
  (table) => ({
    pageRevisionIdx: uniqueIndex('cms_page_revisions_page_revision_idx').on(table.pageId, table.revision),
    recentIdx: index('cms_page_revisions_page_created_idx').on(table.pageId, table.createdAt)
  })
);

// ---------------------------------------------------------------------------
// Actualités
// ---------------------------------------------------------------------------

export const cmsPostCategoriesTable = sqliteTable('cms_post_categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  navOrder: integer('nav_order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const cmsPostsTable = sqliteTable(
  'cms_posts',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    slug: text('slug').notNull(),
    /** Chemin public complet. Les articles WordPress sont à plat, sans préfixe. */
    path: text('path').notNull(),
    title: text('title').notNull(),
    /** Chapô affiché en liste, et repris comme meta description à défaut de mieux. */
    excerpt: text('excerpt'),
    /** Corps en texte riche, assaini avec le profil `CMS_PROFILE` de `@nba/html`. */
    bodyHtml: text('body_html').notNull(),
    coverMediaId: integer('cover_media_id').references(() => cmsMediaTable.id, {
      onDelete: 'set null'
    }),
    status: text('status', { enum: ['draft', 'published'] })
      .notNull()
      .default('draft'),
    seoTitle: text('seo_title'),
    seoDescription: text('seo_description'),
    /**
     * Nom affiché du rédacteur, recopié et non lié.
     *
     * Pas de clé étrangère vers `admin_users` : un article survit au départ de son
     * auteur, et un domaine métier ne dépend pas de `iam`.
     */
    authorName: text('author_name').notNull(),
    authorEmail: text('author_email').notNull(),
    publishedAt: integer('published_at', { mode: 'timestamp' }),
    /** Identifiant d'origine WordPress : rejouer l'import ne crée pas de doublon. */
    legacyWpId: integer('legacy_wp_id'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
  },
  (table) => ({
    pathIdx: uniqueIndex('cms_posts_path_idx').on(table.path),
    // Le seul accès chaud : « les N dernières publiées », sur l'accueil et le flux.
    feedIdx: index('cms_posts_status_published_idx').on(table.status, table.publishedAt),
    legacyIdx: uniqueIndex('cms_posts_legacy_wp_id_idx').on(table.legacyWpId)
  })
);

export const cmsPostCategoryLinksTable = sqliteTable(
  'cms_post_category_links',
  {
    postId: integer('post_id')
      .notNull()
      .references(() => cmsPostsTable.id, { onDelete: 'cascade' }),
    categoryId: integer('category_id')
      .notNull()
      .references(() => cmsPostCategoriesTable.id, { onDelete: 'cascade' })
  },
  (table) => ({
    pk: uniqueIndex('cms_post_category_links_pk').on(table.postId, table.categoryId),
    byCategory: index('cms_post_category_links_category_idx').on(table.categoryId)
  })
);

// ---------------------------------------------------------------------------
// Médiathèque
// ---------------------------------------------------------------------------

export const cmsMediaTable = sqliteTable(
  'cms_media',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    /** Clé R2 de l'original : « media/{empreinte}/original.{ext} ». Immuable. */
    key: text('key').notNull().unique(),
    mimeType: text('mime_type').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    /**
     * Dimensions de l'original. Nulles pour un PDF.
     *
     * Ce ne sont pas des informations décoratives : elles alimentent les attributs
     * `width` et `height` de chaque `<img>`, et c'est **ce qui supprime le décalage de
     * mise en page**. L'import doit échouer bruyamment plutôt que de les laisser vides
     * pour une image.
     */
    width: integer('width'),
    height: integer('height'),
    /** Texte alternatif. Vide = image décorative, ce qui doit rester un choix explicite. */
    alt: text('alt').notNull().default(''),
    title: text('title'),
    credit: text('credit'),
    /** Empreinte du contenu : déduplique l'import et rend la clé cacheable à vie. */
    contentHash: text('content_hash').notNull(),
    legacyWpId: integer('legacy_wp_id'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
  },
  (table) => ({
    contentHashIdx: index('cms_media_content_hash_idx').on(table.contentHash)
  })
);

export const cmsMediaVariantsTable = sqliteTable(
  'cms_media_variants',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    mediaId: integer('media_id')
      .notNull()
      .references(() => cmsMediaTable.id, { onDelete: 'cascade' }),
    format: text('format', { enum: ['avif', 'webp', 'jpeg', 'png'] }).notNull(),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    key: text('key').notNull().unique()
  },
  (table) => ({
    byMedia: index('cms_media_variants_media_idx').on(table.mediaId, table.format, table.width)
  })
);

// ---------------------------------------------------------------------------
// Routage : menus et redirections
// ---------------------------------------------------------------------------

export const cmsNavItemsTable = sqliteTable(
  'cms_nav_items',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    location: text('location', { enum: ['header', 'footer'] }).notNull(),
    parentId: integer('parent_id').references((): AnySQLiteColumn => cmsNavItemsTable.id, {
      onDelete: 'cascade'
    }),
    label: text('label').notNull(),
    /** Soit une page interne, soit une URL externe — jamais les deux. */
    pageId: integer('page_id').references(() => cmsPagesTable.id, { onDelete: 'cascade' }),
    externalUrl: text('external_url'),
    position: integer('position').notNull().default(0)
  },
  (table) => ({
    byLocation: index('cms_nav_items_location_idx').on(table.location, table.parentId, table.position)
  })
);

export const cmsRedirectsTable = sqliteTable('cms_redirects', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  /** Chemin source normalisé, barres obliques comprises : « /forum-2/ ». */
  fromPath: text('from_path').notNull().unique(),
  /**
   * Cible. **Nulle = 410 Gone**, pour une page qui a existé et n'a pas de successeur.
   *
   * Rediriger vers une page sans rapport serait pire : Google traite une 301 sans
   * équivalence de contenu comme une 404 déguisée.
   */
  toPath: text('to_path'),
  statusCode: integer('status_code').notNull().default(301),
  /** Compteur d'usage : sert à purger les redirections devenues inutiles. */
  hitCount: integer('hit_count').notNull().default(0),
  note: text('note'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

// ---------------------------------------------------------------------------
// Publication
// ---------------------------------------------------------------------------

/**
 * Version du contenu publié. Ligne unique, `id = 1`.
 *
 * Elle entre dans la clé du cache du site public : publier l'incrémente, ce qui rend
 * d'un coup toutes les entrées précédentes inatteignables. C'est la seule invalidation
 * possible sans la purge par étiquette, réservée à l'offre Entreprise de Cloudflare.
 *
 * Le rayon d'action est volontairement large — une publication invalide tout le site.
 * Pour ~130 URL c'est sans conséquence, et cela supprime toute une classe de « la page
 * ne s'est pas mise à jour ».
 */
export const cmsContentVersionTable = sqliteTable('cms_content_version', {
  id: integer('id').primaryKey(),
  version: integer('version').notNull().default(1),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
});

export type CmsPageRow = typeof cmsPagesTable.$inferSelect;
export type CmsPageBlockRow = typeof cmsPageBlocksTable.$inferSelect;
export type CmsPageRevisionRow = typeof cmsPageRevisionsTable.$inferSelect;
export type CmsPostRow = typeof cmsPostsTable.$inferSelect;
export type CmsPostCategoryRow = typeof cmsPostCategoriesTable.$inferSelect;
export type CmsMediaRow = typeof cmsMediaTable.$inferSelect;
export type CmsMediaVariantRow = typeof cmsMediaVariantsTable.$inferSelect;
export type CmsNavItemRow = typeof cmsNavItemsTable.$inferSelect;
export type CmsRedirectRow = typeof cmsRedirectsTable.$inferSelect;
