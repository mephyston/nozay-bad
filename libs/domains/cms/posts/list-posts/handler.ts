import { type Db } from '@nba/db';
import { mediaHashesInHtml } from '../../shared/body-images';
import { ListPostsRepository } from './repository';
import type { ListPostsInput, ListPostsOutput } from './dto';

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

export async function listPosts(db: Db, filters: ListPostsInput = {}): Promise<ListPostsOutput> {
  const repo = new ListPostsRepository();

  let ids: number[] | undefined;
  if (filters.categorySlug) {
    const found = await repo.postIdsInCategory(db, filters.categorySlug);
    // Catégorie inconnue : aucun article, plutôt que tous.
    ids = found ?? [];
  }

  const { rows, total } = await repo.list(db, {
    status: filters.status,
    visibility: filters.visibility,
    ids,
    limit: Math.min(filters.limit ?? DEFAULT_LIMIT, MAX_LIMIT),
    offset: filters.offset ?? 0
  });

  const coverIds = [...new Set(rows.map((row) => row.coverMediaId).filter((id): id is number => id !== null))];

  // Trois requêtes de plus au total, quel que soit le nombre d'articles rendus.
  const [covers, coverVariants, categories] = await Promise.all([
    repo.coversFor(db, coverIds),
    repo.coverVariantsFor(db, coverIds),
    repo.categoriesFor(db, rows.map((row) => row.id))
  ]);

  // Une requête de plus, et seulement si l'appelant rend le corps des articles.
  const bodyVariants = filters.withBodyMedia
    ? await repo.variantsForHashes(
        db,
        [...new Set(rows.flatMap((row) => mediaHashesInHtml(row.bodyHtml)))]
      )
    : [];

  return {
    posts: rows.map((row) => ({
      ...row,
      cover: row.coverMediaId === null ? null : covers.get(row.coverMediaId) ?? null,
      coverVariants: row.coverMediaId === null ? [] : coverVariants.get(row.coverMediaId) ?? [],
      categories: categories.get(row.id) ?? [],
      // Les déclinaisons de tous les articles de la page, indistinctement : elles sont
      // retrouvées par empreinte, celles qui ne concernent pas un article donné ne
      // correspondent à aucune de ses images.
      bodyVariants
    })),
    total
  };
}
