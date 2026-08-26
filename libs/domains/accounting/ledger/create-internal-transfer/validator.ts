import { Type } from '@sinclair/typebox';

const AccountRef = Type.Union([Type.String(), Type.Number()]);

/**
 * Les comptes ne sont plus une union figée de trois codes.
 *
 * `'current' | 'savings' | 'cash'` était recopié dans les validators, les types d'UI et deux
 * tables de correspondance : un quatrième compte créé depuis l'écran de configuration n'aurait
 * été saisissable nulle part. La vérification d'existence revient à `resolveAccountId`, qui
 * interroge la base et refuse un code inconnu.
 */
export const createInternalTransferSchema = Type.Object({
  seasonId: Type.Union([Type.String(), Type.Number()]),
  sourceAccountId: AccountRef,
  destinationAccountId: AccountRef,
  amountCents: Type.Integer({ minimum: 1 }),
  sourceDate: Type.String({ minLength: 10 }),
  destinationDate: Type.Optional(Type.String({ minLength: 10 })),
  description: Type.String({ minLength: 1 }),
  reference: Type.Optional(Type.Union([Type.String(), Type.Null()]))
});
