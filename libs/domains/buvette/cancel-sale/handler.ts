import { AppError, type Db } from '@nba/db';
import { CancelSaleRepository } from './repository';
import type { CancelSaleInput } from './dto';

/**
 * Annule une vente tant que sa session est ouverte : la carte retrouve ce qu'elle a payé, et
 * perd ce qu'une recharge lui avait apporté. Une recharge déjà consommée fait échouer le CHECK
 * du solde et donc tout le lot. La clé des mouvements empêche d'annuler deux fois.
 */
export async function cancelSale(db: Db, input: CancelSaleInput) {
  const repo = new CancelSaleRepository();
  const sale = await repo.getSale(db, input.saleId);
  if (!sale) throw new AppError('Vente introuvable.', 404);
  if (sale.status !== 'paid') throw new AppError('Cette vente est déjà annulée.', 409);
  const session = await repo.getSession(db, sale.sessionId);
  if (session?.status !== 'open') throw new AppError('La session de cette vente est clôturée : voyez avec la trésorerie.', 409);

  const by = input.cancelledByEmail;
  const reverse = (suffix: string, cardId: number, amountCents: number) => [
    repo.buildBalanceStatement(db, cardId, amountCents),
    repo.buildMovementStatement(db, sale.sessionId, {
      clientId: `cancel-${suffix}-${sale.clientId}`,
      cardId,
      saleId: sale.id,
      type: 'cancel',
      amountCents,
      createdByEmail: by,
      createdAt: new Date()
    })
  ];

  const statements: any[] = [repo.buildCancelStatement(db, sale.id, by)];
  if (sale.prepaidCardId && sale.prepaidCents > 0) statements.push(...reverse('debit', sale.prepaidCardId, sale.prepaidCents));
  if (sale.rechargeCardId && sale.rechargeCents > 0) statements.push(...reverse('recharge', sale.rechargeCardId, -sale.rechargeCents));

  try {
    const results: any[] = await db.batch(statements as any);
    // Une vente en espèces n'a pas de mouvement : seul le verrou de cette instruction la garde.
    if (!results[0]?.meta?.changes) throw new AppError('Cette vente ne peut plus être annulée : sa session vient de se clôturer.', 409);
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (/NOT NULL/i.test(String(error))) throw new AppError('Cette vente ne peut plus être annulée : sa session vient de se clôturer.', 409);
    if (/CHECK/i.test(String(error))) throw new AppError('La recharge a déjà été consommée : cette vente ne peut plus être annulée.', 409);
    if (/UNIQUE/i.test(String(error))) throw new AppError('Cette vente est déjà annulée.', 409);
    throw error;
  }
  return repo.getSale(db, sale.id);
}
