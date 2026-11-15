import { type createDb } from '@nba/db';
import { type SeasonRow } from '@nba/accounting-api';
import { getContactEmailsForClubFunctions } from '@nba/members-api';
import { listOpenPlaySessions } from '@nba/schedules-api';
import { enqueueNotification } from '@nba/notifications-api';

/** Origine du message, reprise par le registre des envois programmés. */
export const OPEN_PLAY_BOARD_ALERT_SOURCE = 'schedules:open-play-board-alert';

/** Le lendemain d'une date `AAAA-MM-JJ`, sans dépendre du fuseau du Worker. */
function lendemain(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

/**
 * Prévient le bureau, la veille, des séances de jeu libre que personne ne s'est engagé
 * à ouvrir (RF-SCH-005 §3, alerte au bureau).
 *
 * Toutes les séances ouvertes et sans bénévole comptent, **seuil atteint ou non** :
 * l'appel aux bénévoles cherche quelqu'un pour une séance qui le mérite, celui-ci laisse
 * au bureau le soin de trouver quelqu'un ou d'annuler avant que des joueurs ne viennent
 * devant une porte close.
 *
 * Même montage que l'appel aux bénévoles : le domaine des créneaux est feuille, la
 * composition avec les adhérents et les notifications se fait ici.
 */
export async function sendOpenPlayBoardAlert(
  db: ReturnType<typeof createDb>,
  season: SeasonRow,
  now: Date,
  clubToday: string
): Promise<void> {
  const demain = lendemain(clubToday);
  const { sessions: toutes } = await listOpenPlaySessions(
    db,
    { from: demain, to: demain, includeCancelled: false },
    now
  );
  const sessions = toutes.filter((s) => s.status === 'open' && s.openerLicence === null);
  if (sessions.length === 0) return;

  const emails = await getContactEmailsForClubFunctions(db, season.id);
  if (emails.length === 0) {
    console.log('[push] jeu libre (bureau) : aucune fonction du club renseignée, rien à envoyer');
    return;
  }

  const detail = sessions
    .slice(0, 2)
    .map((s) => `${s.startTime}${s.venue ? ` à ${s.venue.name}` : ''} (${s.playerCount} inscrit${s.playerCount > 1 ? 's' : ''})`)
    .join(', ');
  const plusieurs = sessions.length > 1;

  const result = await enqueueNotification(
    db,
    {
      title: plusieurs ? 'Demain : séances sans bénévole' : 'Demain : séance sans bénévole',
      body: `${sessions.length} séance${plusieurs ? 's' : ''} de jeu libre demain sans personne pour ouvrir : ${detail}${sessions.length > 2 ? '…' : ''}. Trouvez un bénévole ou annulez.`,
      url: '/jeu-libre',
      target: { kind: 'emails', emails },
      targetLabel: 'emails',
      targetDetail: 'fonctions du club',
      source: OPEN_PLAY_BOARD_ALERT_SOURCE,
      category: 'open_play',
      // Un Cron Trigger peut être invoqué plus d'une fois pour la même échéance.
      skipIfSentSince: new Date(now.getTime() - 20 * 60 * 60 * 1000)
    },
    now
  );

  if (!result.skipped) {
    console.log(`[push] jeu libre (bureau) : ${result.queued} appareil(s) en file pour ${sessions.length} séance(s)`);
  }
}
