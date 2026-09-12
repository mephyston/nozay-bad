import type { D1Database, D1PreparedStatement } from '@cloudflare/workers-types';

/**
 * Compteurs d'**adhésions** de la saison, et non de personnes : les montants et l'état de
 * règlement appartiennent à l'adhésion. Le delta avec la saison précédente compare donc
 * deux effectifs annuels — il ne dit ni le taux de renouvellement ni l'arrivée de nouveaux
 * licenciés, ce que `persons` permettrait désormais de mesurer.
 */
export function buildMembersDashboardStatsStmt(db: D1Database, seasonId: number, prevSeasonId: number | null): D1PreparedStatement {
  /*
   * Les deux compteurs de règlement lisent le **statut**, et non les montants : c'est lui que
   * la liste des adhérents filtre (`?status=`), et le tableau de bord doit annoncer le nombre
   * exact que la liste affichera au clic. Un dossier `suspendu` (annulé côté Poona) n'a rien
   * payé non plus, mais il n'est pas une relance à faire.
   */
  return db.prepare(`
    SELECT
      SUM(CASE WHEN season_id = ? THEN 1 ELSE 0 END) as currentTotal,
      SUM(CASE WHEN season_id = ? THEN 1 ELSE 0 END) as previousTotal,
      SUM(CASE WHEN season_id = ? AND status = 'incomplet' THEN 1 ELSE 0 END) as partiallyPaid,
      SUM(CASE WHEN season_id = ? AND status = 'en_attente' THEN 1 ELSE 0 END) as unpaidCount
    FROM memberships
    WHERE season_id IN (?, ?)
  `).bind(seasonId, prevSeasonId, seasonId, seasonId, seasonId, prevSeasonId);
}
