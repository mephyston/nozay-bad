import { AppError, type Db } from '@nba/db';
import { closedPaperMessage, hashPaperCode, newPaperCode, paperLabel, readPaperCode } from '../shared/paper-card';
import { getActiveDevice, getCard, getSettings } from '../shared/queries.repository';
import { PaperCardsRepository } from './repository';
import type { GeneratedPaperCard, PaperCardView } from './dto';

const repo = new PaperCardsRepository();

/** Un lot à imprimer. Sans valeur tant qu'une carte n'est pas vendue à la caisse. */
export async function generatePaperCards(db: Db, faceValueCents: number, quantity: number): Promise<GeneratedPaperCard[]> {
  const codes = Array.from({ length: quantity }, () => newPaperCode());
  const hashes = await Promise.all(codes.map(hashPaperCode));
  const results: any[] = await db.batch(hashes.map((hash) => repo.buildCreateStatement(db, hash, faceValueCents)) as any);
  return results.map((rows, i) => ({ id: rows[0].id, code: codes[i], faceValueCents }));
}

async function findCard(db: Db, rawCode: string) {
  const code = readPaperCode(rawCode);
  const card = code ? await repo.findByHash(db, await hashPaperCode(code)) : undefined;
  if (!card) throw new AppError('Carte papier introuvable.', 404);
  return card;
}

/** Détenir le code vaut droit de lecture : c'est la carte qu'on a dans la main. */
export async function lookupPaperCard(db: Db, rawCode: string): Promise<PaperCardView> {
  const card = await findCard(db, rawCode);
  return {
    id: card.id,
    label: paperLabel(card.id),
    faceValueCents: card.faceValueCents ?? 0,
    balanceCents: card.balanceCents,
    status: card.paperStatus ?? 'new',
    closedReason: card.paperClosedReason
  };
}

/**
 * Transfère le solde d'une carte papier sur le compte du client, puis la ferme pour toujours.
 * Elle ne peut donc plus être dépensée ni remboursée : son argent n'existe qu'à un seul endroit.
 */
export async function attachPaperCard(db: Db, cardId: number, deviceId: string, rawCode: string): Promise<{ amountCents: number }> {
  if (!(await getActiveDevice(db, cardId, deviceId))) throw new AppError('Cet appareil a été déconnecté de la carte.', 401);
  const paper = await findCard(db, rawCode);
  if (paper.paperStatus === 'closed') throw new AppError(closedPaperMessage(paper.paperClosedReason), 409);
  if (paper.paperStatus !== 'active') throw new AppError("Cette carte papier n'a pas encore été vendue à la buvette.", 409);
  if (paper.reservedCents > 0) throw new AppError('Une vente est en cours sur cette carte : réessayez après.', 409);
  if (paper.balanceCents <= 0) throw new AppError('Cette carte papier est vide : il n\'y a rien à transférer.', 409);

  const target = await getCard(db, cardId);
  const settings = await getSettings(db);
  const max = settings?.maxBalanceCents ?? 0;
  if ((target?.balanceCents ?? 0) + paper.balanceCents > max) {
    throw new AppError(`Ce transfert dépasserait le plafond de votre carte (${max / 100} €).`, 400);
  }

  const amountCents = paper.balanceCents;
  const statements: any[] = [
    repo.buildCloseStatement(db, paper.id, amountCents),
    repo.buildMovementStatement(db, `transfer-out-${paper.id}`, paper.id, -amountCents),
    repo.buildMovementStatement(db, `transfer-in-${paper.id}`, cardId, amountCents),
    repo.buildCreditStatement(db, cardId, amountCents)
  ];
  try {
    await db.batch(statements as any);
  } catch (error) {
    if (/UNIQUE/i.test(String(error))) throw new AppError(closedPaperMessage('merged'), 409);
    if (/CHECK/i.test(String(error))) throw new AppError('Cette carte papier vient de servir à la buvette : rouvrez-la pour voir son solde.', 409);
    throw error;
  }
  return { amountCents };
}
