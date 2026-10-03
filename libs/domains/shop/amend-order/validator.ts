import { Type } from '@sinclair/typebox';

export const amendOrderParamSchema = Type.Object({
  id: Type.String({ pattern: '^[0-9]+$' })
});

/**
 * Ce que l'adhérent peut changer : l'article (une autre taille), la quantité, le moyen
 * de paiement. `memberId` n'est pas un choix : c'est le propriétaire attendu, posé par
 * l'espace adhérent depuis la session, et vérifié contre la commande.
 */
export const amendOrderBodySchema = Type.Object({
  memberId: Type.Integer({ minimum: 1 }),
  productId: Type.Integer({ minimum: 1 }),
  quantity: Type.Integer({ minimum: 1 }),
  paymentMethod: Type.String({ minLength: 1 })
});
