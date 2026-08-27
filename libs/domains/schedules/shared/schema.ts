import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

/**
 * Créneaux d'entraînement et gymnases.
 *
 * Domaine distinct du CMS, délibérément : un créneau change quand la mairie
 * réattribue un gymnase, pas quand quelqu'un modifie une page. Ce sont des faits du
 * club, que le site se contente d'afficher — et que l'espace adhérent voudra afficher
 * à son tour. Le bloc `schedule` d'une page ne porte donc qu'une requête, jamais des
 * lignes, et le domaine `cms` n'importe rien d'ici.
 *
 * Et **hors saison** : un créneau vaut d'une année sur l'autre. La colonne
 * `season_code` a existé jusqu'à la migration `0025` ; comme rien ne la saisissait —
 * l'admin la déduisait de la date du jour, sans jamais l'afficher — elle ne datait
 * pas les créneaux, elle datait leur création. Une grille tenue sur deux étés s'y
 * retrouvait coupée en deux jeux qui ne se distinguaient par rien de visible. Ce que
 * le bureau retire d'une saison à l'autre, il le retire avec `active`.
 */

export const venuesTable = sqliteTable('venues', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  /** Identifiant stable, repris dans les URL et les imports : « pierre-dupuis ». */
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  streetAddress: text('street_address'),
  postalCode: text('postal_code'),
  city: text('city'),
  /**
   * Coordonnées en texte.
   *
   * Elles ne servent qu'au JSON-LD, qui les veut en chaîne : les stocker en réel
   * introduirait une imprécision de virgule flottante sans le moindre bénéfice, on ne
   * calcule aucune distance.
   */
  latitude: text('latitude'),
  longitude: text('longitude'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const scheduleSlotsTable = sqliteTable(
  'schedule_slots',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    venueId: integer('venue_id')
      .notNull()
      .references(() => venuesTable.id),
    /** 1 = lundi … 7 = dimanche, comme ISO-8601 et comme le JSON-LD. */
    weekday: integer('weekday').notNull(),
    /** « 18:30 », en heure locale : le club n'a jamais qu'un fuseau. */
    startTime: text('start_time').notNull(),
    endTime: text('end_time').notNull(),
    audience: text('audience', {
      enum: [
        'minibad',
        'poussins',
        'jeunes',
        'elite_jeunes',
        'adultes_loisir',
        'adultes_competition',
        'jeu_libre'
      ]
    }).notNull(),
    label: text('label'),
    coachName: text('coach_name'),
    /** Retire le créneau du site sans effacer son historique. */
    active: integer('active', { mode: 'boolean' }).notNull().default(true),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
  },
  (table) => ({
    byWeek: index('schedule_slots_weekday_idx').on(table.weekday, table.startTime),
    byAudience: index('schedule_slots_audience_idx').on(table.audience)
  })
);

export type VenueRow = typeof venuesTable.$inferSelect;
export type ScheduleSlotRow = typeof scheduleSlotsTable.$inferSelect;

/** Libellés affichables des publics, dans l'ordre où le club les présente. */
export const AUDIENCE_LABELS: Record<ScheduleSlotRow['audience'], string> = {
  minibad: 'Minibad (U9)',
  poussins: 'Poussins (U11)',
  jeunes: 'Jeunes',
  elite_jeunes: 'Élite Jeunes',
  adultes_loisir: 'Adultes loisirs',
  adultes_competition: 'Adultes compétition',
  jeu_libre: 'Jeu libre'
};

export const WEEKDAY_LABELS = ['', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

/**
 * Séances de jeu libre, ré-exportées depuis `open-play-schema.ts`.
 *
 * Le glob de drizzle-kit ne résout que ce fichier-ci : sans cette ligne, les tables du
 * jeu libre seraient absentes du modèle vu par `drizzle-kit generate`, et la prochaine
 * migration générée les recréerait — ou pire, ne les verrait pas du tout. Le contenu vit
 * à côté pour ne pas doubler la taille de ce fichier.
 */
export * from './open-play-schema';

