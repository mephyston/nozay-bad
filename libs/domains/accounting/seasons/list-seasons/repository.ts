import { seasonsTable } from '@nba/accounting/schema';
import { type DbOrTx } from '@nba/db';
import { desc } from 'drizzle-orm';


export class ListSeasonsRepository {
  async listSeasons(db: DbOrTx): Promise<any[]> {
    const rows = await db.select().from(seasonsTable).orderBy(desc(seasonsTable.id)).all();

    /*
     * `closed`, dérivé de `closed_at`, parce que toute l'interface le cherche sous ce nom.
     *
     * La table ne porte que `closed_at`, un horodatage. Or le référentiel était rendu brut,
     * et cinq endroits au moins testaient `season.closed` — un champ qui n'existait dans
     * aucune réponse : le relais pour l'affichage en lecture seule, `toSeasonOptions` pour
     * le suffixe « — clôturée », l'en-tête du rapprochement pour son alerte et pour
     * désactiver l'import, et la liste des écritures pointables pour écarter celles d'un
     * exercice clos. Les cinq lisaient `undefined` et se comportaient comme si rien n'était
     * jamais clôturé.
     *
     * Le fond tenait quand même — `validateAccrualAndFiscalPhase` refuse en phase 3 — mais
     * l'utilisateur ne l'apprenait qu'au moment de valider, sur un 400.
     */
    return rows.map((row) => ({ ...row, closed: row.closedAt !== null && row.closedAt !== undefined }));
  }
}
