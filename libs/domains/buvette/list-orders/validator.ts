import { Type } from '@sinclair/typebox';

export const listOrdersQuerySchema = Type.Object({ search: Type.Optional(Type.String({ maxLength: 120 })) });
export const orderIdParamSchema = Type.Object({ id: Type.String({ pattern: '^[0-9]+$' }) });
