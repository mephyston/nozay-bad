import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { venuesTable, scheduleSlotsTable } from './schema';

/**
 * Séances individuelles (« indiv ») : les soirées que l'entraîneur ouvre aux
 * compétiteurs, et les candidatures qu'il départage.
 *
 * Au début de l'entraînement compétiteurs du mardi et du jeudi, l'entraîneur prend deux
 * fois trente minutes pour travailler avec une ou deux personnes. Jusqu'ici les demandes
 * arrivaient sur WhatsApp et le choix se faisait de mémoire : qui a déjà eu sa séance,
 * qui est jeune. Ces deux tables donnent à ce choix ce qui lui manquait — une trace.
 *
 * Fichier séparé de `schema.ts` et **ré-exporté** par lui, pour la même raison que le jeu
 * libre : le glob de drizzle-kit ne descend qu'au `shared/schema.ts` de chaque domaine.
 */

/**
 * Une soirée d'indiv : une date, une heure de début, et des créneaux dérivés.
 *
 * Les créneaux ne sont **pas stockés** : le k-ième va de `start_time + (k-1)·slot_minutes`
 * à `start_time + k·slot_minutes`. Deux créneaux de trente minutes est la règle du club,
 * mais la colonne la porte séance par séance, comme `min_players` en jeu libre : changer
 * l'habitude l'an prochain ne réécrit pas les soirées déjà tenues.
 *
 * Pas de `end_time` non plus — il se déduit — ni de `season_code`, la saison se lit dans
 * la date (`shared/season.ts`). Une colonne dérivée est une colonne qu'on oublie de
 * mettre à jour.
 */
export const indivSessionsTable = sqliteTable(
  'indiv_sessions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    venueId: integer('venue_id')
      .notNull()
      .references(() => venuesTable.id),
    /** Créneau récurrent d'origine, quand la soirée vient d'une génération en lot. */
    slotId: integer('slot_id').references(() => scheduleSlotsTable.id, { onDelete: 'set null' }),
    /** Date locale « 2026-03-14 », à largeur fixe pour que le tri lexicographique suffise. */
    date: text('date').notNull(),
    /** « 19:30 », validée par les helpers de `shared/slot.ts`, comme les créneaux. */
    startTime: text('start_time').notNull(),
    slotCount: integer('slot_count').notNull().default(2),
    slotMinutes: integer('slot_minutes').notNull().default(30),
    /**
     * Places par créneau. Deux dans l'immense majorité des cas ; l'entraîneur peut n'en
     * retenir qu'une, mais jamais trois — c'est le handler de sélection qui le tient.
     */
    capacityPerSlot: integer('capacity_per_slot').notNull().default(2),
    /**
     * Trois états. `announced` est le seul qui ne se déduise d'aucune autre colonne : il
     * dit que l'entraîneur a rendu sa décision publique, et il ferme les candidatures.
     * `announced_at` le date, et sert à versionner les notifications d'une ré-annonce.
     */
    status: text('status', { enum: ['open', 'announced', 'cancelled'] })
      .notNull()
      .default('open'),
    announcedAt: integer('announced_at', { mode: 'timestamp' }),
    label: text('label'),
    notes: text('notes'),
    /** Motif d'annulation, obligatoire à l'annulation : le candidat doit pouvoir le lire. */
    cancelledReason: text('cancelled_reason'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
  },
  (table) => ({
    /** Clé naturelle : c'est elle qui rend la génération en lot idempotente. */
    naturalKey: uniqueIndex('indiv_sessions_date_venue_start_idx').on(
      table.date,
      table.venueId,
      table.startTime
    ),
    byDate: index('indiv_sessions_date_idx').on(table.date, table.startTime)
  })
);

/**
 * Candidature d'un compétiteur à une soirée, et la décision de l'entraîneur dessus.
 *
 * Une seule ligne porte les deux : la demande (préférence, mot) et la réponse
 * (`selected_slot`). Une table de sélection à part aurait obligé chaque écran à joindre
 * pour savoir si un candidat est retenu, et la question « combien de fois cette saison ? »
 * se pose précisément sur ce croisement-là.
 *
 * `member_id` désigne une adhésion (`memberships.id`), sans clé étrangère — ADR-0006,
 * comme les cinq colonnes homonymes du dépôt. L'identité est **recopiée** : la liste des
 * retenus d'un soir est une trace. `member_group` recopie le libellé du type d'adhésion
 * au moment de la demande : c'est lui qui a ouvert la porte, et il doit rester lisible
 * même si l'adhérent change de groupe à la saison suivante.
 */
export const indivRequestsTable = sqliteTable(
  'indiv_requests',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    sessionId: integer('session_id')
      .notNull()
      .references(() => indivSessionsTable.id, { onDelete: 'cascade' }),
    memberId: integer('member_id').notNull(),
    /**
     * Licence, en plus de l'adhésion : c'est par elle que les statistiques d'équité
     * traversent les saisons — une adhésion ne vit qu'un an, une licence suit la personne.
     */
    licence: text('licence').notNull(),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    email: text('email').notNull(),
    memberGroup: text('member_group').notNull(),
    /** Créneau souhaité (1-based), ou `null` : « indifférent ». Un souhait, pas une exigence. */
    preferredSlot: integer('preferred_slot'),
    /** Un mot pour l'entraîneur : « travailler le service ». Facultatif, court. */
    note: text('note'),
    /** Décision de l'entraîneur : le créneau attribué, ou `null` tant qu'il n'a pas retenu. */
    selectedSlot: integer('selected_slot'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
  },
  (table) => ({
    /** Une candidature par adhérent et par soirée : recandidater met à jour, ne double pas. */
    memberIdx: uniqueIndex('indiv_requests_session_member_idx').on(table.sessionId, table.memberId),
    /** Les statistiques d'équité lisent par licence, sur toute une saison. */
    byLicence: index('indiv_requests_licence_idx').on(table.licence)
  })
);

export type IndivSessionRow = typeof indivSessionsTable.$inferSelect;
export type IndivRequestRow = typeof indivRequestsTable.$inferSelect;

export const INDIV_STATUSES = ['open', 'announced', 'cancelled'] as const;
export type IndivStatus = (typeof INDIV_STATUSES)[number];

export const INDIV_STATUS_LABELS: Record<IndivStatus, string> = {
  open: 'Candidatures ouvertes',
  announced: 'Annoncée',
  cancelled: 'Annulée'
};
