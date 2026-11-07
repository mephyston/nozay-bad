import { Type } from '@sinclair/typebox';
import { FOREIGN_TX_ID_PATTERN } from '../shared/sumup';

export const verifyAttemptSchema = Type.Object({ foreignTxId: Type.String({ pattern: FOREIGN_TX_ID_PATTERN }) });
export const saleParamSchema = Type.Object({ id: Type.String({ pattern: '^[0-9]+$' }) });
