import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

/**
 * Annonces du club, rédigées depuis l'administration et lues dans l'espace adhérent.
 *
 * Cette table porte le **contenu**, pas sa diffusion : la notification push reste un
 * accessoire optionnel, géré par le domaine notifications. Une annonce reste lisible
 * indéfiniment même si personne n'a activé les notifications.
 */
export const announcementsTable = sqliteTable(
  'announcements',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    title: text('title').notNull(),
    /**
     * HTML volontairement restreint (gras, italique, souligné, lien, listes), assaini
     * avant écriture par `sanitizeRichText`. C'est l'API qui fait autorité : le contenu
     * arrive d'un éditeur du navigateur, donc d'une source non digne de foi.
     */
    bodyHtml: text('body_html').notNull(),
    status: text('status', { enum: ['draft', 'published'] })
      .notNull()
      .default('draft'),
    /**
     * Date de publication, et non de création : un brouillon rédigé la semaine dernière
     * puis publié aujourd'hui doit apparaître en tête. Nulle tant que l'annonce est un
     * brouillon.
     */
    publishedAt: integer('published_at', { mode: 'timestamp' }),
    /**
     * Horodatage de la diffusion push. Non nul = déjà notifié : on ne renotifie jamais,
     * quelles que soient les modifications ultérieures. C'est ce qui rend l'action de
     * diffusion rejouable sans risque depuis l'écran d'administration.
     */
    notifiedAt: integer('notified_at', { mode: 'timestamp' }),
    /** Adresse du compte d'administration rédacteur, à titre d'information. */
    authorEmail: text('author_email').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
  },
  (table) => ({
    // Le seul accès chaud : « les N dernières publiées », sur l'accueil de l'espace adhérent.
    publishedIdx: index('announcements_status_published_at_idx').on(table.status, table.publishedAt)
  })
);

export type AnnouncementRow = typeof announcementsTable.$inferSelect;
