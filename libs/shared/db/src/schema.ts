import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const usersTable = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  name: text('name'),
  role: text('role', { enum: ['admin', 'ca', 'member'] }).notNull().default('member'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const seasonsTable = sqliteTable('seasons', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  active: integer('active', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const membersTable = sqliteTable('members', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  licence: text('licence').notNull(),
  season: text('season').notNull().default('25-26').references(() => seasonsTable.id),
  lastName: text('last_name').notNull(),
  firstName: text('first_name').notNull(),
  gender: text('gender', { enum: ['M', 'F'] }).notNull(),
  birthDate: text('birth_date').notNull(),
  email: text('email'),
  phone: text('phone'),
  status: text('status').notNull().default('valide'),
  type: text('type').notNull(),
  importedAt: integer('imported_at', { mode: 'timestamp' }).notNull()
}, (table) => ({
  licenceSeasonUnq: uniqueIndex('members_licence_season_idx').on(table.licence, table.season),
}));

