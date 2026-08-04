import { type Db } from '@nba/db';
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
  const seasonId = await repo.resolveSeasonId(db, body.seasonId);
  const categoryId = normalizeCategory(body.category) || 1;
  const amountCents = (body as any).amountCents || body.amount;

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
