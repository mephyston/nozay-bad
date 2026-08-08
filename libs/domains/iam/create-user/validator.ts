import { Type } from '@sinclair/typebox';
import { ROLES } from '../shared/roles';

/**
 * `roles` est contraint au catalogue : la version précédente acceptait n'importe
 * quel tableau de chaînes, ce qui laissait écrire des droits inexistants — et donc
 * silencieusement sans effet — dans la base.
 *
 * Un tableau vide est valide : c'est un compte sans droit, ce qui est le défaut
 * assumé du modèle (l'appelant se voit alors attribuer `membre` par le handler).
 */
export const createUserBodySchema = Type.Object({
  email: Type.String({ minLength: 3, maxLength: 255, pattern: '^[^@\\s]+@[^@\\s]+$' }),
  name: Type.Optional(Type.String({ minLength: 1, maxLength: 120 })),
  roles: Type.Optional(Type.Array(Type.Union(ROLES.map((r) => Type.Literal(r))), { maxItems: 5 })),
  /**
   * Ancien champ, accepté et ignoré le temps qu'un client resté sur la version
   * précédente ne reçoive pas une erreur de validation sur un déploiement partiel.
   * @deprecated
   */
  permissions: Type.Optional(Type.Array(Type.String({ maxLength: 100 }), { maxItems: 100 }))
});
