import { type Db } from '@nba/db';
import { enqueueNotification } from '@nba/notifications-api';
import { richTextToPlain, CMS_PROFILE } from '@nba/html';
import {
  CmsPostAlreadyNotifiedError,
  CmsPostNotFoundError,
  CmsPostNotPrivateError,
  CmsPostNotPublishedError
} from '../../shared/errors';
import { NotifyPostRepository } from './repository';
import type { NotifyPostOutput } from './dto';

/** `sendNotificationSchema` plafonne le corps d'une notification à 300 caractères. */
const PUSH_BODY_MAX = 300;

/**
 * Diffuse une actualité réservée aux adhérents sur leurs téléphones.
 *
 * Repris des annonces, dont ce geste était la raison d'être. Il reste **séparé de
 * l'écriture** : rédiger et alerter tout le club sont deux actes distincts, portés par
 * deux permissions distinctes (la route exige `notifications:messages:send`). C'est
 * aussi ce qui rend l'opération rejouable — un échec de diffusion ne perd pas le texte.
 */
export async function notifyPost(
  db: Db,
  id: number,
  now: Date = new Date()
): Promise<NotifyPostOutput> {
  const repo = new NotifyPostRepository();
  const post = await repo.findById(db, id);
  if (!post) throw new CmsPostNotFoundError();
  if (post.status !== 'published') throw new CmsPostNotPublishedError();
  if (post.visibility !== 'private') throw new CmsPostNotPrivateError();
  // Garde d'idempotence : sans elle, chaque enregistrement du formulaire renotifierait
  // tout le club. C'est la raison d'être de la colonne `notified_at`.
  if (post.notifiedAt) throw new CmsPostAlreadyNotifiedError();

  const { queued } = await enqueueNotification(
    db,
    {
      title: post.title,
      // Le chapô fait autorité quand il existe : c'est la phrase que la rédaction a
      // choisie pour résumer. À défaut, le corps réduit en texte brut.
      body: post.excerpt?.trim()
        ? post.excerpt.trim().slice(0, PUSH_BODY_MAX)
        : richTextToPlain(post.bodyHtml, PUSH_BODY_MAX, CMS_PROFILE),
      // La notification ramène vers l'espace adhérent, seul endroit où une actualité
      // réservée est lisible en entier une fois la notification balayée.
      url: '/actualites',
      target: { kind: 'all' },
      source: 'post:published',
      category: 'announcement'
    },
    now
  );

  // Marqué après coup : si la mise en file échoue, l'actualité reste diffusable.
  await repo.markNotified(db, id, now);

  return { id, queued, notifiedAt: now };
}
