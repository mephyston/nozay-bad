import { type Db } from '@metacult/shared-db';
import { CreateExpenseRepository } from './repository';
import { isSeasonClosed } from '@metacult/features-members-api';
import { normalizeCategory } from '@metacult/features-accounting-api';
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
  return repo.create(db, {
    seasonId: body.seasonId,
    description: body.description,
    category: normalizeCategory(body.category) || 1,
    amount: body.amount,
    photoUrl: body.photoUrl || null,
    status: 'pending',
    emitterName: body.emitterName,
    memberId: body.memberId || null,
    createdAt: new Date()
  });
}
