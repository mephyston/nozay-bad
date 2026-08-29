import { and, asc, desc, eq, getTableColumns, inArray, sql, type SQL } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import {
  cmsPostsTable, cmsPostCategoriesTable, cmsPostCategoryLinksTable, cmsMediaTable,
  cmsMediaVariantsTable,
  type CmsPostRow, type CmsPostCategoryRow, type CmsMediaRow, type CmsMediaVariantRow
} from '../../shared/schema';

export class ListPostsRepository {
  /** Identifiants des articles d'une catégorie, ou `null` si la catégorie est inconnue. */
  async postIdsInCategory(db: DbOrTx, slug: string): Promise<number[] | null> {
    const category = await db
      .select()
      .from(cmsPostCategoriesTable)
      .where(eq(cmsPostCategoriesTable.slug, slug))
      .get();
    if (!category) return null;

    const links = await db
      .select()
      .from(cmsPostCategoryLinksTable)
      .where(eq(cmsPostCategoryLinksTable.categoryId, category.id))
      .all();
    return links.map((link) => link.postId);
  }

  async list(
    db: DbOrTx,
    filters: {
      status?: 'draft' | 'published';
      visibility?: 'public' | 'private';
      ids?: number[];
      limit: number;
      offset: number;
    }
  ): Promise<{ rows: CmsPostRow[]; total: number }> {
    const conditions: SQL[] = [];
    if (filters.status) conditions.push(eq(cmsPostsTable.status, filters.status));
    if (filters.visibility) conditions.push(eq(cmsPostsTable.visibility, filters.visibility));
    // Une catégorie sans article donne une liste vide, jamais la liste complète.
    if (filters.ids) {
      if (filters.ids.length === 0) return { rows: [], total: 0 };
      conditions.push(inArray(cmsPostsTable.id, filters.ids));
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    /*
      Découpage en base, et non en mémoire.

      Cette requête chargeait **toute** l'archive — corps HTML compris — avant d'en
      découper une page en JavaScript. Vingt articles aujourd'hui, quelques centaines
      dans quelques saisons : le coût aurait grandi sans que rien ne le signale, et
      l'accueil de l'espace adhérent en demandait cinquante pour en afficher trois.

      `count(*) over ()` rend le total dans la même requête : SQLite l'évalue avant le
      `LIMIT`, donc la pagination reste exacte sans second aller-retour. Les lignes
      transportées, elles, se limitent à la page demandée.

      `publishedAt` d'abord : un brouillon rédigé la semaine dernière puis publié
      aujourd'hui doit passer devant. `createdAt` départage les brouillons.
    */
    const base = db
      .select({ ...getTableColumns(cmsPostsTable), total: sql<number>`count(*) over ()` })
      .from(cmsPostsTable)
      .orderBy(desc(cmsPostsTable.publishedAt), desc(cmsPostsTable.createdAt))
      .limit(filters.limit)
      .offset(filters.offset);

    const page = where ? await base.where(where).all() : await base.all();
    if (page.length > 0) {
      return { rows: page.map(({ total, ...row }) => row as CmsPostRow), total: page[0].total };
    }

    /*
      Page vide : le total se lisant sur les lignes rendues, il n'y a plus rien à lire —
      et répondre zéro mentirait. Une demande au-delà de la dernière page doit continuer
      de dire combien d'articles existent, sans quoi l'écran d'administration conclurait
      « aucune actualité » à qui a simplement dépassé la fin. D'où ce décompte, payé
      seulement dans ce cas-là.
    */
    const compte = db.select({ total: sql<number>`count(*)` }).from(cmsPostsTable);
    const row = where ? await compte.where(where).get() : await compte.get();
    return { rows: [], total: row?.total ?? 0 };
  }

  /**
   * Couvertures des articles affichés, en une requête.
   *
   * Chargées en lot et non article par article : l'accueil en demande six, la page
   * d'archives douze, et autant d'allers-retours D1 se paieraient sur chaque rendu.
   */
  async coversFor(db: DbOrTx, mediaIds: number[]): Promise<Map<number, CmsMediaRow>> {
    if (mediaIds.length === 0) return new Map();
    const rows = await db
      .select()
      .from(cmsMediaTable)
      .where(inArray(cmsMediaTable.id, mediaIds))
      .all();
    return new Map(rows.map((row) => [row.id, row]));
  }

  /**
   * Déclinaisons des couvertures affichées, en une requête, indexées par média.
   *
   * Sans elles la carte ne peut poser aucun `srcset` et sert l'original : une
   * couverture de 1600 px de large téléchargée pour une vignette rendue à 380 px.
   * Triées par largeur croissante, comme les attend `<source srcset>`.
   *
   * Une liste vide est un cas normal, pas une anomalie : seuls les médias repris de
   * WordPress ont des variantes, l'envoi depuis l'administration n'en produit pas
   * encore. Le rendu retombe alors sur l'original, comme avant.
   */
  /**
   * Déclinaisons des images citées dans un corps d'article, retrouvées par empreinte.
   *
   * L'empreinte est déjà dans l'adresse écrite par l'éditeur
   * (`/media/<empreinte>/original.webp`) : une seule requête couvre toute la page.
   */
  async variantsForHashes(db: DbOrTx, hashes: string[]): Promise<CmsMediaVariantRow[]> {
    if (hashes.length === 0) return [];
    return db
      .select({
        id: cmsMediaVariantsTable.id,
        mediaId: cmsMediaVariantsTable.mediaId,
        format: cmsMediaVariantsTable.format,
        width: cmsMediaVariantsTable.width,
        height: cmsMediaVariantsTable.height,
        sizeBytes: cmsMediaVariantsTable.sizeBytes,
        key: cmsMediaVariantsTable.key
      })
      .from(cmsMediaVariantsTable)
      .innerJoin(cmsMediaTable, eq(cmsMediaTable.id, cmsMediaVariantsTable.mediaId))
      .where(inArray(cmsMediaTable.contentHash, hashes))
      .orderBy(asc(cmsMediaVariantsTable.width))
      .all();
  }

  async coverVariantsFor(db: DbOrTx, mediaIds: number[]): Promise<Map<number, CmsMediaVariantRow[]>> {
    const byMedia = new Map<number, CmsMediaVariantRow[]>();
    if (mediaIds.length === 0) return byMedia;

    const rows = await db
      .select()
      .from(cmsMediaVariantsTable)
      .where(inArray(cmsMediaVariantsTable.mediaId, mediaIds))
      .orderBy(asc(cmsMediaVariantsTable.width))
      .all();

    for (const row of rows) {
      const list = byMedia.get(row.mediaId);
      if (list) list.push(row);
      else byMedia.set(row.mediaId, [row]);
    }
    return byMedia;
  }

  /** Catégories des articles affichés, en une requête, indexées par article. */
  async categoriesFor(db: DbOrTx, postIds: number[]): Promise<Map<number, CmsPostCategoryRow[]>> {
    const byPost = new Map<number, CmsPostCategoryRow[]>();
    if (postIds.length === 0) return byPost;

    const links = await db
      .select()
      .from(cmsPostCategoryLinksTable)
      .where(inArray(cmsPostCategoryLinksTable.postId, postIds))
      .all();
    if (links.length === 0) return byPost;

    const categories = await db
      .select()
      .from(cmsPostCategoriesTable)
      .where(inArray(cmsPostCategoriesTable.id, [...new Set(links.map((l) => l.categoryId))]))
      .all();
    const byId = new Map(categories.map((c) => [c.id, c]));

    for (const link of links) {
      const category = byId.get(link.categoryId);
      if (!category) continue;
      const list = byPost.get(link.postId);
      if (list) list.push(category);
      else byPost.set(link.postId, [category]);
    }
    return byPost;
  }
}
