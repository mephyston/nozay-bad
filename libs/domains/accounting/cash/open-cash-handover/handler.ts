import { AppError, type Db } from '@nba/db';
import { HANDOVER_QR_PREFIX, TOKEN_TTL_MS, randomToken, sha256 } from '../../shared/cash';
import { OpenCashHandoverRepository } from './repository';

export interface OpenCashHandoverInput { collectorEmail: string; countedCents: number; gapCategoryId?: number | null }

/**
 * Le trésorier ouvre la remise d'un encaisseur : il a compté l'enveloppe, l'écran met en
 * face la somme des reçus. Tous les reçus détenus y entrent ; une seule remise en attente
 * par encaisseur. L'écart, s'il y en a un, se passera dans la catégorie choisie.
 */
export async function openCashHandover(db: Db, treasurerEmail: string, input: OpenCashHandoverInput, now = new Date()) {
  if (!treasurerEmail) throw new AppError('Trésorier inconnu.', 401);
  const repo = new OpenCashHandoverRepository();
  const collectorEmail = input.collectorEmail.trim().toLowerCase();
  if (collectorEmail === treasurerEmail.toLowerCase()) throw new AppError('On ne se remet pas des espèces à soi-même.', 400);

  const seasonId = await repo.activeSeasonId(db);
  if (!seasonId) throw new AppError('Aucune saison active.', 400);
  if (await repo.pendingHandoverOf(db, collectorEmail)) throw new AppError('Une remise est déjà en cours pour cette personne.', 409);

  const held = await repo.held(db, collectorEmail);
  if (!held?.maxId || !held.total) throw new AppError('Cette personne ne détient aucun reçu.', 400);

  const gap = input.countedCents - held.total;
  if (gap !== 0) {
    if (!input.gapCategoryId) throw new AppError("Il y a un écart : choisissez la catégorie où l'enregistrer.", 400);
    if (!(await repo.categoryExists(db, input.gapCategoryId))) throw new AppError("Catégorie d'écart inconnue.", 400);
  }

  const token = randomToken();
  const qrExpiresAt = new Date(now.getTime() + TOKEN_TTL_MS);
  const handover = await repo.insert(db, {
    seasonId,
    collectorEmail,
    treasurerEmail: treasurerEmail.toLowerCase(),
    expectedCents: held.total,
    countedCents: input.countedCents,
    gapCategoryId: gap !== 0 ? input.gapCategoryId ?? null : null,
    status: 'pending',
    tokenHash: await sha256(token),
    tokenExpiresAt: qrExpiresAt,
    createdAt: now
  }, held.maxId);

  return { id: handover.id, expectedCents: held.total, countedCents: input.countedCents, gapCents: gap, qr: HANDOVER_QR_PREFIX + token, qrExpiresAt: qrExpiresAt.toISOString() };
}
