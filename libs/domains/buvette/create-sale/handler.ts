import { AppError, type Db } from '@nba/db';
import { verifyCardToken } from '../shared/card-tokens';
import { getActiveDevice, getCard, getOpenSession, getSettings } from '../shared/queries.repository';
import { CreateSaleRepository } from './repository';
import type { CreateSaleInput, CreateSaleOutput } from './dto';

async function cardFromScan(db: Db, secret: string, token: string) {
  const payload = await verifyCardToken(secret, 'scan', token);
  if (!payload) throw new AppError('Scan expiré : scannez de nouveau le QR code du client.', 400);
  if (!(await getActiveDevice(db, payload.c, payload.d))) throw new AppError('Cet appareil a été déconnecté de la carte.', 400);
  const card = await getCard(db, payload.c);
  if (!card) throw new AppError('Carte introuvable.', 404);
  return card;
}

/**
 * Encaisse une vente en espèces, par carte, ou par carte complétée d'espèces.
 *
 * Tout part dans un seul lot, et chaque invariant est porté par la base : le solde par un
 * CHECK, la session ouverte par un NOT NULL, le double encaissement par un UNIQUE. Si l'un
 * cède, rien n'est écrit, y compris un débit déjà exécuté dans le lot.
 */
export async function createSale(db: Db, secret: string, input: CreateSaleInput): Promise<CreateSaleOutput> {
  const repo = new CreateSaleRepository();
  const existing = await repo.findByClientId(db, input.clientId);
  if (existing) return { sale: existing, replayed: true };

  const session = await getOpenSession(db);
  if (!session) throw new AppError('Aucune session de caisse ouverte.', 409);

  const rechargeCents = input.rechargeCents ?? 0;
  if (rechargeCents > 0 && !input.rechargeScanToken) throw new AppError('Scannez la carte à recharger.', 400);
  if (rechargeCents === 0 && input.lines.length === 0) throw new AppError('Le panier est vide.', 400);

  const items = input.lines.length ? await repo.items(db, input.lines.map((l) => l.itemId)) : [];
  const lines = input.lines.map((line) => {
    const item = items.find((i) => i.id === line.itemId);
    if (!item || !item.active) throw new AppError("Un article du panier n'est plus en vente.", 400);
    return { line, item };
  });
  const itemsCents = lines.reduce((sum, { line, item }) => sum + line.quantity * item.priceCents, 0);

  const prepaidCard = input.prepaidScanToken ? await cardFromScan(db, secret, input.prepaidScanToken) : null;
  const rechargeCard = rechargeCents > 0 ? await cardFromScan(db, secret, input.rechargeScanToken!) : null;

  const prepaidCents = prepaidCard ? Math.min(prepaidCard.balanceCents, itemsCents) : 0;
  const cashCents = itemsCents + rechargeCents - prepaidCents;
  if (cashCents !== input.expectedCashCents) {
    throw new AppError('Le solde de la carte a changé : vérifiez le montant à encaisser.', 409);
  }

  if (rechargeCard) {
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
      itemsCents,
      rechargeCents,
      rechargeCardId: rechargeCard?.id ?? null,
      prepaidCents,
      prepaidCardId: prepaidCents > 0 ? prepaidCard!.id : null,
      cashCents,
      createdByEmail: by,
      createdAt: now
    }),
    ...lines.map(({ line, item }) => repo.buildLineStatement(db, input.clientId, {
      itemId: item.id,
      name: item.name,
      unitPriceCents: item.priceCents,
      quantity: line.quantity,
      accountingCategoryId: item.accountingCategoryId
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
  if (prepaidCents > 0) statements.push(...movement(prepaidCard!.id, 'debit', -prepaidCents));
  if (rechargeCard) statements.push(...movement(rechargeCard.id, 'recharge', rechargeCents));

  try {
    await db.batch(statements as any);
  } catch (error) {
    const replay = await repo.findByClientId(db, input.clientId);
    if (replay) return { sale: replay, replayed: true };
    if (/CHECK/i.test(String(error))) throw new AppError('Solde insuffisant sur la carte.', 409);
    if (/NOT NULL/i.test(String(error))) throw new AppError('La session de caisse vient d\'être clôturée.', 409);
    throw error;
  }

  const sale = await repo.findByClientId(db, input.clientId);
  return { sale: sale!, replayed: false };
}
