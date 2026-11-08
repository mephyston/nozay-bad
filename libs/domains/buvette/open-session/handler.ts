import { AppError, type Db } from '@nba/db';
import { getClubSettings, localDate } from '@nba/club/settings';
import { getSeasonAtDate } from '@nba/accounting-api';
import { getOpenSession, getSettings } from '../shared/queries.repository';
import { OpenSessionRepository } from './repository';
import type { OpenSessionInput } from './dto';

/**
 * Ouvre le tiroir. Tout ce qui ferait échouer la clôture est refusé ici, avant qu'un bénévole
 * n'encaisse pendant des heures dans une session impossible à clôturer le soir.
 */
export async function openSession(db: Db, input: OpenSessionInput) {
  const settings = await getSettings(db);
  if (!settings?.cashPaymentMethodId || !settings.prepaidPaymentMethodId || !settings.gapCategoryId) {
    throw new AppError('Les réglages de la buvette sont incomplets : demandez à la trésorerie de les renseigner.', 400);
  }

  const { timezone } = await getClubSettings(db);
  const businessDate = localDate(new Date(), timezone);
  const season = await getSeasonAtDate(db, businessDate);
  if (!season || season.closedAt) {
    throw new AppError("Aucun exercice comptable ouvert à cette date : la trésorerie doit l'ouvrir.", 400);
  }

  if (await getOpenSession(db)) throw new AppError('Une session de caisse est déjà ouverte.', 409);
  try {
    return await new OpenSessionRepository().create(db, { ...input, businessDate });
  } catch (error) {
    // L'index partiel a départagé deux ouvertures simultanées.
    if (/UNIQUE/i.test(String(error))) throw new AppError('Une session de caisse est déjà ouverte.', 409);
    throw error;
  }
}

/** Corrige la catégorie de la session ouverte, avant que la clôture ne passe ses écritures. */
export async function setSessionCategory(db: Db, accountingCategoryId: number) {
  const session = await getOpenSession(db);
  if (!session) throw new AppError('Aucune session de caisse ouverte.', 409);
  const updated = await new OpenSessionRepository().setCategory(db, session.id, accountingCategoryId);
  if (!updated) throw new AppError('La session vient d\'être clôturée.', 409);
  return updated;
}
