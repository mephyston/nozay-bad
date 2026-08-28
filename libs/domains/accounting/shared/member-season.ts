import { type DbOrTx, AppError } from '@nba/db';
import { eq } from 'drizzle-orm';
import { seasonsTable } from '@nba/accounting/schema';
import { getMemberById, getMembershipForPersonInSeason } from '@nba/members-api';

/**
 * `ledger_entries.member_id` désigne une **adhésion**, pas une personne.
 *
 * Une adhésion appartient à un exercice et à un seul : rattacher une écriture de 26-27 à
 * l'adhésion 25-26 de la même personne produit un couple (adhésion, exercice) qui n'existe
 * nulle part. `getMemberTotalPayments` filtre sur les deux à la fois — le règlement disparaît
 * alors des DEUX dossiers, celui de l'année écoulée comme celui de la rentrée, et l'attestation
 * ne le trouve pas davantage. Rien ne le signale : les montants, le compte, l'exercice et la
 * catégorie sont justes, seul le rattachement est faux.
 *
 * C'est arrivé pour de vrai le 25/08/2026, sur trois cotisations de rentrée encaissées en août :
 * l'analyse proposait l'adhésion de l'exercice consulté, l'écran la retenait, et l'écriture
 * partait sur l'exercice suivant. Les trois ont dû être réparées en base.
 *
 * Le contrôle est ici plutôt que dans chaque écran : un formulaire peut filtrer son annuaire,
 * il ne peut pas empêcher un appel direct à l'API.
 *
 * Une écriture sans adhérent ne coûte AUCUNE lecture, et le libellé de l'exercice comme
 * l'adhésion de remplacement ne se lisent que sur le chemin d'échec : la garde ne doit pas se
 * payer sur le cas courant.
 */
export async function assertMembershipMatchesSeason(
  db: DbOrTx,
  memberId: number | null | undefined,
  seasonId: number
): Promise<void> {
  if (memberId === null || memberId === undefined) return;

  const membership = await getMemberById(db, memberId);
  if (!membership) {
    throw new AppError(`Adhésion n°${memberId} introuvable : l'écriture ne peut pas s'y rattacher.`, 404);
  }
  if (membership.seasonId === seasonId) return;

  const season = await db.select({ code: seasonsTable.code })
    .from(seasonsTable)
    .where(eq(seasonsTable.id, seasonId))
    .get();
  const code = season?.code ?? `n°${seasonId}`;

  /* L'adhésion de la même personne dans le bon exercice, quand elle existe : le message dit
     quoi faire, il ne se contente pas de refuser. */
  const expected = await getMembershipForPersonInSeason(db, membership.personId, seasonId);

  throw new AppError(
    expected
      ? `L'adhérent choisi relève d'un autre exercice que l'écriture. Rattachez-la à son adhésion de l'exercice ${code} (n°${expected.id}).`
      : `L'adhérent choisi relève d'un autre exercice que l'écriture, et n'a pas d'adhésion en ${code}. Laissez le champ vide, ou changez l'exercice de rattachement.`,
    400
  );
}
