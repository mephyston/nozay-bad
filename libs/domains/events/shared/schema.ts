import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

/**
 * Agenda du club.
 *
 * Remplace l'iframe Google Calendar de l'ancien site, dont le contenu était
 * entièrement invisible pour les moteurs : une compétition annoncée n'existait que
 * pour qui ouvrait la page. Ici chaque événement est du HTML indexable, avec ses
 * données structurées.
 */

export const clubEventsTable = sqliteTable(
  'club_events',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    slug: text('slug').notNull().unique(),
    title: text('title').notNull(),
    /**
     * Date et heure locales en texte ISO (« 2026-11-14T09:00 »).
     *
     * D1 n'a pas de type horodaté avec fuseau, et tout se passe à l'heure de Paris.
     * Stocker un instant UTC obligerait à reconvertir partout pour afficher « 9 h ».
     */
    startsAt: text('starts_at').notNull(),
    endsAt: text('ends_at'),
    allDay: integer('all_day', { mode: 'boolean' }).notNull().default(false),
    category: text('category', {
      enum: ['competition', 'interclubs', 'tournoi', 'stage', 'vie_du_club', 'assemblee']
    }).notNull(),
    /**
     * Lieu libre plutôt qu'une clé étrangère vers `venues` : la moitié des événements
     * se déroulent en déplacement, dans des gymnases que le club ne référence pas.
     */
    venueLabel: text('venue_label'),
    descriptionHtml: text('description_html'),
    /** Fiche FFBaD ou Badnet, quand elle existe. */
    externalUrl: text('external_url'),
    status: text('status', { enum: ['draft', 'published', 'cancelled'] })
      .notNull()
      .default('draft'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
  },
  (table) => ({
    agendaIdx: index('club_events_status_starts_idx').on(table.status, table.startsAt)
  })
);

export type ClubEventRow = typeof clubEventsTable.$inferSelect;

export const EVENT_CATEGORY_LABELS: Record<ClubEventRow['category'], string> = {
  competition: 'Compétition',
  interclubs: 'Interclubs',
  tournoi: 'Tournoi',
  stage: 'Stage',
  vie_du_club: 'Vie du club',
  assemblee: 'Assemblée'
};
