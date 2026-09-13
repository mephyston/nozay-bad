import { Type } from '@sinclair/typebox';
import { ACCOUNT_KINDS } from '../../shared/schema';

const Kind = Type.Union(ACCOUNT_KINDS.filter((k) => k !== 'third_party').map((k) => Type.Literal(k)));

/** Création : le code est l'identifiant stable (URL des écrans par compte), la classe est de trésorerie. */
export const createAccountSchema = Type.Object({
  code: Type.String({ minLength: 2, maxLength: 32, pattern: '^[a-z][a-z0-9_]*$' }),
  label: Type.String({ minLength: 1, maxLength: 120 }),
  accountClassCode: Type.String({ minLength: 1, maxLength: 10 }),
  kind: Kind,
  statementAccountNumber: Type.Optional(Type.Union([Type.String({ maxLength: 40 }), Type.Null()]))
});

/** Modification : le code ne change pas — les écrans, les moyens de paiement et l'historique y renvoient. */
export const updateAccountSchema = Type.Object({
  label: Type.Optional(Type.String({ minLength: 1, maxLength: 120 })),
  accountClassCode: Type.Optional(Type.String({ minLength: 1, maxLength: 10 })),
  kind: Type.Optional(Kind),
  active: Type.Optional(Type.Boolean()),
  statementAccountNumber: Type.Optional(Type.Union([Type.String({ maxLength: 40 }), Type.Null()]))
});
