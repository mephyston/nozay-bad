import { AppError, type Db } from '@nba/db';
import { getPaymentMethodById } from '@nba/accounting-api';
import { cardPaymentsEnabled, getSettings } from '../shared/queries.repository';
import { ManageSettingsRepository } from './repository';
import type { SaveSettingsInput } from './dto';

export const readSettings = (db: Db) => getSettings(db);

/** Lisible de qui tient la session, sans les autres réglages du trésorier. */
export const readCardPayments = async (db: Db) => ({ cardPaymentsEnabled: await cardPaymentsEnabled(db) });

/** Espèces, carte et CB doivent tomber sur des comptes distincts : la clôture vire de l'un à l'autre. */
export async function saveSettings(db: Db, input: SaveSettingsInput) {
  const [cash, prepaid, card] = await Promise.all([
    getPaymentMethodById(db, input.cashPaymentMethodId),
    getPaymentMethodById(db, input.prepaidPaymentMethodId),
    getPaymentMethodById(db, input.cardPaymentMethodId)
  ]);
  if (!cash || !prepaid || !card) throw new AppError('Moyen de paiement introuvable.', 404);
  if (new Set([cash.defaultAccountId, prepaid.defaultAccountId, card.defaultAccountId]).size < 3) {
    throw new AppError('La caisse, le compte de dette et le compte SumUp doivent être trois comptes différents.', 400);
  }
  return new ManageSettingsRepository().save(db, input);
}

/**
 * L'interrupteur d'urgence de la CB. Coupé, plus rien ne part vers SumUp : ni paiement, ni
 * relance, ni remboursement. Ce qui est déjà en route reste vérifié par le cron.
 */
export async function setCardPayments(db: Db, enabled: boolean) {
  const saved = await new ManageSettingsRepository().setCardPayments(db, enabled);
  if (!saved) throw new AppError('Réglages de la buvette introuvables.', 404);
  return { cardPaymentsEnabled: saved.cardPaymentsEnabled };
}
