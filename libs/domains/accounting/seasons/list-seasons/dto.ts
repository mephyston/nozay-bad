import { seasonsTable } from '@nba/accounting/schema';

/** Les lignes du référentiel, plus `closed` dérivé de `closed_at` (voir le repository). */
export type ListSeasonsOutput = (typeof seasonsTable.$inferSelect & { closed: boolean })[];
