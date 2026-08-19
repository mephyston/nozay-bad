import { type Db } from '@nba/db';
import { normalizeEmail } from '../shared/vapid';
import { UnsubscribeRepository } from './repository';
import type { UnsubscribeInput, UnsubscribeOutput } from './dto';

export async function unsubscribeFromPush(db: Db, input: UnsubscribeInput): Promise<UnsubscribeOutput> {
  const repo = new UnsubscribeRepository();
  const removed = await repo.removeByEndpoint(db, normalizeEmail(input.email), input.endpoint);
  return { removed };
}
