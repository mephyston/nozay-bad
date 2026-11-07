import { AppError, type Db } from '@nba/db';
import { getPaymentMethodById } from '@nba/accounting-api';
import { getSettings } from '../shared/queries.repository';
import { ManageSettingsRepository } from './repository';
import type { SaveSettingsInput } from './dto';

export const readSettings = (db: Db) => getSettings(db);

/** Espèces et carte doivent tomber sur deux comptes distincts : la clôture vire de l'un à l'autre. */
export async function saveSettings(db: Db, input: SaveSettingsInput) {
  const [cash, prepaid] = await Promise.all([
    getPaymentMethodById(db, input.cashPaymentMethodId),
    getPaymentMethodById(db, input.prepaidPaymentMethodId)
  ]);
  if (!cash || !prepaid) throw new AppError('Moyen de paiement introuvable.', 404);
  if (cash.defaultAccountId === prepaid.defaultAccountId) {
    throw new AppError('La caisse et le compte de dette doivent être deux comptes différents.', 400);
  }
  return new ManageSettingsRepository().save(db, input);
}
