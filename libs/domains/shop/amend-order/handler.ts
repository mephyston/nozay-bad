import { type Db } from '@nba/db';
import { updateOrder } from '../update-order/handler';
import type { AmendOrderInput, AmendOrderOutput } from './dto';

/**
 * L'adhérent modifie sa commande depuis son espace : une autre taille, une autre
 * quantité, un autre moyen de paiement.
 *
 * **Tant que le bureau ne l'a pas validée.** Validée, elle a réservé du stock et
 * l'adhérent a été prévenu du montant à régler : la changer seul reviendrait à
 * déplacer une réservation dans le dos du bureau. Les règles sont celles de la
 * correction par le bureau (stock, article décliné, moyen de paiement proposé), dont
 * on reprend le code ; seul le propriétaire ne change jamais.
 */
export async function amendOrder(db: Db, id: number, body: AmendOrderInput): Promise<AmendOrderOutput> {
  return updateOrder(db, id, body, { ownerMemberId: body.memberId, statuses: ['created'], storefront: true });
}
