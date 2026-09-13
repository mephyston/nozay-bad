import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { announceIndiv, formatWindow, slotWindows } from '@nba/schedules-api';
import { getContactEmailsForMembers } from '@nba/members-api';
import { enqueueNotification } from '@nba/notifications-api';

/**
 * L'annonce des retenus d'une soirée d'indiv, composée avec les notifications.
 *
 * Cette route vit dans l'app et non dans le domaine `schedules`, qui est feuille : il
 * ne peut ni résoudre les adresses des candidats (`members`) ni enfiler une
 * notification. C'est aussi ce qui rend une annonce sans notification impossible — le
 * handler du domaine n'a pas de route à lui, et le relais d'administration n'a qu'un
 * seul appel à faire. Même précédent que `notificationsSendRouter`.
 *
 * Montée sur `/schedules` **avant** le routeur du domaine : Hono retient la première
 * correspondance, et le drapeau `INDIV_ENABLED` couvre le préfixe entier.
 */

export type IndivBindings = { DB: D1Database };

export const indivRouter = new Hono<{ Bindings: IndivBindings }>();

/** « mardi 17 mars », comme l'espace adhérent l'écrit. Date naïve : formatée en UTC à midi, elle ne bouge dans aucun fuseau. */
function dateLabel(date: string): string {
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(
    new Date(`${date}T12:00:00Z`)
  );
}

indivRouter.post('/indiv/:id/announce', async (c) => {
  if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  const sessionId = Number(c.req.param('id'));
  if (!Number.isSafeInteger(sessionId) || sessionId < 1) {
    return c.json({ success: false, error: 'Identifiant de séance invalide' }, 400);
  }

  const db = createDb(c.env.DB);
  const now = new Date();
  const result = await announceIndiv(db, { sessionId }, now);
  const { session, selected, declined, reannounced } = result;

  const label = dateLabel(session.date);
  const windows = slotWindows(session);
  const update = reannounced ? ' (mise à jour)' : '';
  // La `source` porte l'horodatage de l'annonce : une ré-annonce est un nouveau message,
  // pas un doublon — et `skipIfSentSince` n'est volontairement pas passé.
  const version = Math.floor((session.announcedAt ?? now).getTime() / 1000);

  // Une notification par créneau retenu, pour que chacun lise son heure : deux créneaux,
  // deux messages, ce n'est pas une diffusion.
  const notified = { selected: 0, declined: 0 };
  for (const window of windows) {
    const members = selected.filter((r) => r.selectedSlot === window.index).map((r) => r.memberId);
    if (members.length === 0) continue;
    const emails = await getContactEmailsForMembers(db, members);
    if (emails.length === 0) continue;
    const sent = await enqueueNotification(
      db,
      {
        title: `Indiv du ${label} : vous êtes retenu·e${update}`,
        body: `Créneau ${window.index} (${formatWindow(window)}). À tout à l'heure sur le terrain !`,
        url: '/indiv',
        target: { kind: 'emails', emails },
        targetLabel: 'emails',
        targetDetail: `retenus indiv ${session.date} créneau ${window.index}`,
        category: 'indiv',
        source: `indiv:announce:selected:${session.id}:${version}`
      },
      now
    );
    notified.selected += sent.queued;
  }

  const declinedEmails = await getContactEmailsForMembers(db, declined.map((r) => r.memberId));
  if (declinedEmails.length > 0) {
    const sent = await enqueueNotification(
      db,
      {
        title: `Indiv du ${label} : pas cette fois${update}`,
        body: 'Les places sont allées à ceux qui en ont eu moins, ou aux plus jeunes. Recandidatez à la prochaine soirée.',
        url: '/indiv',
        target: { kind: 'emails', emails: declinedEmails },
        targetLabel: 'emails',
        targetDetail: `non retenus indiv ${session.date}`,
        category: 'indiv',
        source: `indiv:announce:declined:${session.id}:${version}`
      },
      now
    );
    notified.declined = sent.queued;
  }

  if (notified.selected === 0) {
    console.log(`[indiv] annonce ${session.id} : aucun retenu joignable ou abonné`);
  }

  return c.json({ success: true, data: { session, reannounced, notified } });
});
