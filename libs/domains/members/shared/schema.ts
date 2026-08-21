import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { CLUB_FUNCTIONS } from './club-functions';

export const usersTable = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  name: text('name'),
  role: text('role', { enum: ['admin', 'ca', 'member'] }).notNull().default('member'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

/**
 * La personne : le licencié, tel qu'il traverse les saisons.
 *
 * Une ligne par **licence**, et une seule. Tout ce qui reste vrai d'une rentrée à l'autre
 * vit ici — identité, coordonnées, portrait — par opposition à `memberships`, qui porte ce
 * que la saison attribue.
 *
 * Pourquoi cette table existe : `members` (devenue `memberships`) portait une ligne par
 * (licence, saison), si bien que l'identité était recopiée à chaque adhésion et réécrite
 * par l'import Poona. Toute donnée durable devait alors se réfugier dans une table annexe
 * à clé `licence` sans clé étrangère — `member_club_functions`, puis `member_profiles` —
 * en contradiction avec la règle 2.2 de l'ADR-0004. `persons` est la cible que ces deux
 * tables contournaient.
 *
 * `licence` est la clé naturelle **externe**, au sens de la règle 2.3 de l'ADR-0004 : elle
 * est définie hors du système (fédération), et c'est elle que portent les exports Poona et
 * les classements ELO. Les FK, elles, pointent `id` comme partout ailleurs.
 */
export const personsTable = sqliteTable('persons', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  licence: text('licence').notNull(),
  lastName: text('last_name').notNull(),
  firstName: text('first_name').notNull(),
  gender: text('gender', { enum: ['M', 'F'] }).notNull(),
  birthDate: text('birth_date').notNull(),
  /*
    Coordonnées en « dernier connu », et non en instantané de la saison.

    Mesuré sur la production avant la bascule : sur 226 personnes, l'email ne diverge
    jamais d'une saison à l'autre, le téléphone et le contact parental divergent pour deux
    personnes. L'essentiel des écarts apparents était du vide comblé au fil des exports.
    Une adresse au dossier sert à joindre quelqu'un aujourd'hui — pas à savoir qui était
    joignable en 2024.
  */
  email: text('email'),
  phone: text('phone'),
  parent1Name: text('parent1_name'),
  parent1Email: text('parent1_email'),
  parent1Phone: text('parent1_phone'),
  parent2Name: text('parent2_name'),
  parent2Email: text('parent2_email'),
  parent2Phone: text('parent2_phone'),
  // Préfixe R2 du portrait, sans la taille : `member-photos/<empreinte>`. Les objets
  // déposés sont `<préfixe>/512` et `<préfixe>/128` — sans extension, le type réel étant
  // porté par les métadonnées R2 (voir `shared/photo.ts`).
  photoKey: text('photo_key'),
  photoUpdatedAt: integer('photo_updated_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
}, (table) => ({
  licenceUnq: uniqueIndex('persons_licence_idx').on(table.licence)
}));

/**
 * L'adhésion d'une personne à une saison — l'ancienne table `members`.
 *
 * Elle garde ses `id` : cinq tables les stockent durablement (`orders`, `expenses`,
 * `ledger_entries`, `checks`, `club_event_registrations`) sans jamais avoir déclaré de clé
 * étrangère, et une cotisation s'impute bien à l'adhésion d'une saison, pas à la personne.
 * Les faire changer de sens aurait rattaché des écritures comptables à quelqu'un d'autre.
 *
 * `season_id` reste un entier nu, sans FK : les saisons appartiennent au domaine
 * `accounting`, et les clés étrangères de ce dépôt sont volontairement intra-domaine.
 */
export const membershipsTable = sqliteTable('memberships', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  personId: integer('person_id').notNull().references(() => personsTable.id),
  seasonId: integer('season_id').notNull(),
  status: text('status', { enum: ['valide', 'suspendu', 'incomplet', 'en_attente'] }).notNull().default('valide'),
  // Libellé de tarif Poona (« Adulte », « Jeune »…). Saisonnier pour de bon : un jeune
  // devient adulte, et six licences changeaient déjà de type d'une saison à l'autre.
  type: text('type').notNull(),
  importedAt: integer('imported_at', { mode: 'timestamp' }).notNull(),
  amountDueCents: integer('amount_due_cents').notNull().default(0),
  amountReceivedCents: integer('amount_received_cents').notNull().default(0),
  amountRemainingCents: integer('amount_remaining_cents').notNull().default(0),
  paid: integer('paid', { mode: 'boolean' }).notNull().default(false),
  // Date de règlement issue de Poona (« Date de paiement »), ISO `YYYY-MM-DD`.
  // Sert de date d'émission à l'attestation CSE. Poona la laisse vide en pratique :
  // le repli (1er septembre de la saison) est le cas courant, pas l'exception.
  paymentDate: text('payment_date'),
  // Autorise l'adhérent à saisir des notes de frais (défaut : non). Piloté depuis l'admin.
  // Saisonnier par nature : le droit se redonne à chaque réinscription.
  expenseAuthorized: integer('expense_authorized', { mode: 'boolean' }).notNull().default(false)
}, (table) => ({
  personSeasonUnq: uniqueIndex('memberships_person_season_idx').on(table.personId, table.seasonId),
}));

// Fonction au club (bureau, CA, entraîneur) attribuée à un adhérent pour une saison.
//
// Table annexe et non colonne de `members` : l'import Poona écrase les lignes adhérents
// en `onConflictDoUpdate` à chaque ré-import, une colonne y serait perdue. La personne
// est désignée par sa **licence** (clé naturelle stable d'une saison à l'autre, même
// convention que `team_staff`) et sans FK : une fonction survit à un ré-import qui
// recréerait la ligne adhérent. La saison reste `season_id` — on ne quitte pas le
// domaine members, inutile de recopier le code saison comme le fait le domaine teams.
export const memberClubFunctionsTable = sqliteTable('member_club_functions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  seasonId: integer('season_id').notNull(),
  licence: text('licence').notNull(),
  function: text('function', { enum: CLUB_FUNCTIONS }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
}, (table) => ({
  // Pas de cumul : un adhérent ne porte qu'une fonction par saison (le président ne
  // peut pas être aussi trésorier).
  seasonLicenceUnq: uniqueIndex('member_club_functions_season_licence_idx')
    .on(table.seasonId, table.licence),
  // Filet en base pour les fonctions à titulaire unique (statuts du club) : le handler
  // porte la règle avec un message français, l'index la garantit contre les écritures
  // concurrentes ou hors application. Les autres fonctions (vice-président, membre du
  // CA, entraîneur) acceptent plusieurs titulaires.
  singleHolderUnq: uniqueIndex('member_club_functions_single_holder_idx')
    .on(table.seasonId, table.function)
    .where(sql`"function" IN ('president', 'secretary', 'treasurer', 'treasurer_deputy')`)
}));

// Configuration (singleton, id = 1) du modèle d'attestation CSE : identité du
// signataire et signature. La signature est stockée en base64 (TEXT) car le
// worker n'a pas `nodejs_compat` (pas de Buffer) et `pdf-lib` accepte le base64
// directement. Cap applicatif à l'upload pour rester sous la limite D1 (100 KB/SQL).
export const attestationConfigTable = sqliteTable('attestation_config', {
  id: integer('id').primaryKey(),
  signatoryName: text('signatory_name').notNull().default('Robert THAI'),
  signatoryEmail: text('signatory_email').notNull().default('president@nozaybad.fr'),
  websiteUrl: text('website_url').notNull().default('www.nozaybad.fr'),
  signatureBase64: text('signature_base64'),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
});


