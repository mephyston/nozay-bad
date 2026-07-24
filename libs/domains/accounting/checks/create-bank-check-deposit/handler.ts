import { CreateBankCheckDepositRepository } from './repository';
import { AppError, type Db, type Tx } from '@nba/db';
import { sql } from 'drizzle-orm';
import type { CreateCheckDepositInput, ClearCheckDepositInput } from './dto';
import { Check } from '../../shared/check';

export async function createCheckDeposit(db: Db, body: CreateCheckDepositInput) {
  if (!body.seasonId || !body.reference || !body.date || !body.checkIds || body.checkIds.length === 0) {
    throw new AppError('Champs requis manquants.', 400);
  }

  const repo = new CreateBankCheckDepositRepository();

  const seasonIdInt = await repo.resolveSeasonId(db, body.seasonId);

  // Phase 1 : Lecture (hors batch)
  const checksToDeposit = await repo.getChecksByIds(db, body.checkIds);
  if (checksToDeposit.length === 0) {
    throw new AppError('Aucun chèque valide trouvé.', 400);
  }

  let totalAmount = 0;
  for (const checkData of checksToDeposit) {
    const check = new Check(checkData);
    if (!check.canBeDeposited()) {
      throw new AppError('Un chèque n\'est pas dans un état valide pour être déposé.', 400);
    }
    totalAmount += check.amount;
  }

  const createdDeposit = await repo.createCheckDeposit(db, {
    seasonId: seasonIdInt,
    reference: body.reference,
    date: body.date,
    amountCents: totalAmount,
    status: 'deposited',
    createdAt: new Date()
  });

  await repo.updateChecksDeposit(db, body.checkIds, createdDeposit.id, 'deposited');

  return repo.getCheckDepositById(db, createdDeposit.id);
}

export async function clearCheckDeposit(db: Db, id: number, body: ClearCheckDepositInput) {
  if (!body.bankStatementLineId) {
    throw new AppError('bankStatementLineId requis.', 400);
  }

  const repo = new CreateBankCheckDepositRepository();

  const stmt1 = repo.buildUpdateCheckDepositStatement(db, id, {
    status: 'cleared',
    bankStatementLineId: body.bankStatementLineId
  });

  const stmt2 = repo.buildUpdateBankStatementLineStatusStatement(db, body.bankStatementLineId, 'reconciled');

  await db.batch([stmt1, stmt2]);
}

export async function deleteCheckDeposit(db: Db, id: number) {
  const repo = new CreateBankCheckDepositRepository();

  // Phase 1 : Lecture (hors batch)
  const deposit = await repo.getCheckDepositById(db, id);
  if (!deposit) {
    throw new AppError('Remise de chèques non trouvée.', 404);
  }

  // Phase 2 : Décision (en mémoire)
  const statements: any[] = [];
  if (deposit.bankStatementLineId) {
    statements.push(repo.buildUpdateBankStatementLineStatusStatement(db, deposit.bankStatementLineId, 'pending'));
  }

  statements.push(repo.buildUnlinkChecksForDepositStatement(db, id));
  statements.push(repo.buildDeleteCheckDepositStatement(db, id));

  // Phase 3 : Écriture (db.batch)
  await db.batch(statements as any);
}
