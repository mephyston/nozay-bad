import { Type } from '@sinclair/typebox';
import { ORDER_STATUSES } from '../shared/order';

export const listOrdersQuerySchema = Type.Object({
  seasonId: Type.Optional(Type.Integer({ minimum: 1 })),
  // Énuméré plutôt que libre : un statut inconnu renverrait sinon une liste vide,
  // impossible à distinguer d'une absence de commandes.
  status: Type.Optional(Type.Union(ORDER_STATUSES.map((s) => Type.Literal(s)))),
  memberId: Type.Optional(Type.String({ pattern: '^[0-9]+$' }))
});
