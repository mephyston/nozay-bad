import { AppError, type Db } from '@nba/db';
import { isCardGone } from '../shared/queries.repository';
import { isClosedSessionError } from '../shared/validation';
import { CancelSaleRepository } from './repository';
import type { CancelSaleInput } from './dto';

/**
 * Rembourse une vente tant que sa session est ouverte : la carte retrouve ce qu'elle a payé, et
 * perd ce qu'une recharge lui avait apporté. Si la carte a été supprimée, sa part sort en espèces. Une recharge déjà consommée fait échouer le CHECK
 * du solde et donc tout le lot. La clé des mouvements empêche d'annuler deux fois.
 */
export async function cancelSale(db: Db, input: CancelSaleInput) {
  const repo = new CancelSaleRepository();
  const sale = await repo.getSale(db, input.saleId);
  if (!sale) throw new AppError('Vente introuvable.', 404);
  if (sale.status === 'in_progress') throw new AppError('Cette vente attend sa CB : abandonnez-la plutôt.', 409);
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

  const prepaidCard = sale.prepaidCardId && sale.prepaidCents > 0 ? await repo.getCard(db, sale.prepaidCardId) : undefined;
  const cardGone = Boolean(prepaidCard && isCardGone(prepaidCard));

  const statements: any[] = [repo.buildCancelStatement(db, sale.id, by)];
  if (cardGone) {
    // Un mouvement `refund` : il sort des espèces attendues, et le virement de clôture suit.
    statements.push(repo.buildMovementStatement(db, sale.sessionId, {
      clientId: `cancel-refund-${sale.clientId}`,
      cardId: prepaidCard!.id,
      saleId: sale.id,
      type: 'refund',
      amountCents: -sale.prepaidCents,
      createdByEmail: by,
      createdAt: new Date()
    }));
  } else if (prepaidCard) {
    statements.push(...reverse('debit', prepaidCard.id, sale.prepaidCents));
  }
  if (sale.rechargeCardId && sale.rechargeCents > 0) statements.push(...reverse('recharge', sale.rechargeCardId, -sale.rechargeCents));
  if (sale.rechargeCardId && sale.rechargeCents > 0) statements.push(repo.buildResetPaperStatement(db, sale.rechargeCardId));
  if (sale.orderId) statements.push(repo.buildCancelOrderStatement(db, sale.orderId));

  try {
    const results: any[] = await db.batch(statements as any);
    // Une vente en espèces n'a pas de mouvement : seul le verrou de cette instruction la garde.
    if (!results[0]?.meta?.changes) throw new AppError('Cette vente ne peut plus être annulée : sa session vient de se clôturer.', 409);
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (isClosedSessionError(error)) throw new AppError('Cette vente ne peut plus être annulée : sa session vient de se clôturer.', 409);
    if (/CHECK/i.test(String(error))) throw new AppError('La recharge a déjà été consommée : cette vente ne peut plus être annulée.', 409);
    if (/UNIQUE/i.test(String(error))) throw new AppError('Cette vente est déjà annulée.', 409);
    throw error;
  }
  // Le remboursement CB se fait dans SumUp : la caisse le rappelle au bénévole.
  return {
    sale: await repo.getSale(db, sale.id),
    cardCreditedCents: cardGone ? 0 : sale.prepaidCents,
    cashToReturnCents: sale.cashCents + (cardGone ? sale.prepaidCents : 0),
    sumUpToRefundCents: sale.cardCents,
    cardAttemptId: sale.cardCents > 0 ? ((await repo.successfulAttemptId(db, sale.id)) ?? null) : null
  };
}
