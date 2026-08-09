import { type Db, AppError } from '@nba/db';
import { GetPostRepository } from './repository';
import type { GetPostInput, GetPostOutput } from './dto';

export async function getPost(db: Db, input: GetPostInput): Promise<GetPostOutput> {
  const repo = new GetPostRepository();
  const post = await repo.findById(db, input.postId);
  if (!post) throw new AppError('Actualité introuvable', 404);
  return { post, categories: await repo.categoriesOf(db, post.id) };
}
