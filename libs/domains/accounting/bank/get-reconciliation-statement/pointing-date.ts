import { signedEntryAmountCents, type AccountRef } from '../../shared/balances';
import type { UnrecordedBankLine } from './dto';

/**
 * Un pointage vaut à la date de la ligne de relevé, pas à celle de l'écriture.
 *
 * L'état de rapprochement borne les écritures par leur date et les lignes par la leur. Tant
 * que les deux coïncident, rien ne se voit. Mais l'encaissement d'une commande ou une écriture
 * créée au rapprochement porte souvent le jour de la saisie : le 12/10/2026, six lignes du 07
 * au 09/10 rapprochées par des écritures du 10 et du 11 faisaient 131,50 € d'écart
 * « inexpliqué » avec un arrêté au 09/10 — la ligne n'était plus « non comptabilisée », et ses
 * écritures étaient hors période.
 *
 * Le solde comptable reste borné par la date des écritures : c'est celui des livres à
 * l'arrêté. Ce sont les deux décalages qui se lisent à la date du relevé :
 *  - une écriture de la période pointée sur une ligne postérieure à l'arrêté n'est pas encore
 *    en banque : elle compte parmi les non pointées (`pointeeApresArrete`) ;
 *  - une ligne de la période rapprochée par des écritures postérieures à l'arrêté n'est pas
 *    encore dans les livres : elle compte parmi les lignes non comptabilisées
 *    (`lignesComptabiliseesApresArrete`), pour le montant de ces seules écritures.
 */

/** Les champs de la ligne pointée, joints à l'écriture par le dépôt. */
export interface PointedEntry {
  bankStatementLineId?: number | null;
  bankLineDate?: string | null;
  bankLineName?: string | null;
}

export const pointeeApresArrete = (entry: PointedEntry, asOfDate: string): boolean =>
  entry.bankStatementLineId != null && entry.bankLineDate != null && entry.bankLineDate > asOfDate;

/**
 * Les lignes de relevé de la période (`[startDate, asOfDate]`) rapprochées par des écritures
 * datées après l'arrêté, pour le montant de ces écritures sur le compte. `entries` peut en contenir d'autres :
 * seules celles d'après l'arrêté, pointées sur une ligne d'avant, sont retenues.
 */
export function lignesComptabiliseesApresArrete(
  entries: (PointedEntry & Record<string, any>)[],
  account: AccountRef,
  periode: { startDate: string; asOfDate: string }
): UnrecordedBankLine[] {
  const { startDate, asOfDate } = periode;
  const parLigne = new Map<number, UnrecordedBankLine>();
  for (const entry of entries) {
    if (entry.bankStatementLineId == null || !entry.bankLineDate) continue;
    if (entry.date <= asOfDate || entry.bankLineDate > asOfDate) continue;
    // Une ligne d'avant l'ouverture n'est pas de la période : l'à-nouveau en répond.
    if (entry.bankLineDate < startDate) continue;
    const signe = signedEntryAmountCents(entry as any, account);
    if (signe === 0) continue;

    const ligne = parLigne.get(entry.bankStatementLineId) ?? {
      id: entry.bankStatementLineId,
      date: entry.bankLineDate,
      name: entry.bankLineName ?? '',
      amountCents: 0,
      status: 'reconciled',
      bookedOn: entry.date
    };
    ligne.amountCents += signe;
    if (entry.date > ligne.bookedOn!) ligne.bookedOn = entry.date;
    parLigne.set(entry.bankStatementLineId, ligne);
  }
  return [...parLigne.values()].filter((l) => l.amountCents !== 0);
}
