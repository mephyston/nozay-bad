export type GetSeasonReportsInput = string;
export type GetSeasonReportsOutput = {
  compteResultat: {
    totalRecettes: number;
    totalDepenses: number;
    netResult: number;
    categories: Record<string, { type: 'recette' | 'depense'; total: number }>;
  };
  bilanTrésorerie: {
    accountId: 'current' | 'savings' | 'cash';
    initialBalance: number;
    finalBalance: number;
  }[];
};
