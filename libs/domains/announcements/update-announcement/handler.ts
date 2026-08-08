import { type Db } from '@nba/db';
import { UpdateAnnouncementRepository } from './repository';
import { sanitizeRichText, isRichTextEmpty } from '../shared/rich-text';
import { AnnouncementEmptyBodyError, AnnouncementNotFoundError } from '../shared/errors';
import type { UpdateAnnouncementInput, UpdateAnnouncementOutput } from './dto';

export async function updateAnnouncement(
  db: Db,
  id: number,
  body: UpdateAnnouncementInput,
  now: Date = new Date()
): Promise<UpdateAnnouncementOutput> {
  const repo = new UpdateAnnouncementRepository();
  const existing = await repo.findById(db, id);
  if (!existing) throw new AnnouncementNotFoundError();

  const bodyHtml = sanitizeRichText(body.bodyHtml);
  if (isRichTextEmpty(bodyHtml)) throw new AnnouncementEmptyBodyError();

  return repo.update(db, id, {
    title: body.title.trim(),
    bodyHtml,
    status: body.status,
    // La date de publication est posée une fois pour toutes : repasser une annonce en
    // brouillon puis la republier ne doit pas la faire remonter en tête de l'accueil,
    // ni la faire disparaître de l'historique une fois qu'elle a été lue.
    publishedAt: body.status === 'published' ? (existing.publishedAt ?? now) : existing.publishedAt,
    updatedAt: now
  });
}
