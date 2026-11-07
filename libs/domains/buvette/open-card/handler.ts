import { AppError, type Db } from '@nba/db';
import { OpenCardRepository } from './repository';
import type { OpenCardOutput } from './dto';

/**
 * Ouvre la carte d'une adresse sur un nouvel appareil, en la créant au besoin.
 *
 * La vérification de l'adresse par code a lieu dans le Worker de l'app buvette, seul à appeler
 * cette route : c'est ce qui garantit qu'aucune carte n'a de solde sans adresse vérifiée.
 */
export async function openCard(db: Db, rawEmail: string): Promise<OpenCardOutput> {
  const repo = new OpenCardRepository();
  const email = rawEmail.trim().toLowerCase();
  const created = await repo.createCard(db, email);
  const card = created ?? (await repo.findByEmail(db, email));
  if (!card) throw new AppError("La carte n'a pas pu être créée.", 500);
  const device = await repo.addDevice(db, card.id, crypto.randomUUID());
  return { cardId: card.id, deviceId: device.id, created: Boolean(created) };
}
