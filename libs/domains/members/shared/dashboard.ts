import type { D1Database, D1PreparedStatement } from '@cloudflare/workers-types';

/**
 * Compteurs d'**adhésions** de la saison, et non de personnes : les montants et l'état de
 * règlement appartiennent à l'adhésion. Le delta avec la saison précédente compare deux
 * effectifs annuels.
 *
 * Le renouvellement, lui, se mesure par **personne** : une adhésion de cette saison dont la
 * personne en avait une la saison d'avant est un renouvellement ; les autres sont des
 * arrivées, et l'effectif de n-1 qui ne revient pas se déduit. C'est ce que `persons` a rendu
 * possible — et c'est le chiffre qui compte en septembre, quand l'effectif brut ne dit pas
 * encore si le club a perdu ses habitués ou seulement pas encore reçu les retardataires.
 */
export function buildMembersDashboardStatsStmt(db: D1Database, seasonId: number, prevSeasonId: number | null): D1PreparedStatement {
  /*
   * Les deux compteurs de règlement lisent le **statut**, et non les montants : c'est lui que
   * la liste des adhérents filtre (`?status=`), et le tableau de bord doit annoncer le nombre
   * exact que la liste affichera au clic. Un dossier `suspendu` (annulé côté Poona) n'a rien
   * payé non plus, mais il n'est pas une relance à faire.
   *
   * `renewed` : sans saison précédente (`NULL`), le `EXISTS` ne trouve rien et vaut 0.
   */
  return db.prepare(`
    SELECT
      SUM(CASE WHEN m.season_id = ? THEN 1 ELSE 0 END) as currentTotal,
      SUM(CASE WHEN m.season_id = ? THEN 1 ELSE 0 END) as previousTotal,
      SUM(CASE WHEN m.season_id = ? AND m.status = 'incomplet' THEN 1 ELSE 0 END) as partiallyPaid,
      SUM(CASE WHEN m.season_id = ? AND m.status = 'en_attente' THEN 1 ELSE 0 END) as unpaidCount,
      SUM(CASE WHEN m.season_id = ? AND EXISTS (
        SELECT 1 FROM memberships p WHERE p.person_id = m.person_id AND p.season_id = ?
      ) THEN 1 ELSE 0 END) as renewed
    FROM memberships m
    WHERE m.season_id IN (?, ?)
  `).bind(seasonId, prevSeasonId, seasonId, seasonId, seasonId, prevSeasonId, seasonId, prevSeasonId);
}

/**
 * Effectif par année de naissance et genre, sur une saison : la pyramide des âges se
 * dresse ensuite en mémoire (`agePyramid`), la règle des catégories n'a pas à vivre en SQL.
 */
export function buildMembersAgePyramidStmt(db: D1Database, seasonId: number): D1PreparedStatement {
  return db.prepare(`
    SELECT CAST(substr(p.birth_date, 1, 4) AS INTEGER) AS birthYear, p.gender AS gender, COUNT(*) AS n
    FROM memberships m
    JOIN persons p ON p.id = m.person_id
    WHERE m.season_id = ?
    GROUP BY birthYear, gender
  `).bind(seasonId);
}

/**
 * Les non-renouvelés par groupe de la saison précédente : combien chaque groupe comptait,
 * et combien de ses personnes n'ont pas d'adhésion sur la saison affichée. Par personne,
 * comme le renouvellement du tableau de bord — un poussin monté en Loisirs Jeunes est
 * renouvelé, pas perdu.
 */
export function buildMembersLapsedByGroupStmt(db: D1Database, seasonId: number, prevSeasonId: number): D1PreparedStatement {
  return db.prepare(`
    SELECT prev.type AS groupe,
      COUNT(*) AS previousTotal,
      SUM(CASE WHEN NOT EXISTS (
        SELECT 1 FROM memberships cur WHERE cur.person_id = prev.person_id AND cur.season_id = ?
      ) THEN 1 ELSE 0 END) AS lapsed
    FROM memberships prev
    WHERE prev.season_id = ?
    GROUP BY prev.type
    ORDER BY lapsed DESC, previousTotal DESC
  `).bind(seasonId, prevSeasonId);
}

/**
 * Les renouvelés et les nouveaux par groupe de la saison affichée : l'effectif du groupe,
 * et combien de ses personnes avaient une adhésion la saison précédente. Les nouveaux
 * s'en déduisent (effectif − renouvelés).
 */
export function buildMembersRenewalByGroupStmt(db: D1Database, seasonId: number, prevSeasonId: number): D1PreparedStatement {
  return db.prepare(`
    SELECT cur.type AS groupe,
      COUNT(*) AS total,
      SUM(CASE WHEN EXISTS (
        SELECT 1 FROM memberships prev WHERE prev.person_id = cur.person_id AND prev.season_id = ?
      ) THEN 1 ELSE 0 END) AS renewed
    FROM memberships cur
    WHERE cur.season_id = ?
    GROUP BY cur.type
    ORDER BY total DESC
  `).bind(prevSeasonId, seasonId);
}
