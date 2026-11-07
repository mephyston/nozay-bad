import { Type } from '@sinclair/typebox';

export const cancelSaleParamSchema = Type.Object({ id: Type.String({ pattern: '^[0-9]+$' }) });
