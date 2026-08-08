import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const adminUsersTable = sqliteTable('admin_users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  /**
   * Ancienne liste de permissions à jokers, remplacée par `admin_user_roles`.
   *
   * Conservée le temps d'une release : c'est la seule copie de l'état des droits
   * d'avant la migration 0012, et les migrations D1 ne se rejouent pas à l'envers.
   * Supprimée par la migration 0013.
   *
   * @deprecated Utiliser les rôles (`adminUserRolesTable`).
   */
  permissions: text('permissions', { mode: 'json' }).$type<string[]>().notNull().default([]),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
});

/**
 * Rôles attribués à un compte d'administration.
 *
 * Seule la liaison compte↔rôle est en base : le mapping rôle→permissions vit en
 * TypeScript (`shared/roles.ts`), où il est versionné, typé et relu. Un compte peut
 * cumuler plusieurs rôles ; ses permissions sont l'union des leurs. Aucune ligne
 * signifie aucun droit — c'est le deny-by-default.
 */
export const adminUserRolesTable = sqliteTable(
  'admin_user_roles',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
      .notNull()
      .references(() => adminUsersTable.id, { onDelete: 'cascade' }),
    // Texte libre plutôt qu'enum figé : un rôle retiré du code ne doit pas rendre la
    // ligne illisible. `resolvePermissions` ignore les rôles inconnus, donc un rôle
    // périmé se traduit par une absence de droit, jamais par un droit accordé.
    role: text('role').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
  },
  (table) => ({
    userRoleIdx: uniqueIndex('admin_user_roles_user_role_idx').on(table.userId, table.role),
    roleIdx: index('admin_user_roles_role_idx').on(table.role)
  })
);

export type AdminUserRow = typeof adminUsersTable.$inferSelect;
export type AdminUserRoleRow = typeof adminUserRolesTable.$inferSelect;
