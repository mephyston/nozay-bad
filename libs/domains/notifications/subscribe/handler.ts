import { type Db } from '@nba/db';
import { normalizeEmail } from '../shared/vapid';
import { SubscribeRepository } from './repository';
import type { SubscribeInput, SubscribeOutput } from './dto';

export async function subscribeToPush(
  db: Db,
  input: SubscribeInput,
  now: Date = new Date()
): Promise<SubscribeOutput> {
  const email = normalizeEmail(input.email);
  if (!email) {
    throw new Error('Compte adhérent inconnu.');
  }

  const repo = new SubscribeRepository();
  const id = await repo.upsert(db, { ...input, email }, now);
  return { id };
}
