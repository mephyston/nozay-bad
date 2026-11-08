import { AppError, type Db } from '@nba/db';
import { verifyCardToken } from '../shared/card-tokens';
import { assertScannedCardUsable, availableCents, getCard, getOpenSession, getSettings } from '../shared/queries.repository';
import { newForeignTxId } from '../shared/sumup';
import { CreateSaleRepository } from './repository';
import type { BuvetteSale } from '../shared/schema';
import type { CreateSaleInput, CreateSaleOutput } from './dto';

async function cardFromScan(db: Db, secret: string, token: string) {
  const payload = await verifyCardToken(secret, 'scan', token);
  if (!payload) throw new AppError('Scan expiré : scannez de nouveau le QR code du client.', 400);
  await assertScannedCardUsable(db, payload.c, payload.d);
  const card = await getCard(db, payload.c);
  if (!card) throw new AppError('Carte introuvable.', 404);
  return card;
}

/** Un double appui ne relance rien : la tentative en cours est rendue telle quelle. */
async function replay(repo: CreateSaleRepository, db: Db, sale: BuvetteSale): Promise<CreateSaleOutput> {
  const attempt = sale.status === 'in_progress' ? await repo.pendingAttempt(db, sale.id) : undefined;
  return {
    sale,
    replayed: true,
    ...(attempt ? { attempt: { foreignTxId: attempt.foreignTxId, amountCents: attempt.amountCents } } : {})
  };
}

/**
 * Encaisse une vente en espèces, par carte, ou par carte complétée d'espèces. Si le reste part
 * en CB, la vente attend : la part carte est seulement réservée, et rien n'est crédité ni débité
 * avant que l'API de SumUp ait confirmé (voir `verify-card-attempt`).
 *
 * Tout part dans un seul lot, et chaque invariant est porté par la base : le solde par un
 * CHECK, la session ouverte par un NOT NULL, le double encaissement par un UNIQUE. Si l'un
 * cède, rien n'est écrit, y compris un débit déjà exécuté dans le lot.
 */
export async function createSale(db: Db, secret: string, input: CreateSaleInput): Promise<CreateSaleOutput> {
  const repo = new CreateSaleRepository();
  const existing = await repo.findByClientId(db, input.clientId);
  if (existing) return replay(repo, db, existing);

  const session = await getOpenSession(db);
  if (!session) throw new AppError('Aucune session de caisse ouverte.', 409);

  // Une commande apporte ses articles et sa carte : le client y a consenti depuis son téléphone,
  // même si son QR code ne se lit pas. La caisse ne peut donc pas en changer le contenu.
  const order = input.orderId ? await repo.getOrder(db, input.orderId) : undefined;
  if (input.orderId && !order) throw new AppError('Commande introuvable.', 404);
  if (order && order.status !== 'pending') throw new AppError('Cette commande a déjà été encaissée ou annulée.', 409);
  // Le même critère que la liste de la caisse : une commande d'un service passé ne s'encaisse pas.
  if (order && order.sessionId !== session.id) throw new AppError("Cette commande date d'un service précédent : le client doit la repasser.", 409);
  const saleLines = order ? await repo.orderLines(db, order.id) : input.lines;

  const rechargeCents = order ? 0 : (input.rechargeCents ?? 0);
  if (rechargeCents > 0 && !input.rechargeScanToken) throw new AppError('Scannez la carte à recharger.', 400);
  if (rechargeCents === 0 && saleLines.length === 0) throw new AppError('Le panier est vide.', 400);

  const items = saleLines.length ? await repo.items(db, saleLines.map((l) => l.itemId)) : [];
  const lines = saleLines.map((line) => {
    const item = items.find((i) => i.id === line.itemId);
    if (!item || !item.active) throw new AppError("Un article du panier n'est plus en vente.", 400);
    return { line, item };
  });
  const itemsCents = lines.reduce((sum, { line, item }) => sum + line.quantity * item.priceCents, 0);
  if (order && input.expectedOrderCents !== undefined && input.expectedOrderCents !== itemsCents) {
    throw new AppError('Le client vient de modifier sa commande : rouvrez-la.', 409);
  }

  const prepaidCard = order
    ? ((await getCard(db, order.cardId)) ?? null)
    : input.prepaidScanToken ? await cardFromScan(db, secret, input.prepaidScanToken) : null;
  const rechargeCard = rechargeCents > 0 ? await cardFromScan(db, secret, input.rechargeScanToken!) : null;

  const prepaidCents = prepaidCard ? Math.min(availableCents(prepaidCard), itemsCents) : 0;
  const restCents = itemsCents + rechargeCents - prepaidCents;
  const byCard = Boolean(input.payRestByCard) && restCents > 0;
  const cashCents = byCard ? 0 : restCents;
  const cardCents = byCard ? restCents : 0;
  if (restCents !== input.expectedCashCents) {
    throw new AppError('Le solde de la carte a changé : vérifiez le montant à encaisser.', 409);
  }

  if (prepaidCard?.kind === 'paper' && prepaidCard.paperStatus !== 'active') {
    throw new AppError("Cette carte papier n'a pas encore été vendue.", 409);
  }

  // Une carte papier se vend une fois, à sa valeur : au-delà, elle se consomme et se barre.
  if (rechargeCard?.kind === 'paper') {
    if (rechargeCard.paperStatus !== 'new') throw new AppError('Une carte papier ne se recharge pas : vendez-en une nouvelle.', 400);
    if (rechargeCents !== rechargeCard.faceValueCents) throw new AppError(`Cette carte papier se vend ${(rechargeCard.faceValueCents ?? 0) / 100} €.`, 400);
    if (await repo.hasSaleInProgressFor(db, rechargeCard.id)) throw new AppError('Cette carte papier a déjà une vente qui attend sa CB.', 409);
  } else if (rechargeCard) {
    const settings = await getSettings(db);
    const max = settings?.maxBalanceCents ?? 0;
    const after = rechargeCard.balanceCents + rechargeCents - (prepaidCard?.id === rechargeCard.id ? prepaidCents : 0);
    if (after > max) throw new AppError(`Cette recharge dépasserait le plafond de la carte (${max / 100} €).`, 400);
  }

  const by = input.createdByEmail;
  const now = new Date();
  const statements: any[] = [
    repo.buildSaleStatement(db, session.id, {
      clientId: input.clientId,
      orderId: order?.id ?? null,
      itemsCents,
      rechargeCents,
      rechargeCardId: rechargeCard?.id ?? null,
      prepaidCents,
      prepaidCardId: prepaidCents > 0 ? prepaidCard!.id : null,
      cashCents,
      cardCents,
      status: byCard ? 'in_progress' : 'paid',
      createdByEmail: by,
      createdAt: now
    }),
    ...lines.map(({ line, item }) => repo.buildLineStatement(db, input.clientId, {
      itemId: item.id,
      name: item.name,
      unitPriceCents: item.priceCents,
      quantity: line.quantity
    }))
  ];
  const movement = (cardId: number, type: 'debit' | 'recharge', amountCents: number) => [
    repo.buildBalanceStatement(db, cardId, amountCents),
    repo.buildMovementStatement(db, input.clientId, {
      clientId: `${type}-${input.clientId}`,
      cardId,
      sessionId: session.id,
      type,
      amountCents,
      createdByEmail: by,
      createdAt: now
    })
  ];
  if (order) statements.push(repo.buildCollectOrderStatement(db, order.id));
  const foreignTxId = byCard ? newForeignTxId() : null;
  if (foreignTxId) {
    if (prepaidCents > 0) statements.push(repo.buildReserveStatement(db, prepaidCard!.id, prepaidCents));
    statements.push(repo.buildAttemptStatement(db, input.clientId, foreignTxId, cardCents));
  } else {
    if (prepaidCents > 0) statements.push(...movement(prepaidCard!.id, 'debit', -prepaidCents));
    if (rechargeCard) statements.push(...movement(rechargeCard.id, 'recharge', rechargeCents));
    if (rechargeCard?.kind === 'paper') statements.push(repo.buildActivatePaperStatement(db, rechargeCard.id));
  }

  try {
    await db.batch(statements as any);
  } catch (error) {
    const raced = await repo.findByClientId(db, input.clientId);
    if (raced) return replay(repo, db, raced);
    if (order && /UNIQUE/i.test(String(error))) throw new AppError("Cette commande vient d'être encaissée par une autre caisse.", 409);
    if (/buvette_cards_paper_check/.test(String(error))) throw new AppError("Cette carte papier vient d'être vendue par une autre caisse.", 409);
    if (/CHECK/i.test(String(error))) throw new AppError('Solde insuffisant sur la carte.', 409);
    if (/NOT NULL/i.test(String(error))) {
      throw new AppError(order ? 'Cette commande vient d\'être annulée, ou la session clôturée.' : 'La session de caisse vient d\'être clôturée.', 409);
    }
    throw error;
  }

  const sale = await repo.findByClientId(db, input.clientId);
  return {
    sale: sale!,
    replayed: false,
    ...(foreignTxId ? { attempt: { foreignTxId, amountCents: cardCents } } : {})
  };
}
