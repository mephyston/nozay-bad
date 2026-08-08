import { type Db } from '@nba/db';
import { enqueueNotification } from '@nba/notifications-api';
import { NotifyAnnouncementRepository } from './repository';
import { richTextToPlain } from '../shared/rich-text';
import {
  AnnouncementAlreadyNotifiedError,
  AnnouncementNotFoundError,
  AnnouncementNotPublishedError
} from '../shared/errors';
import type { NotifyAnnouncementOutput } from './dto';

/** `sendNotificationSchema` plafonne le corps d'une notification à 300 caractères. */
const PUSH_BODY_MAX = 300;

/**
 * Diffuse une annonce publiée sur les téléphones des adhérents abonnés.
 *
 * Volontairement séparé de l'écriture : rédiger une annonce et l'envoyer à tout le club
 * sont deux actes distincts, portés par deux permissions distinctes (la route exige
 * `notifications:messages:send`). C'est aussi ce qui rend l'opération rejouable — un
 * échec de diffusion ne perd pas le texte rédigé.
 */
export async function notifyAnnouncement(
  db: Db,
  id: number,
  now: Date = new Date()
): Promise<NotifyAnnouncementOutput> {
  const repo = new NotifyAnnouncementRepository();
  const announcement = await repo.findById(db, id);
  if (!announcement) throw new AnnouncementNotFoundError();
  if (announcement.status !== 'published') throw new AnnouncementNotPublishedError();
  // Garde d'idempotence : sans elle, chaque enregistrement du formulaire renotifierait
  // tout le club. C'est la raison d'être de la colonne `notified_at`.
  if (announcement.notifiedAt) throw new AnnouncementAlreadyNotifiedError();

  const { queued } = await enqueueNotification(
    db,
    {
      title: announcement.title,
      body: richTextToPlain(announcement.bodyHtml, PUSH_BODY_MAX),
      // La notification ramène vers l'historique, seul endroit où l'annonce reste
      // lisible en entier une fois la notification balayée.
      url: '/annonces',
      target: { kind: 'all' },
      source: 'announcement:published',
      category: 'announcement'
    },
    now
  );

  // Marqué après coup : si la mise en file échoue, l'annonce reste diffusable.
  await repo.markNotified(db, id, now);

  return { id, queued, notifiedAt: now };
}
