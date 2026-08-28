import { seasonsTable } from '@nba/accounting/schema';
import { type DbOrTx, AppError } from '@nba/db';
import { eq, or } from 'drizzle-orm';
import { assertMembershipMatchesSeason } from './member-season';


export interface AccrualValidationParams {
  seasonId: number | string;
  type: 'recette' | 'depense' | 'transfert';
  date: string;
  accrualType?: string | null;
  accrualNote?: string | null;
  /**
   * L'adhésion à laquelle l'écriture se rattache, quand elle en désigne une.
   *
   * Passée ici plutôt que contrôlée par chaque appelant : cette fonction est la porte que tous
   * les chemins d'écriture franchissent déjà, et elle tient la saison résolue dont le contrôle
   * a besoin. Voir [[assertMembershipMatchesSeason]] pour ce qu'une adhésion d'un autre
   * exercice fait disparaître.
   */
  memberId?: number | null;
}

export async function getSeasonFromDb(db: DbOrTx, seasonId: number | string) {
  if (typeof seasonId === 'number' || !isNaN(Number(seasonId))) {
    const numericId = Number(seasonId);
    const result = await db.select().from(seasonsTable).where(or(eq(seasonsTable.id, numericId), eq(seasonsTable.code, String(seasonId)))).get();
    if (result) return result;
  }
  return db.select().from(seasonsTable).where(eq(seasonsTable.code, String(seasonId))).get();
}

export async function validateAccrualAndFiscalPhase(db: DbOrTx, params: AccrualValidationParams) {
  const season = await getSeasonFromDb(db, params.seasonId);
  if (!season) {
    throw new AppError("Saison comptable introuvable.", 404);
  }

  await assertMembershipMatchesSeason(db, params.memberId, season.id);

  const todayStr = new Date().toISOString().split('T')[0];
  const accrualType = params.accrualType || 'normal';

  // Phase 3: Arrêté (closed_at IS NOT NULL) -> READ ONLY!
  if (season.closedAt !== null && season.closedAt !== undefined) {
    if (accrualType !== 'recette_exercice_anterieur') {
      throw new AppError("L'exercice comptable est arrêté et clôturé (closed_at). Aucune écriture ni modification n'est autorisée.", 400);
    }
  }

  // Phase 2: Inventaire (today > season.endDate AND closed_at IS NULL)
  if (todayStr > season.endDate) {
    if (accrualType !== 'charge_a_payer' && accrualType !== 'produit_a_recevoir' && accrualType !== 'recette_exercice_anterieur') {
      throw new AppError("L'exercice est en période d'inventaire. Seules les régularisations de fin d'exercice (charge à payer, produit à recevoir) sont autorisées.", 400);
    }
  }

  // Accrual & Date Bounds Validation
  const isDateInBounds = (params.date >= season.startDate && params.date <= season.endDate);

  if (accrualType === 'normal') {
    if (!isDateInBounds) {
      throw new AppError("La date de l'écriture sort des bornes de l'exercice sélectionné. Un motif de rattachement (accrual_type) et une note explicative (accrual_note) sont obligatoires.", 400);
    }
  } else {
    if (!params.accrualNote || params.accrualNote.trim().length === 0) {
      throw new AppError("Une note explicative (accrual_note) est obligatoire pour toute écriture de régularisation.", 400);
    }
  }

  /*
   * Cohérence du cut-off avec la date : c'est elle qui définit chacun des quatre motifs.
   *
   * Un « constaté d'avance » désigne de l'argent passé **avant** que l'exercice de
   * rattachement ne commence ; un « à recevoir » ou « à payer », de l'argent qui passera
   * **après** qu'il se soit terminé. Le motif ne décrit rien d'autre que cet écart, et
   * sans écart il n'y a pas de régularisation — l'écriture est simplement `normal`.
   *
   * Le contrôle manquait, et son absence ne se voyait nulle part : un produit constaté
   * d'avance posé sur l'exercice qui l'encaisse était accepté sans un mot, puis compté
   * dans le résultat de l'année qui se clôture — exactement l'erreur que le rattachement
   * est là pour empêcher. Le compte de résultat lit `season_id`, la note explicative ne
   * dit rien à personne, et l'écart entre les deux ne remontait qu'à la clôture.
   */
  const isDeferral = accrualType === 'produit_constate_avance' || accrualType === 'charge_constatee_avance';
  const isPending = accrualType === 'produit_a_recevoir' || accrualType === 'charge_a_payer';

  if (isDeferral && params.date >= season.startDate) {
    throw new AppError(
      `Un « constaté d'avance » se rattache à l'exercice qui suit l'encaissement : la date ${params.date} tombe déjà dans l'exercice ${season.code}, qui débute le ${season.startDate}. Choisissez l'exercice suivant comme rattachement, ou une écriture normale.`,
      400
    );
  }

  if (isPending && params.date <= season.endDate) {
    throw new AppError(
      `Un « à recevoir » ou « à payer » se rattache à l'exercice déjà terminé : la date ${params.date} tombe encore dans l'exercice ${season.code}, qui s'achève le ${season.endDate}. Une écriture normale convient.`,
      400
    );
  }

  // Coherence of accrual type vs transaction type
  if (params.type === 'transfert') {
    if (accrualType !== 'normal') {
      throw new AppError("Aucune régularisation n'est autorisée sur un virement interne.", 400);
    }
  } else if (params.type === 'recette') {
    if (accrualType === 'charge_constatee_avance' || accrualType === 'charge_a_payer') {
      throw new AppError("Les régularisations de type charge ne sont pas autorisées sur une recette.", 400);
    }
  } else if (params.type === 'depense') {
    if (accrualType === 'produit_constate_avance' || accrualType === 'produit_a_recevoir') {
      throw new AppError("Les régularisations de type produit ne sont pas autorisées sur une dépense.", 400);
    }
  }

  return season;
}
