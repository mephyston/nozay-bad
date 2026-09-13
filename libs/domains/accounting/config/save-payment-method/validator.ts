import { Type } from '@sinclair/typebox';
import { PAYMENT_METHOD_KINDS } from '../../shared/schema';

const Kind = Type.Union(PAYMENT_METHOD_KINDS.filter((k) => k !== 'internal').map((k) => Type.Literal(k)));
const Status = Type.Union([Type.Literal('cleared'), Type.Literal('in_vault'), Type.Literal('pending_debit')]);

export const createPaymentMethodSchema = Type.Object({
  code: Type.String({ minLength: 2, maxLength: 32, pattern: '^[a-z][a-z0-9_]*$' }),
  label: Type.String({ minLength: 1, maxLength: 120 }),
  kind: Kind,
  defaultAccountCode: Type.String({ minLength: 1, maxLength: 32 }),
  defaultEntryStatus: Status,
  storefront: Type.Optional(Type.Boolean())
});

export const updatePaymentMethodSchema = Type.Object({
  label: Type.Optional(Type.String({ minLength: 1, maxLength: 120 })),
  kind: Type.Optional(Kind),
  defaultAccountCode: Type.Optional(Type.String({ minLength: 1, maxLength: 32 })),
  defaultEntryStatus: Type.Optional(Status),
  active: Type.Optional(Type.Boolean()),
  storefront: Type.Optional(Type.Boolean())
});
