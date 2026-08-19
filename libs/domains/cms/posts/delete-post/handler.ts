import { type Db, AppError } from '@nba/db';
import { bumpContentVersion } from '../../shared/cache-version';
import { DeletePostRepository } from './repository';
import type { DeletePostInput, DeletePostOutput } from './dto';

export async function deletePost(
  db: Db, input: DeletePostInput, now: Date = new Date()
): Promise<DeletePostOutput> {
  const repo = new DeletePostRepository();
  const post = await repo.findById(db, input.postId);
  if (!post) throw new AppError('Actualité introuvable', 404);

  await repo.remove(db, post.id);
  if (post.status === 'published') await bumpContentVersion(db, now);

  // Le chemin est rendu pour que l'administration propose une redirection : une
  // actualité publiée a pu être partagée par lien.
  return { deleted: true, path: post.path };
}
