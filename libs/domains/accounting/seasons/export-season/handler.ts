import { type Db } from '@nba/db';
import { bankDetails, clubLetterhead, getClubSettings, type ClubAssetStore } from '@nba/club/settings';
import { zipSync, strToU8, type Zippable } from 'fflate';
import { generateInvoicePdf } from '../../invoices/shared/generate-invoice-pdf';
import { listInvoices } from '../../invoices/list-invoices/handler';
import { getInvoice } from '../../invoices/get-invoice/handler';
import { listExpenses, listAttachmentContents } from '@nba/expenses-api';
import { listLedgerEntries } from '../../ledger/list-ledger-entries/handler';
import { listAccounts } from '../../config/queries';
import { accountLabelOf } from '../../shared/account-labels';

export async function exportSeasonArchive(db: Db, store: ClubAssetStore, season: string, type: 'all' | 'ledger' | 'expenses' | 'invoices' = 'all'): Promise<{ data: Uint8Array, filename: string, mimeType: string }> {
  const zipData: Record<string, Uint8Array> = {};
  
  // 1. Invoices
  if (type === 'all' || type === 'invoices') {
    const invoicesList = await listInvoices(db, { seasonId: season } as any);
    // Le papier à lettre est chargé une fois pour toutes les factures de l'archive.
    const [spec, bank] = await Promise.all([clubLetterhead(db, store), getClubSettings(db).then(bankDetails)]);
    for (const inv of invoicesList) {
      try {
        const fullInvoice = await getInvoice(db, inv.id as any);
        const pdfBytes = await generateInvoicePdf(fullInvoice as any, (fullInvoice as any).items, spec, bank);
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
      const safeName = exp.emitterName.replace(/[^a-zA-Z0-9]/g, '_');
      const pieces = exp.attachments.length > 0 ? await listAttachmentContents(db, exp.id) : [];
      // Une pièce garde le nom d'avant ; plusieurs se numérotent dans l'ordre où elles
      // ont été jointes, et restent groupées sous le numéro de la note.
      pieces.forEach((piece, k) => {
        const base = `notes-de-frais/NDF_${expenseIndex}_${safeName}${pieces.length > 1 ? `_${k + 1}` : ''}`;
        try {
          zipData[`${base}.${extensionJustificatif(piece.dataUrl)}`] = octetsDeDataUrl(piece.dataUrl);
        } catch (e) {
          zipData[`${base}_erreur.txt`] = strToU8(`Justificatif illisible : ${String(e)}`);
        }
      });
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

        // Les libellés viennent de la base, pas d'une table d'écran figée sur trois comptes.
        const accounts = await listAccounts(db);
        const label = (accountId: number | string | null | undefined) =>
          accountId === null || accountId === undefined ? '' : accountLabelOf(accounts, accountId);

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

  /*
   * Ne pas compresser ce qui l'est déjà.
   *
   * L'archive est faite de PDF et de photos de justificatifs — des formats compressés à
   * la source. Les déflater une seconde fois coûte du processeur pour quelques octets :
   * mesuré sur la production, cet export tenait 112 ms de temps CPU en moyenne et 206 au
   * pire, de loin l'opération la plus lourde de la plateforme, sur un plan gratuit qui en
   * accorde 10 par invocation. Le journal comptable, lui, est du texte : il garde sa
   * compression, et pèse peu.
   */
  const DEJA_COMPRESSE = /\.(pdf|jpe?g|png|webp|avif|gif|zip)$/i;
  const archive: Zippable = Object.fromEntries(
    Object.entries(zipData).map(([nom, octets]) => [
      nom,
      [octets, { level: DEJA_COMPRESSE.test(nom) ? 0 : 6 }] as [Uint8Array, { level: 0 | 6 }]
    ])
  );

  return {
    data: zipSync(archive),
    filename: `${zipFilePrefix}-${season}.zip`,
    mimeType: 'application/zip'
  };
}

/**
 * Les octets d'une adresse `data:` en base64. Le `fetch(data:…)` d'avant passait par la
 * pile réseau du Worker pour décoder une chaîne déjà en mémoire.
 */
function octetsDeDataUrl(adresse: string): Uint8Array {
  const binaire = atob(adresse.slice(adresse.indexOf(',') + 1));
  const octets = new Uint8Array(binaire.length);
  for (let i = 0; i < binaire.length; i++) octets[i] = binaire.charCodeAt(i);
  return octets;
}

/**
 * L'extension d'un justificatif. Il est stocké en adresse `data:` : son type se lit dans
 * l'en-tête, pas dans un nom de fichier — un PDF sortait sinon en `.jpg`.
 */
function extensionJustificatif(adresse: string): string {
  const type = /^data:([^;,]+)/.exec(adresse)?.[1];
  if (type) return ({ 'application/pdf': 'pdf', 'image/png': 'png', 'image/webp': 'webp' } as Record<string, string>)[type] ?? 'jpg';
  const ext = adresse.split('.').pop()?.substring(0, 4).toLowerCase() || 'jpg';
  return ['pdf', 'jpg', 'jpeg', 'png', 'webp'].includes(ext) ? ext : 'jpg';
}
