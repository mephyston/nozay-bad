export type UpdateSeasonBalancesSeasonId = string | number;

export interface UpdateSeasonBalancesItem {
  accountId: number;
  initialBalanceCents: number;
}

export type UpdateSeasonBalancesInput = UpdateSeasonBalancesItem[];
export type UpdateSeasonBalancesOutput = { success: boolean } | void;

