import { Type } from '@sinclair/typebox';

const transactionDetailsSchema = Type.Object({
  seasonId: Type.String({ minLength: 1 }),
  type: Type.Union([Type.Literal('recette'), Type.Literal('depense'), Type.Literal('transfert')]),
  accountId: Type.Union([Type.Literal('current'), Type.Literal('savings'), Type.Literal('cash')]),
  destinationAccountId: Type.Optional(Type.Union([Type.Literal('current'), Type.Literal('savings'), Type.Literal('cash')])),
  category: Type.Optional(Type.Union([Type.String(), Type.Number()])),
  amount: Type.Number(),
  date: Type.String(),
  paymentMethod: Type.Union([
    Type.Literal('virement'),
    Type.Literal('cheque'),
    Type.Literal('especes'),
    Type.Literal('labaz'),
    Type.Literal('ancv'),
    Type.Literal('pass_sport'),
    Type.Literal('ticket_loisir'),
    Type.Literal('up_loisir')
  ]),
  description: Type.String(),
  reference: Type.Optional(Type.String())
});

export const reconcileBankTransactionSchema = Type.Object({
  memberId: Type.Optional(Type.Number()),
  invoiceId: Type.Optional(Type.Number()),
  invoiceIds: Type.Optional(Type.Array(Type.Number())),
  action: Type.Union([Type.Literal('match'), Type.Literal('create')]),
  transactionId: Type.Optional(Type.Number()),
  transactions: Type.Optional(Type.Array(transactionDetailsSchema)),
  transaction: Type.Optional(transactionDetailsSchema)
});

export const reconcileBulkTransactionsSchema = Type.Object({
  requests: Type.Array(Type.Intersect([
    Type.Object({ btId: Type.Number() }),
    reconcileBankTransactionSchema
  ]))
});
