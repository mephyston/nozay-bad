export type UpdateSeasonBalancesSeasonId = string;
export interface UpdateSeasonBalancesInput { balances: { accountId: 'current' | 'savings' | 'cash'; initialBalance: number }[] }
export type UpdateSeasonBalancesOutput = { success: boolean };
