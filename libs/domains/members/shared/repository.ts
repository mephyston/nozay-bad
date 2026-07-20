export interface ImportMembersRepositoryInterface {
  insertSeasons(db: any, seasons: { id: string; name: string; active: boolean; createdAt: Date }[]): Promise<void>;
  getExistingLicenceSeasons(db: any, licences: string[]): Promise<Set<string>>;
  batchUpsertMembers(db: any, members: any[]): Promise<void>;
}

export interface ListMembersRepositoryInterface {
  count(db: any, conditions: any[]): Promise<number>;
  list(db: any, conditions: any[], pagination: { limit: number; offset: number }): Promise<any[]>;
}

export interface GetMemberRepositoryInterface {
  getByLicence(db: any, licence: string, season?: string): Promise<any | undefined>;
}

export interface MemberCseDataRepositoryInterface {
  getById(db: any, id: number): Promise<any | undefined>;
  getLastPaymentTransaction(db: any, memberId: number): Promise<{ paymentMethod: string; date: string } | undefined>;
}

export interface ApplyPaymentRepositoryInterface {
  getById(db: any, id: number): Promise<any | undefined>;
  updatePayment(db: any, id: number, values: { amountReceived: number; amountRemaining: number; paid: boolean }): Promise<void>;
}
