import { CreateBankCheckDepositRepository } from './repository';
import { AppError, type Db } from '@nba/db';
import type { CreateCheckDepositInput, ClearCheckDepositInput, DepositCheckDepositInput } from './dto';
import { Check } from '../../shared/check';

/**
 * Une remise de chèques passe par trois états, et elle naît dans le premier.
 *
 *   à déposer (`pending`) → déposée (`deposited`) → encaissée (`cleared`)
 *
 * Elle naissait « déposée » : le bordereau s'imprime avant d'aller à la banque, et rien ne
 * distinguait une remise préparée sur le bureau d'une remise réellement remise au guichet.
 * Les chèques, eux, restent « reçus » — au coffre — tant que le dépôt n'est pas confirmé :
 * c'est ce que la clôture regarde pour dire qu'un chèque n'est pas encore parti.
 */
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
    // Encore « reçu » mais déjà réservé par une remise à déposer : il ne peut pas partir deux fois.
    if (checkData.checkDepositId) {
      throw new AppError(`Le chèque n°${check.number} figure déjà dans une remise.`, 400);
    }
    totalAmount += check.amount;
  }

  const createdDeposit = await repo.createCheckDeposit(db, {
    seasonId: seasonIdInt,
    reference: body.reference,
    date: body.date,
    amountCents: totalAmount,
    status: 'pending',
    createdAt: new Date()
  });

  // Rattachés au bordereau, toujours au coffre : le statut ne bouge qu'à la confirmation du dépôt.
  await repo.updateChecksDeposit(db, body.checkIds, createdDeposit.id, 'received');

  return repo.getCheckDepositById(db, createdDeposit.id);
}

/** Le bordereau a été remis au guichet : la remise et ses chèques passent « déposés ». */
export async function depositCheckDeposit(db: Db, id: number, body: DepositCheckDepositInput = {}) {
  const repo = new CreateBankCheckDepositRepository();

  // Phase 1 : Lecture (hors batch)
  const deposit = await repo.getCheckDepositById(db, id);
  if (!deposit) {
    throw new AppError('Remise de chèques non trouvée.', 404);
  }
  if (deposit.status !== 'pending') {
    throw new AppError('Cette remise a déjà été déposée en banque.', 400);
  }

  // Phase 2 : Décision (en mémoire)
  const statements: any[] = [
    repo.buildUpdateCheckDepositStatement(db, id, {
      status: 'deposited',
      ...(body.date ? { date: body.date } : {})
    }),
    repo.buildUpdateChecksStatusForDepositStatement(db, id, 'deposited')
  ];

  // Phase 3 : Écriture (db.batch)
  await db.batch(statements as any);

  return repo.getCheckDepositById(db, id);
}

/**
 * La remise apparaît sur le relevé : elle est encaissée.
 *
 * Trois choses se rapprochent d'un seul geste, et la troisième manquait : la remise prend sa
 * ligne de relevé, la ligne est marquée rapprochée, et **les recettes des chèques sont pointées
 * sur cette ligne**. Sans ce dernier point, la ligne était « rapprochée » avec une couverture
 * nulle et les recettes restaient « non pointées » à jamais : l'état de rapprochement portait
 * alors un écart du montant de la remise, qu'aucune de ses lignes ne nommait.
 *
 * Le montant doit être exact : une remise est une seule opération bancaire, et une ligne d'un
 * autre montant est une autre opération — ou une remise dont la banque a rejeté un chèque, ce
 * qui se corrige sur le bordereau, pas en forçant le pointage.
 */
export async function clearCheckDeposit(db: Db, id: number, body: ClearCheckDepositInput) {
  if (!body.bankStatementLineId) {
    throw new AppError('bankStatementLineId requis.', 400);
  }

  const repo = new CreateBankCheckDepositRepository();

  // Phase 1 : Lecture (hors batch)
  const deposit = await repo.getCheckDepositById(db, id);
  if (!deposit) {
    throw new AppError('Remise de chèques non trouvée.', 404);
  }
  if (deposit.status === 'cleared') {
    throw new AppError('Cette remise est déjà encaissée.', 400);
  }
  if (deposit.status !== 'deposited') {
    throw new AppError("Confirmez d'abord le dépôt en banque de cette remise.", 400);
  }

  const line = await repo.getBankStatementLineById(db, body.bankStatementLineId);
  if (!line) {
    throw new AppError('Ligne de relevé introuvable.', 404);
  }
  if (line.status === 'reconciled') {
    throw new AppError('Cette ligne de relevé est déjà rapprochée.', 400);
  }
  const depositCents = deposit.amountCents ?? deposit.amount;
  if (line.amountCents !== depositCents) {
    throw new AppError(
      `La ligne de relevé (${(line.amountCents / 100).toFixed(2)} €) ne porte pas le montant de la remise (${(depositCents / 100).toFixed(2)} €).`,
      400
    );
  }

  const checks = await repo.getChecksByDepositId(db, id);
  const entryIds = checks.map((c: any) => c.ledgerEntryId).filter((v: any): v is number => typeof v === 'number');

  // Phase 2 : Décision (en mémoire)
  const statements: any[] = [
    repo.buildUpdateCheckDepositStatement(db, id, {
      status: 'cleared',
      bankStatementLineId: body.bankStatementLineId
    })
  ];
  if (entryIds.length > 0) {
    statements.push(repo.buildPointLedgerEntriesStatement(db, entryIds, body.bankStatementLineId));
  }
  statements.push(repo.buildUpdateBankStatementLineStatusStatement(db, body.bankStatementLineId, 'reconciled'));

  // Phase 3 : Écriture (db.batch)
  await db.batch(statements as any);
}

export async function deleteCheckDeposit(db: Db, id: number) {
  const repo = new CreateBankCheckDepositRepository();

  // Phase 1 : Lecture (hors batch)
  const deposit = await repo.getCheckDepositById(db, id);
  if (!deposit) {
    throw new AppError('Remise de chèques non trouvée.', 404);
  }
  const checks = deposit.bankStatementLineId ? await repo.getChecksByDepositId(db, id) : [];

  // Phase 2 : Décision (en mémoire)
  const statements: any[] = [];
  if (deposit.bankStatementLineId) {
    // Une remise encaissée se défait entièrement : la ligne redevient à rapprocher et les
    // recettes qu'elle portait retournent au coffre, comme les chèques.
    const entryIds = checks.map((c: any) => c.ledgerEntryId).filter((v: any): v is number => typeof v === 'number');
    if (entryIds.length > 0) {
      statements.push(repo.buildUnpointLedgerEntriesStatement(db, entryIds, deposit.bankStatementLineId));
    }
    statements.push(repo.buildUpdateBankStatementLineStatusStatement(db, deposit.bankStatementLineId, 'pending'));
  }

  statements.push(repo.buildUnlinkChecksForDepositStatement(db, id));
  statements.push(repo.buildDeleteCheckDepositStatement(db, id));

  // Phase 3 : Écriture (db.batch)
  await db.batch(statements as any);
}
