import { Type } from '@sinclair/typebox';
import { ALL_PERMISSIONS } from '../shared/permissions';

/**
 * La liste est contrainte au catalogue : une permission inventée serait rangée en
 * base sans effet, et donnerait l'illusion d'un droit accordé.
 *
 * Une liste vide est valide — c'est un rôle sans aucun droit — mais le handler
 * réimpose le socle commun.
 */
export const updateRolePermissionsBodySchema = Type.Object({
  permissions: Type.Array(Type.Union(ALL_PERMISSIONS.map((p) => Type.Literal(p))), {
    maxItems: ALL_PERMISSIONS.length
  })
});
