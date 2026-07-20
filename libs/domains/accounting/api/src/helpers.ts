import { eq } from 'drizzle-orm';
import {
  transactionsTable,
  bankTransactionsTable,
  invoicesTable
} from '@metacult/features-accounting-data-access';
import {
  membersTable
} from '@metacult/features-members-data-access';
import { isSeasonClosed } from '@metacult/features-members-data-access';
import { normalizeCategory } from '@metacult/shared-db';

export function cleanName(name: string | null): string {
  if (!name) return '';
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s*\(.*?\)/g, "")
    .trim()
    .toLowerCase();
}

export function parseOFX(ofxContent: string): { transactions: { fitid: string; amount: number; date: string; name: string; memo: string | null; accountId: 'current' | 'savings' }[] } {
  // 1. Détecter le compte bancaire depuis <ACCTID>
  const acctIdMatch = ofxContent.match(/<ACCTID>([^\r\n<]+)/);
  const acctId = acctIdMatch ? acctIdMatch[1].trim() : '';
  const accountId: 'current' | 'savings' = acctId === '00070007847' ? 'savings' : 'current';

  const transactions: any[] = [];
  // 2. Extraire chaque transaction de type <STMTTRN> ... </STMTTRN> (ou jusqu'au prochain bloc ou fin de balise)
  const blocks = ofxContent.split('<STMTTRN>');
  // Le premier bloc contient les en-têtes et le début du fichier, on l'ignore
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i].split('</STMTTRN>')[0];
    
    const fitidMatch = block.match(/<FITID>([^\r\n<]+)/);
    const trnamtMatch = block.match(/<TRNAMT>([^\r\n<]+)/);
    const dtpostedMatch = block.match(/<DTPOSTED>([^\r\n<]+)/);
    const nameMatch = block.match(/<NAME>([^\r\n<]+)/);
    const memoMatch = block.match(/<MEMO>([^\r\n<]+)/);

    if (!fitidMatch || !trnamtMatch || !dtpostedMatch || !nameMatch) continue;

    const rawAmount = parseFloat(trnamtMatch[1].trim());
    const amountCents = Math.round(rawAmount * 100);

    const rawDate = dtpostedMatch[1].trim(); // Format YYYYMMDD
    const dateFormatted = `${rawDate.substring(0, 4)}-${rawDate.substring(4, 6)}-${rawDate.substring(6, 8)}`;

    transactions.push({
      fitid: fitidMatch[1].trim(),
      accountId,
      amount: amountCents,
      date: dateFormatted,
      name: nameMatch[1].trim(),
      memo: memoMatch ? memoMatch[1].trim() : null
    });
  }

  return { transactions };
}

export async function reconcileBankTxInternal(db: any, id: number, body: any): Promise<{ success: boolean, error?: string, status?: number }> {
  const bankTx = await db.select().from(bankTransactionsTable).where(eq(bankTransactionsTable.id, id)).get();
  if (!bankTx) {
    return { success: false, error: 'Écriture bancaire non trouvée.', status: 404 };
  }

  if (await isSeasonClosed(db, bankTx.seasonId)) {
    return { success: false, error: 'La saison de l\'écriture bancaire est clôturée.', status: 400 };
  }

  const memberId = body.memberId || body.transaction?.memberId;
  const invoiceId = body.invoiceId;
  const invoiceIds = body.invoiceIds;

  if (invoiceId) {
    const invoice = await db.select().from(invoicesTable).where(eq(invoicesTable.id, invoiceId)).get();
    if (!invoice) {
      return { success: false, error: 'Facture introuvable', status: 404 };
    }
    if (invoice.status === 'paid' || invoice.status === 'cancelled') {
      return { success: false, error: 'La facture a déjà été payée ou a été annulée.', status: 400 };
    }
    if (await isSeasonClosed(db, invoice.seasonId)) {
      return { success: false, error: 'La saison de la facture est clôturée.', status: 400 };
    }
  }

  if (invoiceIds && Array.isArray(invoiceIds)) {
    for (const invId of invoiceIds) {
      const invoice = await db.select().from(invoicesTable).where(eq(invoicesTable.id, invId)).get();
      if (!invoice) {
        return { success: false, error: 'Facture introuvable', status: 404 };
      }
      if (invoice.status === 'paid' || invoice.status === 'cancelled') {
        return { success: false, error: 'La facture a déjà été payée ou a été annulée.', status: 400 };
      }
      if (await isSeasonClosed(db, invoice.seasonId)) {
        return { success: false, error: 'La saison de la facture est clôturée.', status: 400 };
      }
    }
  }

  let lastTxId = null;

  if (body.action === 'match') {
    const existingTx = await db.select({ seasonId: transactionsTable.seasonId })
      .from(transactionsTable)
      .where(eq(transactionsTable.id, body.transactionId))
      .get();
    if (!existingTx) {
      return { success: false, error: 'Transaction cible introuvable.', status: 404 };
    }
    if (await isSeasonClosed(db, existingTx.seasonId)) {
      return { success: false, error: 'La saison de la transaction est clôturée. Rapprochement impossible.', status: 400 };
    }

    await db.update(transactionsTable)
      .set({ 
        bankTransactionId: id,
        memberId: memberId || undefined
      })
      .where(eq(transactionsTable.id, body.transactionId))
      .run();
    lastTxId = body.transactionId;
  } else if (body.action === 'create') {
    if (body.transactions && Array.isArray(body.transactions)) {
      for (const txItem of body.transactions) {
        if (await isSeasonClosed(db, txItem.seasonId)) {
          return { success: false, error: 'La saison cible est clôturée. Rapprochement impossible.', status: 400 };
        }
        await db.insert(transactionsTable).values({
          seasonId: txItem.seasonId,
          type: txItem.type,
          accountId: txItem.accountId,
          destinationAccountId: txItem.destinationAccountId || null,
          category: normalizeCategory(txItem.category),
          amount: Math.round(txItem.amount),
          date: txItem.date,
          paymentMethod: txItem.paymentMethod,
          description: txItem.description,
          reference: txItem.reference || null,
          memberId: memberId || null,
          invoiceId: invoiceId || null,
          bankTransactionId: id,
          createdAt: new Date()
        }).run();
      }
    } else {
      const tx = body.transaction;
      if (!tx) {
        return { success: false, error: 'Détails de la transaction manquants.', status: 400 };
      }
      if (await isSeasonClosed(db, tx.seasonId)) {
        return { success: false, error: 'La saison cible est clôturée. Rapprochement impossible.', status: 400 };
      }

      const [newTx] = await db.insert(transactionsTable).values({
        seasonId: tx.seasonId,
        type: tx.type,
        accountId: tx.accountId,
        destinationAccountId: tx.destinationAccountId || null,
        category: normalizeCategory(tx.category),
        amount: Math.round(tx.amount),
        date: tx.date,
        paymentMethod: tx.paymentMethod,
        description: tx.description,
        reference: tx.reference || null,
        memberId: memberId || null,
        invoiceId: (invoiceIds && invoiceIds.length > 0) ? invoiceIds[0] : (invoiceId || null),
        bankTransactionId: id,
        createdAt: new Date()
      }).returning();

      lastTxId = newTx.id;
    }

    if (invoiceId) {
      await db.update(invoicesTable)
        .set({ status: 'paid', bankTransactionId: id })
        .where(eq(invoicesTable.id, invoiceId))
        .run();
    }

    if (invoiceIds && Array.isArray(invoiceIds)) {
      for (const invId of invoiceIds) {
        await db.update(invoicesTable)
          .set({ status: 'paid', bankTransactionId: id })
          .where(eq(invoicesTable.id, invId))
          .run();
      }
    }
  } else {
    return { success: false, error: 'Action invalide.', status: 400 };
  }

  const linkedTxs = await db.select()
    .from(transactionsTable)
    .where(eq(transactionsTable.bankTransactionId, id))
    .all();
  const totalLinked = linkedTxs.reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0);

  if (totalLinked >= Math.abs(bankTx.amount)) {
    await db.update(bankTransactionsTable)
      .set({ status: 'reconciled' })
      .where(eq(bankTransactionsTable.id, id))
      .run();
  }

  if (memberId) {
    const isMembershipCategory = (cat: any) => {
      const norm = normalizeCategory(cat);
      return norm === 1 || cat === 'adhesions_inscriptions' || String(cat) === '1';
    };

    let amountToApply = 0;
    let hasMembershipTx = false;

    if (body.action === 'create') {
      if (body.transactions && Array.isArray(body.transactions)) {
        const membershipTxs = body.transactions.filter((t: any) => isMembershipCategory(t.category));
        if (membershipTxs.length > 0) {
          hasMembershipTx = true;
          amountToApply = membershipTxs.reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0);
        }
      } else {
        const categoryStr = body.transaction?.category;
        if (isMembershipCategory(categoryStr)) {
          hasMembershipTx = true;
          amountToApply = Math.abs(body.transaction?.amount ?? bankTx.amount);
        }
      }
    } else if (body.action === 'match') {
      const matchedTx = await db.select().from(transactionsTable).where(eq(transactionsTable.id, body.transactionId)).get();
      const categoryStr = matchedTx ? matchedTx.category : null;
      if (isMembershipCategory(categoryStr)) {
        hasMembershipTx = true;
        amountToApply = Math.abs(bankTx.amount);
      }
    }

    if (hasMembershipTx) {
      const member = await db.select().from(membersTable).where(eq(membersTable.id, memberId)).get();
      if (member) {
        const newReceived = member.amountReceived + amountToApply;
        const newRemaining = Math.max(0, member.amountDue - newReceived);
        const isPaid = newRemaining === 0;

        await db.update(membersTable)
          .set({
            amountReceived: newReceived,
            amountRemaining: newRemaining,
            paid: isPaid
          })
          .where(eq(membersTable.id, memberId))
          .run();
      }
    }
  }

  return { success: true };
}
