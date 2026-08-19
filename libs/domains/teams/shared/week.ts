/**
 * La semaine, unité qui relie les championnats entre eux.
 *
 * Chaque championnat numérote ses journées pour lui seul : la J1 du régional, celle du
 * mixte départemental et celle du masculin sont trois dates sans rapport, fixées par des
 * comités différents. Comparer des numéros de journée d'un championnat à l'autre n'a
 * aucun sens.
 *
 * Mais une journée **est** une semaine — « les rencontres disputées du lundi au dimanche
 * d'une même semaine » (art. 6.3.6) — et toutes les règles croisées se formulent en
 * semaines :
 *
 *   * un joueur ne tient qu'une seule équipe du club par semaine, mixte et masculin
 *     confondus (ICD art. 6.3.7) ;
 *   * il ne peut pas disputer un ICD et un ICR ou ICN la même semaine (ICD art. 6.1.7) ;
 *   * en régional, une seule équipe par semaine (ICR art. 4.5), et la hiérarchie des
 *     valeurs s'apprécie elle aussi « au cours d'une même semaine » (art. 5.5).
 *
 * D'où le lundi comme **clé de jointure**. Une date de début de semaine qui ne tomberait
 * pas un lundi ferait échouer l'égalité entre deux championnats et laisserait passer un
 * joueur aligné deux fois — l'infraction la plus coûteuse du règlement, puisqu'elle fait
 * perdre la rencontre à toutes les équipes concernées. On normalise donc à l'écriture.
 */

/** Lundi de la semaine contenant `iso`, en ISO. Idempotent : un lundi se rend lui-même. */
export function mondayOf(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  // getUTCDay : 0 = dimanche. Le lundi est à −6 du dimanche, à −(jour − 1) sinon.
  const day = date.getUTCDay();
  const shift = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + shift);
  return date.toISOString().slice(0, 10);
}

/** Dimanche de la même semaine : le lundi plus six jours. */
export function sundayOf(iso: string): string {
  const monday = new Date(`${mondayOf(iso)}T00:00:00Z`);
  monday.setUTCDate(monday.getUTCDate() + 6);
  return monday.toISOString().slice(0, 10);
}

/** Deux dates tombent-elles dans la même semaine calendaire ? */
export function isSameWeek(a: string, b: string): boolean {
  return mondayOf(a) === mondayOf(b);
}

/**
 * Championnats qui se partagent la contrainte « une seule équipe du club par semaine ».
 *
 * Le mixte et le masculin départementaux se citent mutuellement (art. 6.3.7), et le mixte
 * interdit en plus de cumuler avec le régional dans la semaine (art. 6.1.7) : les trois
 * ne forment donc qu'un seul groupe d'exclusion.
 *
 * Les vétérans restent à part : leur règlement n'évoque qu'« une seule équipe de son
 * club » sans citer d'autre championnat. Étendre la contrainte au-delà de sa lettre
 * bloquerait des compositions que le règlement autorise.
 */
export const WEEKLY_EXCLUSION_GROUPS = [
  ['icd_mixte', 'icd_masculin', 'icr_seniors'],
  ['icd_veterans']
] as const;

export function weeklyExclusionGroup(championship: string): readonly string[] {
  return (
    WEEKLY_EXCLUSION_GROUPS.find((group) => (group as readonly string[]).includes(championship)) ??
    [championship]
  );
}
