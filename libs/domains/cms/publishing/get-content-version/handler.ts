import { type Db } from '@nba/db';
import { getContentVersion } from '../../shared/cache-version';
import type { GetContentVersionOutput } from './dto';

export async function getContentVersionHandler(db: Db): Promise<GetContentVersionOutput> {
  return { version: await getContentVersion(db) };
}
