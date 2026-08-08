import { type Db } from '@nba/db';
import { ListAnnouncementsRepository } from './repository';
import type { ListAnnouncementsInput, ListAnnouncementsOutput } from './dto';

/** Plafond de sécurité : l'accueil n'en demande que 3, l'historique quelques dizaines. */
const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 50;

export async function listAnnouncements(
  db: Db,
  filters: ListAnnouncementsInput = {}
): Promise<ListAnnouncementsOutput> {
  const repo = new ListAnnouncementsRepository();
  return repo.list(db, {
    status: filters.status,
    limit: Math.min(filters.limit ?? DEFAULT_LIMIT, MAX_LIMIT),
    offset: filters.offset ?? 0
  });
}
