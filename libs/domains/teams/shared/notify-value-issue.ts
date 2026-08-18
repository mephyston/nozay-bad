import { type Db } from '@nba/db';
import { enqueueNotification } from '@nba/notifications-api';
import { formatValue } from './team-value';
import type { GetLineupOutput } from '../get-lineup/dto';
import type { StaffContactsResult } from './staff-contacts';

export interface ValueIssueArgs {
  /** Équipe fautive : celle dont la composition pose problème (celle du dessous). */
  team: { id: number };
  lineup: GetLineupOutput;
  /** Équipe du dessus, seulement quand un dépassement de valeur la concerne. */
  upper: { id: number; lineup: GetLineupOutput } | null;
  ownStaff: StaffContactsResult;
  upperStaff: StaffContactsResult;
  /** Constats à énoncer, dans l'ordre : erreurs dures puis dépassement de valeur. */
  problems: string[];
  /** Mot du coach, ajouté au constat. */
  note?: string | null;
  source: string;
  /**
   * Source du message à l'équipe du dessus. Distincte quand une dédup est demandée :
   * `skipIfSentSince` juge par source, et les deux messages partent dans le même appel —
   * une source commune ferait sauter le second au profit du premier.
   */
  counterpartSource?: string;
  /** Dédup par source : absorbe les re-sauvegardes rapprochées du flux automatique. */
  skipIfSentSince?: Date;
}

export interface ValueIssueResult {
  recipients: number;
  counterpartRecipients: number;
  title: string;
  body: string;
}

/**
 * Met en file le constat d'une composition à revoir, des deux côtés quand il le faut.
 *
 * **Le dépassement de valeur se notifie des deux côtés.** Le règlement fait perdre la
 * rencontre aux *deux* équipes (art. 6.3.2), et la correction peut venir de l'une comme
 * de l'autre : renforcer celle du dessus vaut alléger celle du dessous. Prévenir le seul
 * capitaine fautif le laisserait chercher seul un arbitrage qui ne lui appartient pas ;
 * les deux messages se nomment donc mutuellement pour qu'ils se rapprochent.
 *
 * L'envoi est enveloppé : une notification qui échoue ne fait jamais échouer le métier
 * qui l'a déclenchée (même contrat que `notifyContacts`).
 */
export async function sendValueIssueNotifications(
  db: Db,
  args: ValueIssueArgs,
  now: Date = new Date()
): Promise<ValueIssueResult> {
  const { lineup, upper } = args;
  const dayLabel = lineup.dayLabel ?? `journée ${lineup.dayNumber}`;
  const upperLineup = upper?.lineup ?? null;
  const counterpart = args.upperStaff;

  const note = args.note?.trim() || null;
  const value = lineup.value !== null ? `Valeur actuelle : ${formatValue(lineup.value)}.` : null;
  const together =
    counterpart.names.length > 0 && upperLineup
      ? `Rapprochez-vous de ${counterpart.names.join(' ou ')} (${upperLineup.teamName}) : la correction peut venir de l'une ou l'autre équipe.`
      : null;

  const title = `${lineup.teamName} — ${dayLabel} à revoir`;
  const body = [args.problems.join(' '), value, together, note].filter(Boolean).join(' ');

  try {
    if (args.ownStaff.emails.length > 0) {
      await enqueueNotification(
        db,
        {
          title,
          body,
          url: `/equipes/${args.team.id}/journee/${lineup.dayNumber}`,
          target: { kind: 'emails', emails: args.ownStaff.emails },
          source: args.source,
          category: 'interclubs',
          skipIfSentSince: args.skipIfSentSince
        },
        now
      );
    }

    if (upperLineup && upper && counterpart.emails.length > 0) {
      await enqueueNotification(
        db,
        {
          title: `${upperLineup.teamName} — ${dayLabel} concernée par une valeur d'équipe`,
          body: [
            `${lineup.teamName} présente une valeur supérieure à celle de ${upperLineup.teamName} sur cette ${dayLabel} : les deux équipes perdraient la rencontre.`,
            args.ownStaff.names.length > 0
              ? `Rapprochez-vous de ${args.ownStaff.names.join(' ou ')} (${lineup.teamName}) : la correction peut venir de l'une ou l'autre équipe.`
              : null,
            note
          ]
            .filter(Boolean)
            .join(' '),
          url: `/equipes/${upper.id}/journee/${lineup.dayNumber}`,
          target: { kind: 'emails', emails: counterpart.emails },
          source: args.counterpartSource ?? args.source,
          category: 'interclubs',
          skipIfSentSince: args.skipIfSentSince
        },
        now
      );
    }
  } catch (error) {
    console.error('[push] constat de composition non envoyé :', (error as Error)?.message || error);
  }

  return {
    recipients: args.ownStaff.emails.length,
    counterpartRecipients: upperLineup ? counterpart.emails.length : 0,
    title,
    body
  };
}
