import { type Db } from '@nba/db';
import { AppError } from '@nba/db';
import { GetMediaRepository } from './repository';
import type { GetMediaInput, GetMediaOutput } from './dto';

export async function getMedia(db: Db, input: GetMediaInput): Promise<GetMediaOutput> {
  const repo = new GetMediaRepository();
  const media = await repo.findById(db, input.mediaId);
  if (!media) throw new AppError('Média introuvable', 404);
  return { media, variants: await repo.findVariants(db, media.id) };
}
