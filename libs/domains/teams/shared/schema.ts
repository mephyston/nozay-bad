import { sqliteTable, text, integer, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
import { CHAMPIONSHIPS } from './championship';
import { DISCIPLINES, RANKINGS } from './ranking';

/**
 * Équipes d'interclubs, calendrier des journées et compositions de rencontre.
 *
 * Deux conventions du dépôt structurent tout ce schéma :
 *
 * - **`seasonCode` recopié, jamais lié.** `seasons` appartient au domaine comptable et la
 *   VSA proscrit le SQL traversant les frontières de domaine — même choix que
 *   `schedule_slots.seasonCode`.
 * - **Un joueur est désigné par sa licence, jamais par `members.id`.** `members` porte une
 *   ligne par licence *et par saison* : l'identifiant change à chaque renouvellement,
 *   alors qu'une équipe doit survivre à l'été. La licence est la seule clé naturelle
 *   stable, et la session de l'espace adhérent la porte déjà.
 */

const championshipEnum = { enum: CHAMPIONSHIPS } as const;

/**
 * Classements fédéraux, historisés par date ELO.
 *
 * Une ligne par joueur **et par date de publication** : les règlements ne lisent pas le
 * classement courant mais celui d'une date arrêtée, fixe pour la saison en départemental
 * et glissante en régional. Écraser la ligne à chaque import interdirait de recalculer
 * une journée passée, et de justifier une valeur d'équipe contestée.
 *
 * Alimentée par l'export ELO Poona, qui **ne crée aucun adhérent** : le rapprochement
 * avec `members` se fait sur la licence, et un compétiteur sans adhérent correspondant est
 * signalé à l'import pour que le bureau relance l'import des adhérents.
 */
export const playerRankingsTable = sqliteTable(
  'player_rankings',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    licence: text('licence').notNull(),
    /** Date de publication du classement, en ISO. C'est la clé de l'historisation. */
    eloDate: text('elo_date').notNull(),
    seasonCode: text('season_code').notNull(),
    lastName: text('last_name').notNull(),
    firstName: text('first_name').notNull(),
    gender: text('gender', { enum: ['H', 'F'] }).notNull(),
    /** Libellé Poona brut (« Veteran 5 ») : la liste évolue, on ne la fige pas en enum. */
    category: text('category'),
    mutation: text('mutation', { enum: ['none', 'normal', 'dossier'] }).notNull().default('none'),
    /**
     * `NULL` = licencié non compétiteur (cellule vide dans l'export).
     * `'NC'` = compétiteur sans classement, qui vaut 0 point mais peut être aligné.
     * Confondre les deux ferait entrer en équipe quelqu'un qui n'y a pas sa place.
     */
    singles: text('singles', { enum: RANKINGS }),
    doubles: text('doubles', { enum: RANKINGS }),
    mixed: text('mixed', { enum: RANKINGS }),
    singlesRank: integer('singles_rank'),
    doublesRank: integer('doubles_rank'),
    mixedRank: integer('mixed_rank'),
    /** Cote CPPH : départage les paliers N1 du barème fédéral et ordonne les joueurs en ICR. */
    cpphSingles: integer('cpph_singles'),
    cpphDoubles: integer('cpph_doubles'),
    cpphMixed: integer('cpph_mixed'),
    source: text('source', { enum: ['import', 'manuel'] }).notNull().default('import'),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
  },
  (table) => ({
    licenceDateUnq: uniqueIndex('player_rankings_licence_date_idx').on(table.licence, table.eloDate),
    byDate: index('player_rankings_date_idx').on(table.eloDate)
  })
);

/** Journal des imports de classements : sert l'écran, jamais le calcul. */
export const rankingImportsTable = sqliteTable('ranking_imports', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  eloDate: text('elo_date').notNull(),
  seasonCode: text('season_code').notNull(),
  fileName: text('file_name'),
  rowsImported: integer('rows_imported').notNull().default(0),
  nonCompetitors: integer('non_competitors').notNull().default(0),
  /** Compétiteurs absents du référentiel adhérents : c'est le signal donné au bureau. */
  unmatchedMembers: integer('unmatched_members').notNull().default(0),
  importedAt: integer('imported_at', { mode: 'timestamp' }).notNull()
});

/**
 * Date de classement épinglée par championnat.
 *
 * N'existe que pour les championnats départementaux, dont le règlement fige la référence
 * pour toute la saison. Le régional la recalcule à chaque journée et n'a rien à stocker —
 * la politique elle-même vit dans `championship.ts`, parce qu'elle relève du règlement et
 * non d'un choix du club.
 */
export const championshipSettingsTable = sqliteTable(
  'championship_settings',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    seasonCode: text('season_code').notNull(),
    championship: text('championship', championshipEnum).notNull(),
    referenceEloDate: text('reference_elo_date'),
    /**
     * Lien vers le règlement de la saison, publié aux joueurs.
     *
     * Une URL et non un fichier : le document est déposé dans la médiathèque du site,
     * qui sait déjà stocker, servir et remplacer un PDF. Reconstruire un dépôt de
     * fichiers ici dupliquerait cette mécanique pour un seul document par championnat.
     */
    rulesUrl: text('rules_url'),
    /** Libellé du lien, « Règlement ICD Mixte 2026-2027 ». */
    rulesLabel: text('rules_label'),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
  },
  (table) => ({
    unq: uniqueIndex('championship_settings_idx').on(table.seasonCode, table.championship)
  })
);

/**
 * Une équipe du club, dans un championnat et une division.
 *
 * `number` **est** la hiérarchie : c'est lui que lit la règle « l'équipe n doit avoir une
 * valeur inférieure ou égale à l'équipe n−1 ». Le nom affiché en est dérivé (`NBA91-3`) et
 * n'est pas stocké : un champ libre finirait par diverger du numéro qui fait foi.
 */
export const clubTeamsTable = sqliteTable(
  'club_teams',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    seasonCode: text('season_code').notNull(),
    championship: text('championship', championshipEnum).notNull(),
    /** Code de division (« D1 », « PN »), tel que le connaît `championship.ts`. */
    division: text('division').notNull(),
    number: integer('number').notNull(),
    poolLabel: text('pool_label'),
    active: integer('active', { mode: 'boolean' }).notNull().default(true),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
  },
  (table) => ({
    unq: uniqueIndex('club_teams_season_championship_number_idx').on(
      table.seasonCode, table.championship, table.number
    )
  })
);

/** Capitaine et vice-capitaine. Le vice-capitaine est une notion interne au club. */
export const teamStaffTable = sqliteTable(
  'team_staff',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    teamId: integer('team_id').notNull().references(() => clubTeamsTable.id, { onDelete: 'cascade' }),
    licence: text('licence').notNull(),
    role: text('role', { enum: ['captain', 'vice_captain'] }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
  },
  (table) => ({
    unq: uniqueIndex('team_staff_team_role_idx').on(table.teamId, table.role)
  })
);

/**
 * Effectif déclaré. Indicatif : le règlement autorise un joueur à évoluer dans n'importe
 * quelle équipe de son club, sous réserve des règles de valeur et de titularisation.
 * L'effectif sert à présélectionner, pas à interdire.
 */
export const teamRosterTable = sqliteTable(
  'team_roster',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    teamId: integer('team_id').notNull().references(() => clubTeamsTable.id, { onDelete: 'cascade' }),
    licence: text('licence').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
  },
  (table) => ({
    unq: uniqueIndex('team_roster_team_licence_idx').on(table.teamId, table.licence)
  })
);

/**
 * Une journée de championnat.
 *
 * Une journée **est une semaine** — « les rencontres disputées du lundi au dimanche d'une
 * même semaine ». C'est cette semaine, et non une date de match, qui borne la règle
 * « un joueur ne joue que pour une seule équipe du club par journée ».
 */
export const championshipDaysTable = sqliteTable(
  'championship_days',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    seasonCode: text('season_code').notNull(),
    championship: text('championship', championshipEnum).notNull(),
    number: integer('number').notNull(),
    /**
     * `playoff` = barrages et finales : une journée que **toutes les équipes ne disputent
     * pas**, seules celles que leur classement y envoie.
     *
     * Distinguée du calendrier régulier parce qu'une équipe sans rencontre y est normale,
     * là où une journée régulière sans composition est un oubli à signaler. Les règles de
     * valeur et d'alignement s'y appliquent à l'identique.
     */
    kind: text('kind', { enum: ['regular', 'playoff'] }).notNull().default('regular'),
    /** Nom d'affichage quand « J14 » ne dit rien : « Barrages aller ». */
    label: text('label'),
    weekStart: text('week_start').notNull(),
    weekEnd: text('week_end').notNull(),
    /**
     * Jour de jeu, quand le calendrier du comité le fixe.
     *
     * Renseigné pour les **vétérans**, dont les cinq journées tombent un dimanche précis.
     * `NULL` pour le mixte et le masculin : leur calendrier ne fixe pas un jour commun à
     * tout le championnat, chaque rencontre ayant le sien. La date se porte alors sur la
     * rencontre (`team_fixtures.played_at`), et c'est au capitaine de le faire.
     */
    matchDate: text('match_date'),
    /** Force la date de classement sur cette seule journée. Rare, mais indispensable. */
    referenceEloDate: text('reference_elo_date'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
  },
  (table) => ({
    unq: uniqueIndex('championship_days_idx').on(table.seasonCode, table.championship, table.number)
  })
);

/**
 * La rencontre d'une équipe sur une journée.
 *
 * `slot` existe pour le régional seul, qui fait disputer **deux rencontres par journée**
 * (art. 1.6.3). Ailleurs il vaut toujours 1.
 */
export const teamFixturesTable = sqliteTable(
  'team_fixtures',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    teamId: integer('team_id').notNull().references(() => clubTeamsTable.id, { onDelete: 'cascade' }),
    dayId: integer('day_id').notNull().references(() => championshipDaysTable.id, { onDelete: 'cascade' }),
    slot: integer('slot').notNull().default(1),
    /** `bye` = équipe au repos : le règlement y attache ses propres restrictions. */
    status: text('status', { enum: ['scheduled', 'bye', 'forfeit'] }).notNull().default('scheduled'),
    /**
     * Date et heure réelles de la rencontre, **propres à cette équipe**.
     *
     * À distinguer soigneusement de `championship_days.week_start`, la semaine
     * **théorique** fixée par le comité :
     *
     *   * la semaine théorique est **figée** et porte toutes les règles transverses —
     *     valeur d'équipe, mouvements de joueurs, « un joueur ne tient qu'une seule
     *     équipe du club par journée » (art. 6.3.7). Un report ne la déplace jamais.
     *   * cette date-ci relève de la **logistique** : elle dit aux joueurs quand se
     *     présenter. Elle tombe normalement dans la semaine théorique, mais un gymnase
     *     indisponible ou des intempéries peuvent l'en faire sortir (art. 4.2.3).
     *
     * Les faire porter les mêmes règles reviendrait à laisser un aléa de gymnase changer
     * ce que le règlement autorise — c'est pourquoi il n'existe plus de « semaine réelle »
     * en base : rien ne doit pouvoir s'y adosser.
     */
    playedAt: text('played_at'),
    home: integer('home', { mode: 'boolean' }).notNull().default(true),
    opponent: text('opponent'),
    venue: text('venue'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
  },
  (table) => ({
    unq: uniqueIndex('team_fixtures_team_day_slot_idx').on(table.teamId, table.dayId, table.slot)
  })
);

/**
 * Une ligne composée de la rencontre.
 *
 * Les lignes vides ne sont pas insérées : leur nombre donne directement le diviseur
 * « nombre de matchs joués » qu'impose le règlement à une équipe incomplète (art. 6.3.5).
 */
export const lineupSlotsTable = sqliteTable(
  'lineup_slots',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    fixtureId: integer('fixture_id').notNull().references(() => teamFixturesTable.id, { onDelete: 'cascade' }),
    discipline: text('discipline', { enum: DISCIPLINES }).notNull(),
    position: integer('position').notNull(),
    licence1: text('licence1').notNull(),
    /** `NULL` en simple. */
    licence2: text('licence2'),
    status: text('status', { enum: ['draft', 'validated'] }).notNull().default('draft'),
    updatedByLicence: text('updated_by_licence'),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
  },
  (table) => ({
    unq: uniqueIndex('lineup_slots_fixture_discipline_position_idx').on(
      table.fixtureId, table.discipline, table.position
    )
  })
);

export type PlayerRankingRow = typeof playerRankingsTable.$inferSelect;
export type RankingImportRow = typeof rankingImportsTable.$inferSelect;
export type ChampionshipSettingsRow = typeof championshipSettingsTable.$inferSelect;
export type ClubTeamRow = typeof clubTeamsTable.$inferSelect;
export type TeamStaffRow = typeof teamStaffTable.$inferSelect;
export type TeamRosterRow = typeof teamRosterTable.$inferSelect;
export type ChampionshipDayRow = typeof championshipDaysTable.$inferSelect;
export type TeamFixtureRow = typeof teamFixturesTable.$inferSelect;
export type LineupSlotRow = typeof lineupSlotsTable.$inferSelect;
