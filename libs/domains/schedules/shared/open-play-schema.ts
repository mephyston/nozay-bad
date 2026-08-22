import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { venuesTable, scheduleSlotsTable } from './schema';

/**
 * Séances de jeu libre : les inscriptions, les invités, et le bénévole qui ouvre.
 *
 * Remplace un Google Sheet où le club posait une colonne par jour d'ouverture et
 * laissait les adhérents remplir les cases vides. Trois choses n'y marchaient pas :
 * personne ne savait qui s'était réellement inscrit, le seuil de quatre joueurs se
 * surveillait à l'œil nu, et l'invité qu'un adhérent amène — celui, précisément, que le
 * bénévole qui ouvre la porte ne connaît pas — n'y figurait nulle part.
 *
 * Fichier séparé de `schema.ts` et **ré-exporté** par lui. Le glob de drizzle-kit ne
 * descend qu'au `shared/schema.ts` de chaque domaine, à un seul niveau : un fichier rangé
 * plus profond serait invisible, et le modèle divergerait des migrations sans que rien ne
 * le signale. Le ré-export lui donne les tables sans faire de `schema.ts` un fichier de
 * 400 lignes, et `check-schema-integrity.js` n'y voit pas de doublon — il ne regarde que
 * les fichiers *nommés* `schema.ts`.
 */

/**
 * Une séance datée, là où `schedule_slots` ne dit qu'une habitude.
 *
 * La grille hebdomadaire dit « il y a jeu libre le samedi » ; cette table dit « le
 * samedi 14 mars, de 14 h à 17 h, à Pierre-Dupuis ». C'est la distinction que le
 * tableur faisait déjà à sa façon.
 *
 * Séparée de `club_events` (domaine `events`), délibérément : un événement est un
 * rendez-vous *annoncé*, indexable, qui existe même sans inscrit. Une séance de jeu
 * libre n'existe que si assez de monde s'inscrit et qu'un bénévole vient ouvrir — c'est
 * un objet à cycle de vie, pas une fiche.
 */
export const openPlaySessionsTable = sqliteTable(
  'open_play_sessions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    /** Recopié et non lié, comme `schedule_slots.season_code` : même domaine, même convention. */
    seasonCode: text('season_code').notNull(),
    venueId: integer('venue_id')
      .notNull()
      .references(() => venuesTable.id),
    /**
     * Créneau récurrent d'origine, quand la séance vient d'une génération en lot.
     *
     * **Nullable**, parce que le cas qui motive la fonctionnalité est justement celui
     * qui n'a pas de créneau : un dimanche de vacances, un jour férié. `set null` et non
     * `cascade` — retirer un créneau de la grille hebdomadaire ne doit pas effacer les
     * séances déjà tenues sous lui, ni leurs inscrits.
     */
    slotId: integer('slot_id').references(() => scheduleSlotsTable.id, { onDelete: 'set null' }),
    /**
     * Date locale « 2026-03-14 ».
     *
     * Le club n'a qu'un fuseau, et le format à largeur fixe rend la comparaison
     * lexicographique équivalente à la comparaison chronologique — même raisonnement que
     * `club_events.starts_at`, sans l'heure qui vit dans ses propres colonnes.
     */
    date: text('date').notNull(),
    /** « 14:00 », validées par les helpers de `shared/slot.ts`, comme les créneaux. */
    startTime: text('start_time').notNull(),
    endTime: text('end_time').notNull(),
    /**
     * Seuil d'ouverture, **porté par la séance** et non par un réglage global.
     *
     * Un dimanche matin de vacances ne demande pas le même monde qu'un samedi
     * après-midi. Surtout, la colonne fige la valeur au moment où la décision a été
     * prise : changer le défaut l'an prochain ne réécrira pas l'histoire des séances
     * déjà tenues. Un réglage global aurait par ailleurs demandé une table singleton que
     * ce domaine n'a pas.
     */
    minPlayers: integer('min_players').notNull().default(4),
    /**
     * Trois états, dont un seul ne se déduise pas : `cancelled`.
     *
     * `confirmed` vaut exactement « `opener_licence` n'est pas nul » — c'est de la
     * dénormalisation assumée. On la garde parce qu'elle rend `cancelled` représentable,
     * ce qu'un booléen dérivé ne permettrait pas, et parce que l'écran du bureau filtre
     * « à pourvoir » sur une colonne plutôt que sur trois. L'invariant est tenu par les
     * seuls handlers qui écrivent l'ouvreur, et verrouillé par un test.
     *
     * « Seuil atteint » n'est **pas** un état : c'est `inscrits + invités >=
     * min_players`, recalculé à chaque lecture. Le stocker obligerait à écrire à chaque
     * inscription — et à chaque désinscription, celle qu'on oublie.
     */
    status: text('status', { enum: ['open', 'confirmed', 'cancelled'] })
      .notNull()
      .default('open'),
    /**
     * Le bénévole qui ouvre : licence, puis identité **recopiée**.
     *
     * Sans clé étrangère — le domaine est feuille, il ne peut ni importer `members` ni
     * même nommer ses tables. La licence est une clé naturelle externe au sens de la
     * règle 2.3 de l'ADR-0004, et l'ADR-0006 l'a rendue plus forte encore :
     * `persons.licence` est désormais unique *globalement*, là où celle de `members` ne
     * l'était que par saison.
     *
     * L'identité est recopiée parce qu'elle est ici une **trace** : qui a réellement
     * ouvert le gymnase en novembre. Retirer quelqu'un de la liste des ouvreurs ne doit
     * pas effacer son nom des séances qu'il a tenues. Même raison que
     * `club_event_registrations` — à ne pas confondre avec `open_play_openers`, qui est
     * une liste *courante* et ne recopie rien.
     */
    openerLicence: text('opener_licence'),
    openerFirstName: text('opener_first_name'),
    openerLastName: text('opener_last_name'),
    openedAt: integer('opened_at', { mode: 'timestamp' }),
    label: text('label'),
    /** Consigne du bureau : « badge à récupérer chez Robert », « entrée côté parking ». */
    notes: text('notes'),
    /**
     * Motif d'annulation, obligatoire à l'annulation côté handler.
     *
     * Une séance annulée reste visible de l'adhérent, barrée — contrairement aux
     * événements, que le site masque. Un inscrit qui verrait la ligne disparaître
     * n'apprendrait rien ; il doit lire pourquoi il ne joue pas.
     */
    cancelledReason: text('cancelled_reason'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
  },
  (table) => ({
    /**
     * Clé naturelle de la séance.
     *
     * C'est elle qui rend la génération en lot **idempotente** : rejouer une période
     * n'insère rien de nouveau (`on conflict do nothing`) et, surtout, ne touche pas les
     * séances déjà pourvues.
     */
    naturalKey: uniqueIndex('open_play_sessions_date_venue_start_idx').on(
      table.date,
      table.venueId,
      table.startTime
    ),
    byDate: index('open_play_sessions_date_idx').on(table.date, table.startTime)
  })
);

/**
 * Inscription d'un adhérent à une séance.
 *
 * Copie de `club_event_registrations`, à deux différences près : une colonne `licence`
 * en plus, et pas de compteur `guests` — les invités ont leur table, ils ont un nom.
 */
export const openPlayRegistrationsTable = sqliteTable(
  'open_play_registrations',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    sessionId: integer('session_id')
      .notNull()
      .references(() => openPlaySessionsTable.id, { onDelete: 'cascade' }),
    /**
     * Identifiant d'**adhésion** (`memberships.id`), sans clé étrangère.
     *
     * L'ADR-0006 le tranche pour les cinq colonnes homonymes du dépôt : une inscription
     * appartient à la saison où elle a eu lieu, et aucune de ces colonnes n'a jamais eu
     * de clé étrangère. La colonne garde le nom `member_id` par cohérence avec elles.
     */
    memberId: integer('member_id').notNull(),
    /**
     * Licence, **en plus** de ce que porte `events`.
     *
     * Deux usages : c'est par elle qu'on reconnaît l'ouvreur parmi les inscrits, et
     * c'est ce que le bénévole doit pouvoir relire à la porte du gymnase — un adhérent
     * assuré est un adhérent licencié.
     */
    licence: text('licence').notNull(),
    /**
     * Identité **recopiée**, comme pour les convives d'un événement : une liste d'appel
     * est une trace. Elle doit dire qui s'était inscrit ce soir-là, même si la personne a
     * changé de nom depuis.
     */
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    email: text('email').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
  },
  (table) => ({
    /**
     * Une inscription par adhérent et par séance.
     *
     * C'est cette contrainte qui rend l'inscription idempotente — se réinscrire met à
     * jour au lieu de doubler — et c'est aussi la clé naturelle sur laquelle les invités
     * se rattachent dans le lot, `last_insert_rowid()` ne valant que pour un seul enfant.
     */
    memberIdx: uniqueIndex('open_play_registrations_session_member_idx').on(
      table.sessionId,
      table.memberId
    )
  })
);

/**
 * Invités d'un adhérent à une séance.
 *
 * **Nommés**, contrairement au compteur `club_event_registrations.guests`. Deux raisons
 * qui n'existaient pas pour une soirée raclette : le bénévole qui ouvre le gymnase doit
 * savoir qui franchit la porte, et un invité non licencié pose une question d'assurance
 * que « 2 accompagnants » ne permet pas de traiter.
 *
 * Table enfant et non colonne JSON : le seuil se compte en SQL, et
 * `sum(json_array_length(...))` serait une expression que Drizzle ne type pas, qu'aucun
 * index ne sert, et que le dépôt n'a nulle part. Ni deux colonnes plates, qui auraient
 * fermé la porte au deuxième invité au prix d'une migration destructive.
 *
 * Pas d'unicité : la liste est **remplacée en bloc** à chaque enregistrement — c'est ce
 * remplacement qui porte l'idempotence, pas un index. Rapprocher deux lignes demanderait
 * une identité stable que deux prénoms n'ont pas.
 */
export const openPlayGuestsTable = sqliteTable(
  'open_play_guests',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    registrationId: integer('registration_id')
      .notNull()
      .references(() => openPlayRegistrationsTable.id, { onDelete: 'cascade' }),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
  },
  (table) => ({
    byRegistration: index('open_play_guests_registration_idx').on(table.registrationId)
  })
);

/**
 * Détenteurs de badge autorisés à ouvrir une séance, par saison.
 *
 * **Aucune identité recopiée ici**, à la différence de `open_play_sessions.opener_*` :
 * c'est une liste *courante*, pas une trace. Y recopier un prénom réintroduirait
 * exactement la divergence que l'ADR-0006 vient de supprimer. Le précédent exact d'une
 * liste de personnes désignées par le bureau, `member_club_functions`, ne stocke lui non
 * plus que `(saison, licence)`. Les noms sont résolus à l'affichage, par la seule page
 * qui les montre.
 *
 * Pourquoi pas une valeur de `CLUB_FUNCTIONS` : l'unique `(season_id, licence)` de
 * `member_club_functions` **interdit le cumul** — un adhérent ne porte qu'une fonction
 * par saison. Or les détenteurs de badge *sont* les gens du bureau : il faudrait choisir
 * entre « président » et « ouvreur ». Et ce n'est pas la même nature de chose — une
 * fonction se décide en assemblée générale, un badge change quand la mairie les refait.
 *
 * La liste vit ici, et non dans `members`, pour que le refus « vous n'êtes pas ouvreur »
 * soit rendu **par le handler**. Ailleurs, il remonterait dans l'application et
 * deviendrait contournable par un appel direct à l'API.
 *
 * Pas de colonne `active` : retirer un ouvreur, c'est supprimer la ligne. La liste
 * compte cinq personnes, deux façons d'être absent en vaudraient une de trop.
 */
export const openPlayOpenersTable = sqliteTable(
  'open_play_openers',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    seasonCode: text('season_code').notNull(),
    licence: text('licence').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
  },
  (table) => ({
    /** Désigner deux fois la même personne n'est pas une erreur : l'écriture est idempotente. */
    seasonLicenceUnq: uniqueIndex('open_play_openers_season_licence_idx').on(
      table.seasonCode,
      table.licence
    )
  })
);

export type OpenPlaySessionRow = typeof openPlaySessionsTable.$inferSelect;
export type OpenPlayRegistrationRow = typeof openPlayRegistrationsTable.$inferSelect;
export type OpenPlayGuestRow = typeof openPlayGuestsTable.$inferSelect;
export type OpenPlayOpenerRow = typeof openPlayOpenersTable.$inferSelect;

export const OPEN_PLAY_STATUSES = ['open', 'confirmed', 'cancelled'] as const;
export type OpenPlayStatus = (typeof OPEN_PLAY_STATUSES)[number];

export const OPEN_PLAY_STATUS_LABELS: Record<OpenPlayStatus, string> = {
  open: 'Ouverte aux inscriptions',
  confirmed: 'Confirmée',
  cancelled: 'Annulée'
};
