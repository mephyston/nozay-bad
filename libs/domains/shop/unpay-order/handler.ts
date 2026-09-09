import { type Db, AppError } from '@nba/db';
import { UnpayOrderRepository } from './repository';
import { Order } from '../shared/order';
import {
  OrderNotFoundError,
  OrderInvalidOrProcessedError,
  SeasonClosedError,
  ConcurrentModificationError
} from '../shared/errors';
import { getContactEmailsForMember, isSeasonClosed } from '@nba/members-api';
import { notifyContacts } from '@nba/notifications-api';
import { UnpayOrderInput, UnpayOrderOutput } from './dto';

/**
 * Annulation d'un encaissement : la commande repasse en attente de paiement.
 *
 * Le cas d'usage est l'erreur de ligne — on a encaissé la commande du voisin. Il n'y
 * avait aucun retour possible : la recette se supprimait au grand livre, mais la
 * commande restait « payée » avec un identifiant d'écriture qui ne menait plus nulle
 * part. Ici les deux se défont d'un seul geste, dans le même batch.
 *
 * Deux verrous, ceux de la comptabilité : une recette déjà pointée sur le relevé ne
 * disparaît pas (la banque l'a vue, il faut d'abord la dissocier au rapprochement), et
 * un exercice clôturé ne bouge plus. Une recette déjà supprimée à la main n'empêche
 * rien : c'est précisément la situation qu'on répare.
 *
 * Le stock n'est pas touché : réservé à la validation, il l'est toujours, la commande
 * reste due.
 */
export async function unpayOrder(db: Db, id: UnpayOrderInput): Promise<UnpayOrderOutput> {
  const repo = new UnpayOrderRepository();

  // Phase 1 : Lecture (hors batch)
  const orderData = await repo.getOrderById(db, id);
  if (!orderData) {
    throw new OrderNotFoundError();
  }
  const order = new Order(orderData as any);

  if (!order.canBeUnpaid()) {
    throw new OrderInvalidOrProcessedError("Seule une commande payée peut voir son encaissement annulé.");
  }

  const entry = orderData.ledgerEntryId ? await repo.getLedgerEntryById(db, orderData.ledgerEntryId) : undefined;

  if (entry) {
    if (entry.bankStatementLineId !== null && entry.bankStatementLineId !== undefined) {
      throw new AppError(
        "La recette de cette commande est déjà pointée sur un relevé bancaire : dissociez-la d'abord depuis le rapprochement.",
        400
      );
    }
    if (await isSeasonClosed(db, entry.seasonId)) {
      throw new SeasonClosedError("L'exercice de la recette est clôturé : l'encaissement ne peut plus être annulé.");
    }
  } else if (await isSeasonClosed(db, order.seasonId)) {
    throw new SeasonClosedError();
  }

  // Phase 2 : Décision (en mémoire)
  const awaitingPaymentSince = orderData.awaitingPaymentSince ?? new Date().toISOString().split('T')[0];
  const statements: any[] = [];
  if (entry) statements.push(repo.buildDeleteLedgerEntryStatement(db, entry.id));
  statements.push(repo.buildUnpayOrderStatement(db, id, awaitingPaymentSince));

  // Phase 3 : Écriture (db.batch)
  const results = await db.batch(statements as any);

  // Sans ligne touchée, quelqu'un a défait l'encaissement entre-temps.
  if (!results[statements.length - 1]?.meta?.changes) {
    throw new ConcurrentModificationError();
  }

  await notifyContacts(db, await getContactEmailsForMember(db, order.memberId), {
    title: 'Encaissement annulé',
    body: "Le bureau a annulé l'enregistrement du règlement de votre commande boutique : elle est de nouveau en attente de paiement. Rapprochez-vous du bureau en cas de doute.",
    url: '/mon-compte',
    source: 'order:payment_reverted',
    category: 'order'
  });

  const updated = await repo.getOrderById(db, id);
  return updated as UnpayOrderOutput;
}
