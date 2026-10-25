import { Type } from '@sinclair/typebox';
import { PIECES_MAX } from '../shared/justificatif';

export const updateExpenseSchema = Type.Object({
  seasonId: Type.Optional(Type.String({ minLength: 1 })),
  description: Type.Optional(Type.String({ minLength: 1 })),
  category: Type.Optional(Type.Union([Type.String(), Type.Integer()])),
  amount: Type.Optional(Type.Integer({ minimum: 1 })),
  // La liste entière des pièces voulues, dans l'ordre : une pièce gardée par son
  // identifiant, une nouvelle par son contenu. Absente, les pièces ne changent pas.
  attachments: Type.Optional(Type.Array(
    Type.Union([
      Type.Object({ id: Type.Integer({ minimum: 1 }) }, { additionalProperties: false }),
      Type.Object({ dataUrl: Type.String({ minLength: 1 }) }, { additionalProperties: false })
    ]),
    { minItems: 1, maxItems: PIECES_MAX }
  )),
  // L'ancien justificatif unique : il remplace toutes les pièces (application installée
  // restée sur l'ancien écran).
  photoUrl: Type.Optional(Type.String({ minLength: 1 })),
  emitterName: Type.Optional(Type.String({ minLength: 1 })),
  memberId: Type.Optional(Type.Union([Type.Integer(), Type.Null()])),
});
