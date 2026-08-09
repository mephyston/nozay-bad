import { eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { cmsPostsTable, cmsPostCategoryLinksTable, type CmsPostRow } from '../../shared/schema';

export class UpdatePostRepository {
  async findById(db: DbOrTx, id: number): Promise<CmsPostRow | undefined> {
    return db.select().from(cmsPostsTable).where(eq(cmsPostsTable.id, id)).get();
  }

  buildUpdateStatements(
    db: DbOrTx,
    postId: number,
    values: Partial<typeof cmsPostsTable.$inferInsert>,
    categoryIds: number[] | undefined
  ) {
    const statements: unknown[] = [
      db.update(cmsPostsTable).set(values).where(eq(cmsPostsTable.id, postId))
    ];
    // Les catégories sont remplacées en bloc, comme les blocs d'une page : plus simple
    // à raisonner qu'un différentiel, et atomique dans le même lot.
    if (categoryIds) {
      statements.push(db.delete(cmsPostCategoryLinksTable).where(eq(cmsPostCategoryLinksTable.postId, postId)));
      for (const categoryId of categoryIds) {
        statements.push(db.insert(cmsPostCategoryLinksTable).values({ postId, categoryId }));
      }
    }
    return statements;
  }
}
