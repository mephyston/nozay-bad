import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';

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
    /**
     * État des inscriptions.
     *
     * Trois valeurs et non un booléen, parce que « fermé » et « sans objet » ne disent
     * pas la même chose au lecteur. Une compétition n'a jamais d'inscription au club
     * (`none`) ; une soirée raclette dont les inscriptions sont closes doit l'annoncer
     * (`closed`) plutôt que voir son bouton disparaître sans explication. Le bureau
     * garde sa liste dans les deux cas.
     *
     * Le défaut `none` est ce qui rend la migration muette : les événements déjà en
     * base ne proposent rien tant qu'on ne l'a pas demandé.
     */
    registration: text('registration', { enum: ['none', 'open', 'closed'] })
      .notNull()
      .default('none'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
  },
  (table) => ({
    agendaIdx: index('club_events_status_starts_idx').on(table.status, table.startsAt)
  })
);

export type ClubEventRow = typeof clubEventsTable.$inferSelect;

/**
 * Inscriptions des adhérents à un événement.
 *
 * Le club ouvre régulièrement des inscriptions — un stage, une soirée raclette, une
 * assemblée générale. Elles se prenaient jusqu'ici par SMS et de bouche à oreille, et
 * personne ne savait combien de couverts prévoir.
 *
 * Pas de capacité maximale ici, délibérément : aucun de ces rendez-vous ne se joue à
 * la place près, et une limite imposerait une course à l'inscription, une liste
 * d'attente et un repêchage pour un problème que le club n'a pas.
 */
export const clubEventRegistrationsTable = sqliteTable(
  'club_event_registrations',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    eventId: integer('event_id')
      .notNull()
      .references(() => clubEventsTable.id, { onDelete: 'cascade' }),
    /**
     * Identifiant de l'adhérent, **sans clé étrangère vers `members`**.
     *
     * `members` porte une ligne par licence *et par saison* : l'identifiant d'un même
     * adhérent change au renouvellement. Une clé étrangère ferait donc pointer une
     * inscription de novembre vers une ligne périmée dès la saison suivante. Le domaine
     * n'a par ailleurs pas à dépendre de `members` pour compter des présents.
     */
    memberId: integer('member_id').notNull(),
    /**
     * Identité **recopiée** au moment de l'inscription, sur le modèle de
     * `cms_posts.author_name` — un article survit au départ de son auteur, une liste de
     * convives survit à la bascule de saison. C'est aussi, très concrètement, la seule
     * chose que le bureau vient lire : autant qu'elle ne demande aucune jointure.
     */
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    email: text('email').notNull(),
    /** Accompagnants. 0 = vient seul ; le total des présents vaut `1 + guests`. */
    guests: integer('guests').notNull().default(0),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
  },
  (table) => ({
    /**
     * Une inscription par adhérent et par événement.
     *
     * C'est cette contrainte qui rend l'inscription idempotente : se réinscrire met à
     * jour le nombre d'accompagnants au lieu de créer une seconde ligne. Un double-clic
     * sur « Je m'inscris » ne fausse donc jamais le compte.
     */
    memberIdx: uniqueIndex('club_event_registrations_event_member_idx').on(
      table.eventId,
      table.memberId
    )
  })
);

export type ClubEventRegistrationRow = typeof clubEventRegistrationsTable.$inferSelect;

export const EVENT_REGISTRATION_STATES = ['none', 'open', 'closed'] as const;
export type EventRegistrationState = (typeof EVENT_REGISTRATION_STATES)[number];

export const EVENT_REGISTRATION_LABELS: Record<EventRegistrationState, string> = {
  none: 'Sans inscription',
  open: 'Inscriptions ouvertes',
  closed: 'Inscriptions closes'
};

export const EVENT_CATEGORY_LABELS: Record<ClubEventRow['category'], string> = {
  competition: 'Compétition',
  interclubs: 'Interclubs',
  tournoi: 'Tournoi',
  stage: 'Stage',
  vie_du_club: 'Vie du club',
  assemblee: 'Assemblée'
};
