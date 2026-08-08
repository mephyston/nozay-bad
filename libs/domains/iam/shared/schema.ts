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

/**
 * Droits accordés par chaque rôle, modifiables depuis l'application.
 *
 * `super_admin` n'y figure pas : il vaut toujours la totalité du catalogue, calculée
 * en code. S'il était rangé ici sous forme de lignes figées, une permission ajoutée
 * par une nouvelle fonctionnalité ne lui serait pas accordée — on livrerait un écran
 * que le super administrateur ne peut pas ouvrir — et retirer par mégarde son droit
 * d'édition verrouillerait l'application sans recours.
 *
 * Les valeurs de départ viennent de `ROLE_PERMISSIONS` (migration 0013), qui reste la
 * définition d'origine : l'écran signale les rôles qui s'en écartent.
 */
export const rolePermissionsTable = sqliteTable(
  'role_permissions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    role: text('role').notNull(),
    permission: text('permission').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
  },
  (table) => ({
    rolePermissionIdx: uniqueIndex('role_permissions_role_permission_idx').on(
      table.role,
      table.permission
    ),
    roleIdx: index('role_permissions_role_idx').on(table.role)
  })
);

/**
 * Journal des modifications de droits.
 *
 * Tant que le mapping vivait en code, git donnait gratuitement l'auteur, la date et
 * la justification de chaque changement. En le rendant modifiable depuis l'écran, on
 * perd cette trace : ce journal la remplace. Il est en ajout seul.
 */
export const rolePermissionLogTable = sqliteTable(
  'role_permission_log',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    role: text('role').notNull(),
    permission: text('permission').notNull(),
    action: text('action', { enum: ['granted', 'revoked'] }).notNull(),
    /** Adresse du compte auteur de la modification. */
    actorEmail: text('actor_email').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
  },
  (table) => ({
    roleIdx: index('role_permission_log_role_idx').on(table.role),
    createdAtIdx: index('role_permission_log_created_at_idx').on(table.createdAt)
  })
);

export type AdminUserRow = typeof adminUsersTable.$inferSelect;
export type RolePermissionRow = typeof rolePermissionsTable.$inferSelect;
export type RolePermissionLogRow = typeof rolePermissionLogTable.$inferSelect;
export type AdminUserRoleRow = typeof adminUserRolesTable.$inferSelect;
