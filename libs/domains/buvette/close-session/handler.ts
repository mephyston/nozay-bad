import { AppError, type Db } from '@nba/db';
import {
  buildCreateExpenseLedgerEntryStatement,
  buildCreateRevenueLedgerEntryStatement,
  buildInternalTransferStatements,
  getPaymentMethodById,
  getSeasonAtDate
} from '@nba/accounting-api';
import { getExpectedCashCents, getSettings } from '../shared/queries.repository';
import { summarizeSession } from '../shared/closing';
import { CloseSessionRepository } from './repository';
import type { CloseSessionInput, CloseSessionOutput } from './dto';

/**
 * Clôture la session et pose sa synthèse au grand livre, dans un seul lot.
 *
 * Une vente qui attend sa CB bloque la clôture. La recharge et le remboursement sont des virements, jamais des recettes : l'argent reste dû
 * au client tant qu'il n'est pas consommé. L'insertion de la clôture part en tête : sa clé
 * primaire fait échouer une seconde clôture, et le lot entier avec elle.
 */
export async function closeSession(db: Db, input: CloseSessionInput): Promise<CloseSessionOutput> {
  const repo = new CloseSessionRepository();
  const session = await repo.getSession(db, input.sessionId);
  if (!session) throw new AppError('Session introuvable.', 404);
  if (session.status !== 'open') throw new AppError('Cette session est déjà clôturée.', 409);

  const settings = await getSettings(db);
  if (!settings?.cashPaymentMethodId || !settings.prepaidPaymentMethodId || !settings.gapCategoryId) {
    throw new AppError('Les réglages de la buvette sont incomplets.', 400);
  }
  const [cashMethod, prepaidMethod, cardMethod] = await Promise.all([
    getPaymentMethodById(db, settings.cashPaymentMethodId),
    getPaymentMethodById(db, settings.prepaidPaymentMethodId),
    settings.cardPaymentMethodId ? getPaymentMethodById(db, settings.cardPaymentMethodId) : undefined
  ]);
  if (!cashMethod || !prepaidMethod) throw new AppError('Moyen de paiement de la buvette introuvable.', 400);

  const date = session.businessDate;
  const season = await getSeasonAtDate(db, date);
  if (!season || season.closedAt) throw new AppError('Exercice comptable clôturé à la date de cette session.', 400);

  // Relevée avant les lectures : une écriture qui s'y glisse fait échouer le lot, jamais l'inverse.
  const seen = await repo.fingerprint(db, session.id);
  if ((await repo.inProgressCount(db, session.id)) > 0) {
    throw new AppError('Une vente attend encore sa CB : vérifiez-la ou abandonnez-la avant de clôturer.', 409);
  }
  const summary = summarizeSession(await repo.paidSales(db, session.id));
  const refunds = await repo.refundsCents(db, session.id);
  const refundsCents = refunds.cashCents + refunds.cardCents;
  if ((summary.itemsCardCents > 0 || summary.rechargeCardCents > 0 || refunds.cardCents > 0) && !cardMethod) {
    throw new AppError('Le moyen de paiement de la CB n\'est pas réglé.', 400);
  }
  const expectedCashCents = await getExpectedCashCents(db, session.id, session.openingFloatCents);
  const gapCents = input.countedCashCents - expectedCashCents;
  const label = `Buvette du ${date}`;
  const reference = `BUV-${session.id}`;
  const seasonId = season.id;

  const revenue = (paymentMethodId: number, categoryId: number, amountCents: number, description: string) =>
    buildCreateRevenueLedgerEntryStatement(db, { seasonId, paymentMethodId, categoryId, amountCents, description, date, reference });

  const entries: any[] = summary.revenue.flatMap((r) => [
    ...(r.cashCents > 0 ? [revenue(cashMethod.id, r.categoryId, r.cashCents, `${label} — espèces`)] : []),
    ...(r.prepaidCents > 0 ? [revenue(prepaidMethod.id, r.categoryId, r.prepaidCents, `${label} — carte buvette`)] : []),
    ...(r.cardCents > 0 ? [revenue(cardMethod!.id, r.categoryId, r.cardCents, `${label} — CB`)] : [])
  ]);
  if (gapCents > 0) entries.push(revenue(cashMethod.id, settings.gapCategoryId, gapCents, `${label} — écart de caisse`));
  if (gapCents < 0) {
    entries.push(buildCreateExpenseLedgerEntryStatement(db, {
      seasonId,
      paymentMethodId: cashMethod.id,
      categoryId: settings.gapCategoryId,
      amountCents: -gapCents,
      description: `${label} — écart de caisse`,
      date,
      reference
    }));
  }

  const transfers = await buildInternalTransferStatements(db, seasonId, [
    ...(summary.rechargeCashCents > 0 ? [{
      sourceAccountId: prepaidMethod.defaultAccountId,
      destinationAccountId: cashMethod.defaultAccountId,
      amountCents: summary.rechargeCashCents,
      date,
      description: `${label} — recharges en espèces`,
      reference
    }] : []),
    ...(summary.rechargeCardCents > 0 ? [{
      sourceAccountId: prepaidMethod.defaultAccountId,
      destinationAccountId: cardMethod!.defaultAccountId,
      amountCents: summary.rechargeCardCents,
      date,
      description: `${label} — recharges par CB`,
      reference
    }] : []),
    ...(refunds.cashCents > 0 ? [{
      sourceAccountId: cashMethod.defaultAccountId,
      destinationAccountId: prepaidMethod.defaultAccountId,
      amountCents: refunds.cashCents,
      date,
      description: `${label} — remboursements de solde`,
      reference
    }] : []),
    // Rendus sur la CB qui avait chargé la carte : ils sortent du compte SumUp, pas de la caisse.
    ...(refunds.cardCents > 0 ? [{
      sourceAccountId: cardMethod!.defaultAccountId,
      destinationAccountId: prepaidMethod.defaultAccountId,
      amountCents: refunds.cardCents,
      date,
      description: `${label} — remboursements de solde par CB`,
      reference
    }] : [])
  ]);

  try {
    await db.batch([
      repo.buildClosureStatement(db, seen, {
        sessionId: session.id,
        expectedCashCents,
        countedCashCents: input.countedCashCents,
        gapCents,
        closedByEmail: input.closedByEmail,
        closedAt: new Date()
      }),
      repo.buildCloseStatement(db, session.id),
      ...entries,
      ...transfers
    ] as any);
  } catch (error) {
    if (/NOT NULL/i.test(String(error))) throw new AppError('Une vente vient de passer pendant la clôture : vérifiez le comptage et recommencez.', 409);
    if (/UNIQUE/i.test(String(error))) throw new AppError('Cette session vient déjà d\'être clôturée.', 409);
    throw error;
  }

  return {
    sessionId: session.id,
    expectedCashCents,
    countedCashCents: input.countedCashCents,
    gapCents,
    itemsCashCents: summary.itemsCashCents,
    itemsCardCents: summary.itemsCardCents,
    rechargeCashCents: summary.rechargeCashCents,
    rechargeCardCents: summary.rechargeCardCents,
    prepaidCents: summary.prepaidCents,
    refundsCents
  };
}
