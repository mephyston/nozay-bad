import { drizzle, type DrizzleD1Database } from 'drizzle-orm/d1';

export type Db = DrizzleD1Database;
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
export type DbOrTx = Db | Tx;

export const createDb = (d1: D1Database): Db => drizzle(d1);
