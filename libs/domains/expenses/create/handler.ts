import { CreateExpenseRepository } from './repository';
import { isSeasonClosed } from '@metacult/features-members-data-access';
import { normalizeCategory } from '@metacult/features-accounting-data-access';
import { AppError } from '@metacult/shared-db';

export async function createExpense(
  db: any,
  body: {
    seasonId: string;
    description: string;
    category: string | number;
    amount: number;
    photoUrl?: string | null;
    emitterName: string;
    memberId?: number | null;
  }
) {
  if (await isSeasonClosed(db, body.seasonId)) {
    throw new AppError('La saison est clôturée. Impossible de soumettre une note de frais.', 400);
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
