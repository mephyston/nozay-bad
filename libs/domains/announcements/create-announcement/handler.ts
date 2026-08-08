import { type Db } from '@nba/db';
import { CreateAnnouncementRepository } from './repository';
import { sanitizeRichText, isRichTextEmpty } from '../shared/rich-text';
import { AnnouncementEmptyBodyError } from '../shared/errors';
import type { CreateAnnouncementInput, CreateAnnouncementOutput } from './dto';

export async function createAnnouncement(
  db: Db,
  body: CreateAnnouncementInput,
  authorEmail: string,
  now: Date = new Date()
): Promise<CreateAnnouncementOutput> {
  // Le contenu vient d'un éditeur du navigateur : on ne conserve que le balisage autorisé.
  const bodyHtml = sanitizeRichText(body.bodyHtml);
  // Un corps réduit à néant par l'assainissement (« <div><img></div> ») n'est pas une
  // annonce : la refuser vaut mieux que publier un cadre vide.
  if (isRichTextEmpty(bodyHtml)) throw new AnnouncementEmptyBodyError();

  const status = body.status ?? 'draft';
  const repo = new CreateAnnouncementRepository();

  return repo.create(db, {
    title: body.title.trim(),
    bodyHtml,
    status,
    // Un brouillon n'a pas de date de publication : c'est elle qui porte l'ordre d'affichage.
    publishedAt: status === 'published' ? now : null,
    notifiedAt: null,
    authorEmail,
    createdAt: now,
    updatedAt: now
  });
}
