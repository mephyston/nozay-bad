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

export const membersTable = sqliteTable('members', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  licence: text('licence').notNull(),
  seasonId: integer('season_id').notNull(),
  lastName: text('last_name').notNull(),
  firstName: text('first_name').notNull(),
  gender: text('gender', { enum: ['M', 'F'] }).notNull(),
  birthDate: text('birth_date').notNull(),
  email: text('email'),
  phone: text('phone'),
  status: text('status', { enum: ['valide', 'suspendu', 'incomplet', 'en_attente'] }).notNull().default('valide'),
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
  expenseAuthorized: integer('expense_authorized', { mode: 'boolean' }).notNull().default(false),
  parent1Name: text('parent1_name'),
  parent1Email: text('parent1_email'),
  parent1Phone: text('parent1_phone'),
  parent2Name: text('parent2_name'),
  parent2Email: text('parent2_email'),
  parent2Phone: text('parent2_phone')
}, (table) => ({
  licenceSeasonUnq: uniqueIndex('members_licence_season_idx').on(table.licence, table.seasonId),
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
