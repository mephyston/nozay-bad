import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';

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
  parent1Name: text('parent1_name'),
  parent1Email: text('parent1_email'),
  parent1Phone: text('parent1_phone'),
  parent2Name: text('parent2_name'),
  parent2Email: text('parent2_email'),
  parent2Phone: text('parent2_phone')
}, (table) => ({
  licenceSeasonUnq: uniqueIndex('members_licence_season_idx').on(table.licence, table.seasonId),
}));
