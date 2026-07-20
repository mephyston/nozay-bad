export interface InvoiceRepositoryInterface {
  getById(db: any, id: number): Promise<any | undefined>;
  getItemsByInvoiceId(db: any, invoiceId: number): Promise<any[]>;
  list(db: any, filters: { season: string }): Promise<any[]>;
  create(db: any, values: any, items: any[]): Promise<any>;
  update(db: any, id: number, values: any, items: any[]): Promise<void>;
  delete(db: any, id: number): Promise<void>;
  generateInvoiceNumber(db: any, seasonId: string): Promise<string>;
  updateStatus(db: any, id: number, status: string): Promise<void>;
}
