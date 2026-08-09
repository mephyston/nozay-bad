import { type Db } from '@nba/db';
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
    ids,
    limit: Math.min(filters.limit ?? DEFAULT_LIMIT, MAX_LIMIT),
    offset: filters.offset ?? 0
  });
  return { posts: rows, total };
}
