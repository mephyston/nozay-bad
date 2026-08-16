import { type Db, AppError } from '@nba/db';
import { CreateExpenseRepository } from './repository';
import { isSeasonClosed } from '@nba/members-api';
import { getMemberById } from '@nba/members-api';
import { normalizeCategory } from '@nba/accounting-api';
import { SeasonClosedError, MemberNotEligibleError } from '../shared/errors';
import { CreateExpenseInput, CreateExpenseOutput } from "./dto";

export async function createExpense(
  db: Db,
  body: CreateExpenseInput
): Promise<CreateExpenseOutput> {
  if (await isSeasonClosed(db, body.seasonId)) {
    throw new SeasonClosedError('La saison est clôturée. Impossible de soumettre une note de frais.');
  }

  // M-01 : revalider l'autorisation côté serveur (source de vérité = base), et pas
  // seulement via le flag de session/UI. Le storefront épingle memberId au profil.
  if (body.memberId != null) {
    const member = await getMemberById(db, body.memberId);
    if (!member || !member.expenseAuthorized) {
      throw new MemberNotEligibleError();
    }
  }

  const repo = new CreateExpenseRepository();

  // Aucun repli silencieux : une saison ou une catégorie non résolue imputait la
  // note à la saison 1 / catégorie 1 (Adhésions) sans que personne ne le voie —
  // le genre d'écart comptable qu'on découvre des mois plus tard, au bilan.
  const seasonId = await repo.resolveSeasonId(db, body.seasonId);
  if (seasonId === undefined) {
    throw new AppError(`Saison inconnue : « ${body.seasonId} »`, 400);
  }
  const categoryId = normalizeCategory(body.category);
  if (categoryId === null) {
    throw new AppError(`Catégorie inconnue : « ${body.category} »`, 400);
  }

  // En centimes de bout en bout : l'UI convertit (expense-form-submit.ts), le
  // validateur exige un entier ≥ 1. L'ancien `amountCents || amount` acceptait un
  // champ hors contrat et traitait 0 comme absent.
  const amountCents = body.amount;

  return repo.create(db, {
    seasonId,
    description: body.description,
    categoryId,
    amountCents,
    photoUrl: body.photoUrl || null,
    status: 'pending',
    emitterName: body.emitterName,
    memberId: body.memberId || null,
    createdAt: new Date()
  });
}
