export type ParseOFXInput = void;

export type ParseOFXOutput = { transactions: { fitid: string; amount: number; date: string; name: string; memo: string | null; accountId: 'current' | 'savings' }[] };
