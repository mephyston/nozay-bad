import { CreateBankCheckDepositRepository } from './repository';
import { AppError, type Db, type Tx } from '@nba/db';
import type { CreateCheckDepositInput, ClearCheckDepositInput } from './dto';
import { Check } from '../../shared/check';

export async function createCheckDeposit(db: Db, body: CreateCheckDepositInput) {
  if (!body.seasonId || !body.reference || !body.date || !body.checkIds || body.checkIds.length === 0) {
    throw new AppError('Champs requis manquants.', 400);
  }

  const repo = new CreateBankCheckDepositRepository();

  return db.transaction(async (txDb: Tx) => {
    const checksToDeposit = await repo.getChecksByIds(txDb, body.checkIds);
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

    const deposit = await repo.createCheckDeposit(txDb, {
      seasonId: body.seasonId,
      reference: body.reference,
      date: body.date,
      amount: totalAmount,
      status: 'deposited',
      createdAt: new Date()
    });

    await repo.updateChecksDeposit(txDb, body.checkIds, deposit.id, 'deposited');

    return deposit;
  });
}

export async function clearCheckDeposit(db: Db, id: number, body: ClearCheckDepositInput) {
  if (!body.bankStatementLineId) {
    throw new AppError('bankStatementLineId requis.', 400);
  }

  const repo = new CreateBankCheckDepositRepository();

  return db.transaction(async (txDb: Tx) => {
    await repo.updateCheckDeposit(txDb, id, {
      status: 'cleared',
      bankStatementLineId: body.bankStatementLineId
    });

    await repo.updateBankTransactionStatus(txDb, body.bankStatementLineId, 'reconciled');
  });
}

export async function deleteCheckDeposit(db: Db, id: number) {
  const repo = new CreateBankCheckDepositRepository();

  return db.transaction(async (txDb: Tx) => {
    const deposit = await repo.getCheckDepositById(txDb, id);
    if (!deposit) {
      throw new AppError('Remise de chèques non trouvée.', 404);
    }

    if (deposit.bankStatementLineId) {
      await repo.updateBankTransactionStatus(txDb, deposit.bankStatementLineId, 'pending');
    }

    await repo.unlinkChecksForDeposit(txDb, id);
    await repo.deleteCheckDeposit(txDb, id);
  });
}
