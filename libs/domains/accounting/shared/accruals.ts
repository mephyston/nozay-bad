import { type DbOrTx, AppError } from '@nba/db';
import { eq, or } from 'drizzle-orm';
import { seasonsTable } from './schema';

export interface AccrualValidationParams {
  seasonId: number | string;
  type: 'recette' | 'depense' | 'transfert';
  date: string;
  accrualType?: string | null;
  accrualNote?: string | null;
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

  const todayStr = new Date().toISOString().split('T')[0];
  const accrualType = params.accrualType || 'normal';

  // Phase 3: Arrêté (closed_at IS NOT NULL) -> READ ONLY!
  if (season.closedAt !== null && season.closedAt !== undefined) {
    throw new AppError("L'exercice comptable est arrêté et clôturé (closed_at). Aucune écriture ni modification n'est autorisée.", 400);
  }

  // Phase 2: Inventaire (today > season.endDate AND closed_at IS NULL)
  if (todayStr > season.endDate) {
    if (accrualType !== 'charge_a_payer' && accrualType !== 'produit_a_recevoir') {
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
