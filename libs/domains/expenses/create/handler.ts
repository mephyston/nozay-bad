import { type Db } from '@nba/db';
import { CreateExpenseRepository } from './repository';
import { isSeasonClosed } from '@nba/members-api';
import { normalizeCategory } from '@nba/accounting-api';
import { SeasonClosedError } from '../shared/errors';
import { CreateExpenseInput, CreateExpenseOutput } from "./dto";

export async function createExpense(
  db: Db,
  body: CreateExpenseInput
): Promise<CreateExpenseOutput> {
  if (await isSeasonClosed(db, body.seasonId)) {
    throw new SeasonClosedError('La saison est clôturée. Impossible de soumettre une note de frais.');
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
