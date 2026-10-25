import { type Db, AppError } from '@nba/db';
import { GetAttachmentRepository } from './repository';
import type { GetAttachmentInput, GetAttachmentOutput } from './dto';

export async function getAttachment(db: Db, input: GetAttachmentInput): Promise<GetAttachmentOutput> {
  const piece = await new GetAttachmentRepository().get(db, input);
  if (!piece) throw new AppError('Pièce jointe introuvable', 404);
  return piece;
}
