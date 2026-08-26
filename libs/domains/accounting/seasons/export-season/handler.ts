import { type Db } from '@nba/db';
import { zipSync, strToU8 } from 'fflate';
import { generateInvoicePdf } from '../../invoices/shared/generate-invoice-pdf';
import { listInvoices } from '../../invoices/list-invoices/handler';
import { getInvoice } from '../../invoices/get-invoice/handler';
import { listExpenses } from '@nba/expenses-api';
import { listLedgerEntries } from '../../ledger/list-ledger-entries/handler';
import { accountLabels } from '../../ledger/list-ledger-entries/ui/ledger-types';

export async function exportSeasonArchive(db: Db, season: string, type: 'all' | 'ledger' | 'expenses' | 'invoices' = 'all'): Promise<{ data: Uint8Array, filename: string, mimeType: string }> {
  const zipData: Record<string, Uint8Array> = {};
  
  // 1. Invoices
  if (type === 'all' || type === 'invoices') {
    const invoicesList = await listInvoices(db, { seasonId: season } as any);
    for (const inv of invoicesList) {
      try {
        const fullInvoice = await getInvoice(db, inv.id as any);
        const pdfBytes = await generateInvoicePdf(fullInvoice as any, (fullInvoice as any).items);
        zipData[`Facture_${fullInvoice.invoiceNumber}.pdf`] = pdfBytes;
      } catch (e) {
        zipData[`Facture_${inv.invoiceNumber}_erreur.txt`] = strToU8(`Erreur lors de la génération de la facture: ${String(e)}`);
      }
    }
  }
  
  // 2. Expenses
  if (type === 'all' || type === 'expenses') {
    const expensesList = await listExpenses(db, { season });
  let expenseIndex = 1;
  for (const exp of expensesList) {
    if (exp.photoUrl) {
      try {
        const res = await fetch(exp.photoUrl);
        if (res.ok) {
          const buffer = await res.arrayBuffer();
          const ext = exp.photoUrl.split('.').pop()?.substring(0, 4) || 'jpg';
          const validExt = ['pdf', 'jpg', 'jpeg', 'png'].includes(ext.toLowerCase()) ? ext : 'jpg';
          const safeName = exp.emitterName.replace(/[^a-zA-Z0-9]/g, '_');
          zipData[`notes-de-frais/NDF_${expenseIndex}_${safeName}.${validExt}`] = new Uint8Array(buffer);
        } else {
          zipData[`notes-de-frais/NDF_${expenseIndex}_erreur.txt`] = strToU8(`Erreur HTTP ${res.status} lors du téléchargement du justificatif: ${exp.photoUrl}`);
        }
      } catch (e) {
        zipData[`notes-de-frais/NDF_${expenseIndex}_erreur.txt`] = strToU8(`Erreur réseau lors du téléchargement du justificatif: ${exp.photoUrl}\n${String(e)}`);
      }
      }
      expenseIndex++;
    }
  }
  
  // 3. Ledger Entries (Journal Comptable)
  let csvBytes: Uint8Array | null = null;
  if (type === 'all' || type === 'ledger') {
    try {
      const ledger = await listLedgerEntries(db, { seasonId: season }, { page: 1, limit: 10000 });
      if (ledger.data && ledger.data.length > 0) {
        /*
         * Le journal porte désormais les comptes et un montant **signé**.
         *
         * Sans eux, un virement y figurait en type `transfert`, catégorie vide et montant positif :
         * impossible de savoir d'où à où l'argent était allé, ni s'il entrait ou sortait. Un
         * contrôleur aux comptes ne pouvait rien reconstituer d'un tel journal.
         */
        const keys = ['Date', 'Type', 'Compte', 'Compte destinataire', 'Description', 'Montant EUR', 'Catégorie', 'Mode de paiement', 'Référence', 'Membre'];
        let csv = keys.join(';') + '\n';

        const label = (accountId: number | string | null | undefined) =>
          accountId === null || accountId === undefined ? '' : (accountLabels[String(accountId)] ?? String(accountId));

        for (const row of ledger.data as any[]) {
          const amountCents = row.amount || 0;
          const isCredit = row.type === 'recette' || (row.type === 'transfert' && row.transferLeg === 'destination');
          const signedCents = isCredit ? amountCents : -amountCents;

          const [fromAccount, toAccount] = row.type !== 'transfert'
            ? [label(row.accountId), '']
            : row.transferLeg === 'destination'
              ? [label(row.counterpartAccountId), label(row.accountId)]
              : [label(row.accountId), label(row.counterpartAccountId)];

          const line = [
              row.date,
              row.type,
              `"${fromAccount}"`,
              `"${toAccount}"`,
              `"${(row.description || '').replace(/"/g, '""')}"`,
              (signedCents / 100).toFixed(2).replace('.', ','),
              `"${(row.category || '')}"`,
              `"${(row.paymentMethod || '')}"`,
              `"${(row.reference || '')}"`,
              `"${(row.memberName || '')}"`
          ];
          csv += line.join(';') + '\n';
        }
        
        // UTF-8 BOM pour l'ouverture Excel
        const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
        const csvContent = strToU8(csv);
        csvBytes = new Uint8Array(bom.length + csvContent.length);
        csvBytes.set(bom, 0);
        csvBytes.set(csvContent, bom.length);
        
        if (type === 'all') {
          zipData[`journal-comptable-${season}.csv`] = csvBytes;
        }
      }
    } catch (e) {
      if (type === 'all') zipData[`journal-comptable_erreur.txt`] = strToU8(`Erreur lors de la génération du journal comptable: ${String(e)}`);
    }
  }
  
  // Return early for ledger (CSV only)
  if (type === 'ledger') {
    return {
      data: csvBytes || strToU8('Aucune écriture trouvée'),
      filename: `journal-comptable-${season}.csv`,
      mimeType: 'text/csv'
    };
  }
  
  // Empty check for ZIPs
  if (Object.keys(zipData).length === 0) {
    zipData['vide.txt'] = strToU8("Aucun document trouvé pour cette saison.");
  }
  
  const zipFilePrefix = type === 'invoices' ? 'factures' : type === 'expenses' ? 'notes-de-frais' : 'export-compta';
  
  return {
    data: zipSync(zipData),
    filename: `${zipFilePrefix}-${season}.zip`,
    mimeType: 'application/zip'
  };
}
