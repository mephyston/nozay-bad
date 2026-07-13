import { describe, it, expect } from 'vitest';
import { membersTable, seasonsTable, seasonBalancesTable, transactionsTable, bankTransactionsTable } from '../../../libs/shared/db/src/schema';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { DatabaseSync } from 'node:sqlite';
import * as fs from 'node:fs';
import * as path from 'node:path';
import app from './index';

class MockD1Database {
  private db: DatabaseSync;

  constructor() {
    this.db = new DatabaseSync(':memory:');
  }

  async exec(query: string) {
    this.db.exec(query);
    return { count: 0, duration: 0 };
  }

  prepare(query: string) {
    const stmt = this.db.prepare(query);
    return new MockD1PreparedStatement(stmt);
  }

  async batch(statements: MockD1PreparedStatement[]) {
    const results = [];
    for (const stmt of statements) {
      results.push(await stmt.all());
    }
    return results;
  }
}

class MockD1PreparedStatement {
  private stmt: any;
  private params: any[] = [];

  constructor(stmt: any) {
    this.stmt = stmt;
  }

  bind(...values: any[]) {
    const newStmt = new MockD1PreparedStatement(this.stmt);
    newStmt.params = values.map(v => {
      if (v instanceof Date) return v.getTime();
      if (typeof v === 'boolean') return v ? 1 : 0;
      return v;
    });
    return newStmt;
  }

  async all() {
    const results = this.stmt.all(...this.params);
    return { results };
  }

  async run() {
    const runResult = this.stmt.run(...this.params);
    return {
      success: true,
      meta: {
        changes: runResult.changes,
        last_row_id: runResult.lastInsertRowid,
      }
    };
  }

  async first(colName?: string) {
    const results = this.stmt.all(...this.params);
    if (results.length === 0) return null;
    const row = results[0];
    if (colName) return row[colName];
    return row;
  }

  async raw() {
    const results = this.stmt.all(...this.params);
    return results.map((row: any) => Object.values(row));
  }
}

async function setupMockDb() {
  const mockD1 = new MockD1Database();
  const migrationsDir = path.resolve(__dirname, '../../../libs/shared/db/migrations');
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of migrationFiles) {
    const sqlPath = path.join(migrationsDir, file);
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    const statements = sqlContent.split('--> statement-breakpoint');
    for (const statement of statements) {
      if (statement.trim()) {
        await mockD1.exec(statement);
      }
    }
  }

  return mockD1;
}

describe('API Health Endpoint', () => {
  it('should return 200 OK and status ok', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok' });
  });
});

describe('POST /members/import', () => {
  it('should import members from valid CSV and handle inserts and updates', async () => {
    const mockD1 = await setupMockDb();
    const db = drizzle(mockD1 as any);

    // Initial check: empty DB
    const initialMembers = await db.select().from(membersTable).all();
    expect(initialMembers).toHaveLength(0);

    // Create form data with mock CSV file
    const csvContent = `Licence;Nom;Prénom;Sexe;Date de naissance;Email;Téléphone;Statut;Type;Saison;Nom du contact 1;Email du contact 1;Tél. du contact 1;Montant;Montant reçu;Montant restant;Payé
1111111;Martin;Pierre;M;1985-05-15;pierre.martin@example.com;0600000001;valide;Competiteur;25-26;Martin Jacques;jacques@example.com;0600000003;250.00;100.00;150.00;Non
2222222;Bernard;Sophie;F;1990-10-20;sophie.bernard@example.com;0600000002;valide;Loisir;25-26;;;;;;;
3333333;invalid-row;missing-fields-etc`;

    const formData = new FormData();
    const blob = new Blob([csvContent], { type: 'text/csv' });
    formData.append('file', blob, 'members.csv');

    const req = new Request('http://localhost/members/import', {
      method: 'POST',
      body: formData,
    });

    const res = await app.request(req, undefined, {
      DB: mockD1 as any,
    });

    if (res.status !== 200) {
      console.log('IMPORT ERROR RESPONSE:', res.status, await res.text());
    }

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      success: true,
      inserted: 2,
      updated: 0,
      errors: 1, // the third row has invalid format / missing fields
    });

    // Verify in database
    const dbMembers = await db.select().from(membersTable).all();
    expect(dbMembers).toHaveLength(2);

    const m1 = dbMembers.find(m => m.licence === '1111111')!;
    expect(m1).toBeDefined();
    expect(m1.lastName).toBe('Martin');
    expect(m1.firstName).toBe('Pierre');
    expect(m1.gender).toBe('M');
    expect(m1.birthDate).toBe('1985-05-15');
    expect(m1.email).toBe('pierre.martin@example.com');
    expect(m1.phone).toBe('0600000001');
    expect(m1.status).toBe('valide');
    expect(m1.type).toBe('Competiteur');
    expect(m1.amountDue).toBe(25000);
    expect(m1.amountReceived).toBe(10000);
    expect(m1.amountRemaining).toBe(15000);
    expect(m1.paid).toBe(false);
    expect(m1.parent1Name).toBe('Martin Jacques');
    expect(m1.parent1Email).toBe('jacques@example.com');
    expect(m1.parent1Phone).toBe('0600000003');
    expect(m1.importedAt).toBeInstanceOf(Date);

    // Now send another CSV with one update, one insert, and check counts
    const updateCsvContent = `Licence;Nom;Prénom;Sexe;Date de naissance;Email;Téléphone;Statut;Type;Saison;Nom du contact 1;Email du contact 1;Tél. du contact 1;Montant;Montant reçu;Montant restant;Payé
1111111;Martin Updated;Pierre;M;1985-05-15;pierre.martin.new@example.com;0600000099;suspendu;Competiteur;25-26;Martin Jacques;jacques@example.com;0600000003;250.00;250.00;0.00;Oui
4444444;Petit;Lucas;M;1995-12-25;lucas.petit@example.com;;valide;Loisir;25-26;;;;200.00;0.00;200.00;Non`;

    const updateFormData = new FormData();
    const updateBlob = new Blob([updateCsvContent], { type: 'text/csv' });
    updateFormData.append('file', updateBlob, 'update_members.csv');

    const updateReq = new Request('http://localhost/members/import', {
      method: 'POST',
      body: updateFormData,
    });

    const updateRes = await app.request(updateReq, undefined, {
      DB: mockD1 as any,
    });

    expect(updateRes.status).toBe(200);
    const updateBody = await updateRes.json();
    expect(updateBody).toEqual({
      success: true,
      inserted: 1,
      updated: 1,
      errors: 0,
    });

    // Verify in database again
    const finalMembers = await db.select().from(membersTable).all();
    expect(finalMembers).toHaveLength(3); // Pierre, Sophie, Lucas

    const m1Updated = finalMembers.find(m => m.licence === '1111111')!;
    expect(m1Updated.lastName).toBe('Martin Updated');
    expect(m1Updated.email).toBe('pierre.martin.new@example.com');
    expect(m1Updated.phone).toBe('0600000099');
    expect(m1Updated.status).toBe('suspendu');
    expect(m1Updated.amountDue).toBe(25000);
    expect(m1Updated.amountReceived).toBe(25000);
    expect(m1Updated.amountRemaining).toBe(0);
    expect(m1Updated.paid).toBe(true);
  });

  it('should import members from a real Poona CSV export format and map headers/values correctly', async () => {
    const mockD1 = await setupMockDb();
    const db = drizzle(mockD1 as any);

    // Simulated real Poona export CSV with semicolons and actual columns
    const poonaCsvContent = `Saison;Adhérent validé;Sexe;Nom;Prénom;Licence;Date naissance;Email;Tél. du contact 1;Tarif;Etat de dossier
"25-26";"Oui";"H";"ABADIE";"Christophe";"07104079";"22-09-1969";"CA@SPECTRUMFR-DESIGN.COM";"+33682681335";"Pass Jeu Libre";"Dossier finalisé"
"25-26";"Non";"F";"ALLARD";"Alice";"07684632";"17-09-2017";"aloux460@gmail.com";"";"Ecole Poussins (U11)";"Dossier annulé"`;

    const formData = new FormData();
    const blob = new Blob([poonaCsvContent], { type: 'text/csv' });
    formData.append('file', blob, 'poona_export.csv');

    const req = new Request('http://localhost/members/import', {
      method: 'POST',
      body: formData,
    });

    const res = await app.request(req, undefined, {
      DB: mockD1 as any,
    });

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body).toEqual({
      success: true,
      inserted: 2,
      updated: 0,
      errors: 0,
    });

    // Verify database mappings
    const dbMembers = await db.select().from(membersTable).all();
    expect(dbMembers).toHaveLength(2);

    const m1 = dbMembers.find(m => m.licence === '07104079')!;
    expect(m1).toBeDefined();
    expect(m1.season).toBe('25-26');
    expect(m1.lastName).toBe('ABADIE');
    expect(m1.firstName).toBe('Christophe');
    expect(m1.gender).toBe('M'); // H mapped to M
    expect(m1.birthDate).toBe('1969-09-22'); // DD-MM-YYYY mapped to YYYY-MM-DD
    expect(m1.email).toBe('CA@SPECTRUMFR-DESIGN.COM');
    expect(m1.status).toBe('valide'); // Oui/Dossier finalisé mapped to valide
    expect(m1.amountDue).toBe(0);
    expect(m1.parent1Phone).toBe('+33682681335');
    expect(m1.parent1Name).toBeNull();

    const m2 = dbMembers.find(m => m.licence === '07684632')!;
    expect(m2).toBeDefined();
    expect(m2.season).toBe('25-26');
    expect(m2.gender).toBe('F');
    expect(m2.birthDate).toBe('2017-09-17');
    expect(m2.status).toBe('suspendu'); // Non/Dossier annulé mapped to suspendu
  });

  it('should return 400 when file is missing', async () => {
    const mockD1 = await setupMockDb();
    const formData = new FormData(); // no file appended

    const req = new Request('http://localhost/members/import', {
      method: 'POST',
      body: formData,
    });

    const res = await app.request(req, undefined, {
      DB: mockD1 as any,
    });

    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.success).toBe(false);
  });

  it('should return 400 when headers are invalid', async () => {
    const mockD1 = await setupMockDb();
    const badCsvContent = `Licence;Nom;Prénom;Sexe;WrongHeader;Email;Téléphone;Statut;Type
1111111;Martin;Pierre;M;1985-05-15;pierre.martin@example.com;0600000001;valide;Competiteur`;

    const formData = new FormData();
    const blob = new Blob([badCsvContent], { type: 'text/csv' });
    formData.append('file', blob, 'bad_headers.csv');

    const req = new Request('http://localhost/members/import', {
      method: 'POST',
      body: formData,
    });

    const res = await app.request(req, undefined, {
      DB: mockD1 as any,
    });

    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.success).toBe(false);
  });
});

describe('GET /members', () => {
  it('should return paginated list of members', async () => {
    const mockD1 = await setupMockDb();
    const db = drizzle(mockD1 as any);

    // Insert dummy members
    await db.insert(membersTable).values([
      { licence: '1000001', lastName: 'Dupont', firstName: 'Jean', gender: 'M', birthDate: '1990-01-01', status: 'valide', type: 'Competiteur', importedAt: new Date() },
      { licence: '1000002', lastName: 'Martin', firstName: 'Sophie', gender: 'F', birthDate: '1985-05-15', status: 'valide', type: 'Loisir', importedAt: new Date() },
      { licence: '1000003', lastName: 'Durand', firstName: 'Luc', gender: 'M', birthDate: '1995-12-25', status: 'suspendu', type: 'Competiteur', importedAt: new Date() },
    ]).run();

    // Test simple list
    const res = await app.request('http://localhost/members?page=1&limit=2', undefined, { DB: mockD1 as any });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(2);
    expect(body.pagination).toEqual({
      total: 3,
      page: 1,
      limit: 2,
      totalPages: 2,
    });

    // Test search filter (firstName)
    const resSearch = await app.request('http://localhost/members?search=sop', undefined, { DB: mockD1 as any });
    const bodySearch = await resSearch.json() as any;
    expect(bodySearch.data).toHaveLength(1);
    expect(bodySearch.data[0].firstName).toBe('Sophie');

    // Test search filter (lastName)
    const resSearchLast = await app.request('http://localhost/members?search=dupont', undefined, { DB: mockD1 as any });
    const bodySearchLast = await resSearchLast.json() as any;
    expect(bodySearchLast.data).toHaveLength(1);
    expect(bodySearchLast.data[0].firstName).toBe('Jean');

    // Test search filter (licence)
    const resSearchLicence = await app.request('http://localhost/members?search=1000003', undefined, { DB: mockD1 as any });
    const bodySearchLicence = await resSearchLicence.json() as any;
    expect(bodySearchLicence.data).toHaveLength(1);
    expect(bodySearchLicence.data[0].firstName).toBe('Luc');

    // Test type & gender filter
    const resFilter = await app.request('http://localhost/members?type=Competiteur&gender=M', undefined, { DB: mockD1 as any });
    const bodyFilter = await resFilter.json() as any;
    expect(bodyFilter.data).toHaveLength(2); // Dupont and Durand
  });

  it('should filter members by season', async () => {
    const mockD1 = await setupMockDb();
    const db = drizzle(mockD1 as any);

    // Insert season 24-25 to respect foreign key constraint
    await db.insert(seasonsTable).values({
      id: '24-25',
      name: 'Saison 2024-2025',
      active: false,
      createdAt: new Date()
    }).run();

    // Insert dummy members in different seasons
    await db.insert(membersTable).values([
      { licence: '1000001', season: '24-25', lastName: 'Dupont', firstName: 'Jean', gender: 'M', birthDate: '1990-01-01', status: 'valide', type: 'Competiteur', importedAt: new Date() },
      { licence: '1000001', season: '25-26', lastName: 'Dupont', firstName: 'Jean', gender: 'M', birthDate: '1990-01-01', status: 'valide', type: 'Competiteur', importedAt: new Date() },
      { licence: '1000002', season: '25-26', lastName: 'Martin', firstName: 'Sophie', gender: 'F', birthDate: '1985-05-15', status: 'valide', type: 'Loisir', importedAt: new Date() },
    ]).run();

    // Query for 24-25
    const res2425 = await app.request('http://localhost/members?season=24-25', undefined, { DB: mockD1 as any });
    const body2425 = await res2425.json() as any;
    expect(body2425.data).toHaveLength(1);
    expect(body2425.data[0].licence).toBe('1000001');

    // Query for 25-26
    const res2526 = await app.request('http://localhost/members?season=25-26', undefined, { DB: mockD1 as any });
    const body2526 = await res2526.json() as any;
    expect(body2526.data).toHaveLength(2);
  });
});

describe('GET /members/:licence', () => {
  it('should return member details if found', async () => {
    const mockD1 = await setupMockDb();
    const db = drizzle(mockD1 as any);

    await db.insert(membersTable).values({
      licence: '7654321',
      lastName: 'Lemoine',
      firstName: 'Paul',
      gender: 'M',
      birthDate: '1992-04-18',
      status: 'valide',
      type: 'Competiteur',
      importedAt: new Date()
    }).run();

    const res = await app.request('http://localhost/members/7654321', undefined, { DB: mockD1 as any });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
    expect(body.data.firstName).toBe('Paul');
    expect(body.data.lastName).toBe('Lemoine');
  });

  it('should return 404 if member is not found', async () => {
    const mockD1 = await setupMockDb();
    const res = await app.request('http://localhost/members/9999999', undefined, { DB: mockD1 as any });
    expect(res.status).toBe(404);
  });
});

describe('GET /seasons', () => {
  it('should return the list of seasons in descending order', async () => {
    const mockD1 = await setupMockDb();
    const db = drizzle(mockD1 as any);

    // Pre-populate with another season to verify ordering
    await db.insert(seasonsTable).values({
      id: '26-27',
      name: 'Saison 2026-2027',
      active: false,
      createdAt: new Date(),
    }).run();

    const res = await app.request('http://localhost/seasons', undefined, { DB: mockD1 as any });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(2); // '26-27' and default '25-26'
    expect(body.data[0].id).toBe('26-27');
    expect(body.data[1].id).toBe('25-26');
  });
});

describe('Accounting API Endpoints', () => {
  it('should manage season balances, transactions, and generate reports', async () => {
    const mockD1 = await setupMockDb();

    // 1. Post initial balance
    const balRes = await app.request('http://localhost/seasons/25-26/balances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([
        { accountId: 'current', initialBalance: 100000 }, // 1000 €
        { accountId: 'cash', initialBalance: 5000 }      // 50 €
      ])
    }, { DB: mockD1 as any });
    expect(balRes.status).toBe(200);

    // 2. Add dynamic transaction
    const txRes = await app.request('http://localhost/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seasonId: '25-26',
        type: 'recette',
        accountId: 'current',
        category: 'adhesions_inscriptions',
        amount: 25000, // 250 €
        date: '2026-07-13',
        paymentMethod: 'virement',
        description: 'Cotisation Dupont'
      })
    }, { DB: mockD1 as any });
    expect(txRes.status).toBe(200);

    // 3. Add internal transfer (current -> cash)
    const transferRes = await app.request('http://localhost/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seasonId: '25-26',
        type: 'transfert',
        accountId: 'current',
        destinationAccountId: 'cash',
        amount: 20000, // 200 €
        date: '2026-07-13',
        paymentMethod: 'virement',
        description: 'Approvisionnement Caisse'
      })
    }, { DB: mockD1 as any });
    expect(transferRes.status).toBe(200);

    // 4. Fetch reports and assert correct balances
    const reportRes = await app.request('http://localhost/seasons/25-26/reports', undefined, { DB: mockD1 as any });
    expect(reportRes.status).toBe(200);
    const report = await reportRes.json() as any;
    expect(report.success).toBe(true);

    const pnl = report.data.compteResultat;
    expect(pnl.totalRecettes).toBe(25000);
    expect(pnl.categories.adhesions_inscriptions.total).toBe(25000);

    const balances = report.data.bilanTrésorerie;
    // Compte courant : 1000 € (init) + 250 € (recette) - 200 € (transfert) = 1050 €
    const current = balances.find((b: any) => b.accountId === 'current');
    expect(current.initialBalance).toBe(100000);
    expect(current.finalBalance).toBe(105000);

    // Caisse : 50 € (init) + 200 € (transfert) = 250 €
    const cash = balances.find((b: any) => b.accountId === 'cash');
    expect(cash.initialBalance).toBe(5000);
    expect(cash.finalBalance).toBe(25000);

    // 5. Test GET /seasons/:seasonId/balances
    const getBalRes = await app.request('http://localhost/seasons/25-26/balances', undefined, { DB: mockD1 as any });
    expect(getBalRes.status).toBe(200);
    const getBalJson = await getBalRes.json() as any;
    expect(getBalJson.success).toBe(true);
    expect(getBalJson.data).toHaveLength(2);

    // 6. Test GET /transactions
    const getTxRes = await app.request('http://localhost/transactions?season=25-26&page=1&limit=20', undefined, { DB: mockD1 as any });
    expect(getTxRes.status).toBe(200);
    const getTxJson = await getTxRes.json() as any;
    expect(getTxJson.success).toBe(true);
    expect(getTxJson.data).toHaveLength(2);
    expect(getTxJson.pagination.total).toBe(2);

    // 7. Test DELETE /transactions/:id
    const txIdToDelete = getTxJson.data[0].id;
    const delRes = await app.request(`http://localhost/transactions/${txIdToDelete}`, {
      method: 'DELETE'
    }, { DB: mockD1 as any });
    expect(delRes.status).toBe(200);
    const delJson = await delRes.json() as any;
    expect(delJson.success).toBe(true);

    // Verify deletion
    const getTxRes2 = await app.request('http://localhost/transactions?season=25-26', undefined, { DB: mockD1 as any });
    const getTxJson2 = await getTxRes2.json() as any;
    expect(getTxJson2.data).toHaveLength(1);
  });
});

describe('Bank Reconciliation API Endpoints', () => {
  it('should import OFX, list bank transactions, and reconcile them', async () => {
    const mockD1 = await setupMockDb();

    // Mock fichier OFX
    const ofxContent = `OFXHEADER:100
DATA:OFXSGML
VERSION:102
<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<STMTRS>
<BANKACCTFROM>
<ACCTID>00050007847
</BANKACCTFROM>
<BANKTRANLIST>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20260216
<TRNAMT>-15.60
<FITID>SG-FITID-TEST-1
<NAME>IONOS SARL
<MEMO>Facture Internet
</STMTTRN>
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;

    // 1. Simuler l'importation via POST /bank-transactions/import
    const formData = new FormData();
    const file = new File([ofxContent], 'statement.ofx', { type: 'text/plain' });
    formData.append('file', file);
    formData.append('seasonId', '25-26');

    const importRes = await app.request('http://localhost/bank-transactions/import', {
      method: 'POST',
      body: formData
    }, { DB: mockD1 as any });
    expect(importRes.status).toBe(200);
    const importJson = await importRes.json() as any;
    expect(importJson.success).toBe(true);
    expect(importJson.count).toBe(1);

    // 2. Récupérer les transactions importées via GET /bank-transactions
    const getRes = await app.request('http://localhost/bank-transactions?season=25-26&status=pending', undefined, { DB: mockD1 as any });
    expect(getRes.status).toBe(200);
    const getJson = await getRes.json() as any;
    expect(getJson.success).toBe(true);
    expect(getJson.data).toHaveLength(1);
    
    const bankTx = getJson.data[0];
    expect(bankTx.fitid).toBe('SG-FITID-TEST-1');
    expect(bankTx.amount).toBe(-1560); // converti en centimes
    expect(bankTx.accountId).toBe('current');

    // 3. Pointer en créant une nouvelle transaction via POST /bank-transactions/:id/reconcile
    const reconRes = await app.request(`http://localhost/bank-transactions/${bankTx.id}/reconcile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create',
        transaction: {
          seasonId: '25-26',
          type: 'depense',
          accountId: 'current',
          category: 'frais_administratifs',
          amount: 1560,
          date: '2026-02-16',
          paymentMethod: 'virement',
          description: 'Facture Internet Ionos',
          reference: 'SG-FITID-TEST-1'
        }
      })
    }, { DB: mockD1 as any });
    expect(reconRes.status).toBe(200);

    // Vérifier le changement de statut
    const checkRes = await app.request('http://localhost/bank-transactions?season=25-26&status=reconciled', undefined, { DB: mockD1 as any });
    const checkJson = await checkRes.json() as any;
    expect(checkJson.data).toHaveLength(1);
    expect(checkJson.data[0].status).toBe('reconciled');
  });

  it('should ignore a bank transaction', async () => {
    const mockD1 = await setupMockDb();

    // Mock fichier OFX
    const ofxContent = `OFXHEADER:100
DATA:OFXSGML
VERSION:102
<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<STMTRS>
<BANKACCTFROM>
<ACCTID>00070007847
</BANKACCTFROM>
<BANKTRANLIST>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20260217
<TRNAMT>50.00
<FITID>SG-FITID-TEST-2
<NAME>DUPONT RECETTE
<MEMO>Cotisation
</STMTTRN>
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;

    // 1. Simuler l'importation via POST /bank-transactions/import
    const formData = new FormData();
    const file = new File([ofxContent], 'statement.ofx', { type: 'text/plain' });
    formData.append('file', file);
    formData.append('seasonId', '25-26');

    const importRes = await app.request('http://localhost/bank-transactions/import', {
      method: 'POST',
      body: formData
    }, { DB: mockD1 as any });
    expect(importRes.status).toBe(200);
    const importJson = await importRes.json() as any;
    expect(importJson.success).toBe(true);
    expect(importJson.count).toBe(1);

    // 2. Récupérer les transactions importées via GET /bank-transactions (note: savings account because of 00070007847)
    const getRes = await app.request('http://localhost/bank-transactions?season=25-26&status=pending', undefined, { DB: mockD1 as any });
    expect(getRes.status).toBe(200);
    const getJson = await getRes.json() as any;
    expect(getJson.success).toBe(true);
    expect(getJson.data).toHaveLength(1);
    
    const bankTx = getJson.data[0];
    expect(bankTx.fitid).toBe('SG-FITID-TEST-2');
    expect(bankTx.amount).toBe(5000); // 50.00 -> 5000 cents
    expect(bankTx.accountId).toBe('savings');

    // 3. Ignorer via POST /bank-transactions/:id/ignore
    const ignoreRes = await app.request(`http://localhost/bank-transactions/${bankTx.id}/ignore`, {
      method: 'POST'
    }, { DB: mockD1 as any });
    expect(ignoreRes.status).toBe(200);

    // Vérifier le changement de statut
    const checkRes = await app.request('http://localhost/bank-transactions?season=25-26&status=ignored', undefined, { DB: mockD1 as any });
    const checkJson = await checkRes.json() as any;
    expect(checkJson.data).toHaveLength(1);
    expect(checkJson.data[0].status).toBe('ignored');
  });

  it('should analyze transactions and update member balances on reconciliation', async () => {
    const mockD1 = await setupMockDb();
    const db = drizzle(mockD1 as any);

    // Assurer que la saison existe
    await db.insert(seasonsTable).values({
      id: '25-26',
      name: 'Saison 2025-2026',
      active: true,
      createdAt: new Date()
    }).onConflictDoNothing().run();

    // Mock adhérent et opération
    const [m] = await db.insert(membersTable).values({
      licence: '1234567',
      season: '25-26',
      lastName: 'PIGNON',
      firstName: 'Eliot',
      gender: 'M',
      birthDate: '2010-01-01',
      type: 'Loisir',
      amountDue: 25000,
      amountReceived: 0,
      amountRemaining: 25000,
      parent1Name: 'Sébastien PIGNON',
      importedAt: new Date()
    }).returning();

    const [bt] = await db.insert(bankTransactionsTable).values({
      fitid: 'FITID-PIGNON-TEST',
      seasonId: '25-26',
      accountId: 'current',
      amount: 25000, // 250.00 €
      date: '2026-02-02',
      name: 'VIR INST RE 653287691266',
      memo: 'DE: M SEBASTIEN PIGNON MOTIF: ADHESION ELIOT PIGNON',
      status: 'pending',
      createdAt: new Date()
    }).returning();

    // Mock du binding AI
    const mockAI = {
      run: async (model: string, input: any) => {
        return {
          response: JSON.stringify({
            memberId: m.id,
            memberName: 'Eliot PIGNON',
            category: 'adhesions_inscriptions',
            confidence: 0.95
          })
        };
      }
    };

    // 1. Appeler l'endpoint d'analyse
    const analyzeRes = await app.request('http://localhost/bank-transactions/analyze?season=25-26', {
      method: 'POST'
    }, { DB: mockD1 as any, AI: mockAI as any });
    expect(analyzeRes.status).toBe(200);

    // 2. Vérifier que la suggestion a été enregistrée
    const getRes = await app.request('http://localhost/bank-transactions?season=25-26&status=pending', undefined, { DB: mockD1 as any });
    const getJson = await getRes.json() as any;
    const updatedBt = getJson.data.find((x: any) => x.id === bt.id);
    expect(updatedBt.aiSuggestions).not.toBeNull();
    const suggestions = JSON.parse(updatedBt.aiSuggestions);
    expect(suggestions.memberId).toBe(m.id);

    // 3. Réaliser le pointage
    const reconRes = await app.request(`http://localhost/bank-transactions/${bt.id}/reconcile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create',
        btId: bt.id,
        transaction: {
          seasonId: '25-26',
          type: 'recette',
          accountId: 'current',
          category: 'adhesions_inscriptions',
          amount: 25000,
          date: '2026-02-02',
          paymentMethod: 'virement',
          description: 'Adhésion Eliot PIGNON',
          memberId: m.id,
          reference: 'FITID-PIGNON-TEST'
        }
      })
    }, { DB: mockD1 as any });
    expect(reconRes.status).toBe(200);

    // 4. Vérifier que l'adhérent a son solde mis à jour à payé = true
    const updatedMember = await db.select().from(membersTable).where(eq(membersTable.id, m.id)).get();
    expect(updatedMember.amountReceived).toBe(25000);
    expect(updatedMember.amountRemaining).toBe(0);
    expect(updatedMember.paid).toBe(true);

    // 5. Récupérer la transaction créée
    const createdTx = await db.select().from(transactionsTable).where(eq(transactionsTable.bankTransactionId, bt.id)).get();
    expect(createdTx).toBeDefined();

    // 6. Supprimer la transaction du Grand Livre via l'API
    const deleteRes = await app.request(`http://localhost/transactions/${createdTx.id}`, {
      method: 'DELETE'
    }, { DB: mockD1 as any });
    expect(deleteRes.status).toBe(200);

    // 7. Vérifier que la transaction bancaire est repassée en status = 'pending'
    const resetBt = await db.select().from(bankTransactionsTable).where(eq(bankTransactionsTable.id, bt.id)).get();
    expect(resetBt.status).toBe('pending');

    // 8. Vérifier que l'adhérent a son solde rétabli
    const resetMember = await db.select().from(membersTable).where(eq(membersTable.id, m.id)).get();
    expect(resetMember.amountReceived).toBe(0);
    expect(resetMember.amountRemaining).toBe(25000);
    expect(resetMember.paid).toBe(false);
  });

  it('resolves ambiguous name matching deterministically when multiple members share last name', async () => {
    const mockD1 = await setupMockDb();
    const db = drizzle(mockD1 as any);

    // Ajouter trois membres de la famille MADRANGE
    const mLaurence = await db.insert(membersTable).values({
      licence: '06654740',
      season: '25-26',
      lastName: 'MADRANGE',
      firstName: 'Laurence',
      gender: 'F',
      birthDate: '1982-05-26',
      email: 'laurence@test.com',
      status: 'valide',
      type: 'Compétiteurs adultes',
      amountDue: 26000,
      amountReceived: 26000,
      amountRemaining: 0,
      paid: true,
      importedAt: new Date()
    }).returning().then(r => r[0]);

    await db.insert(membersTable).values({
      licence: '00491827',
      season: '25-26',
      lastName: 'MADRANGE',
      firstName: 'Paul',
      gender: 'M',
      birthDate: '1994-02-12',
      email: 'paul@test.com',
      status: 'valide',
      type: 'Compétiteurs adultes',
      amountDue: 6007,
      amountReceived: 6007,
      amountRemaining: 0,
      paid: true,
      importedAt: new Date()
    }).run();

    // Insérer la transaction de Laurence Madrange pour du cordage
    const bt = await db.insert(bankTransactionsTable).values({
      fitid: '62517463000300846000500078472020260704',
      seasonId: '25-26',
      accountId: 'current',
      amount: 1500,
      date: '2026-07-04',
      name: 'VIR INST RE 668591169870',
      memo: 'DE: MLLE LAURENCE MADRANGE DATE: 04/07/2026 00:25 MOTIF: cordage',
      status: 'pending',
      createdAt: new Date()
    }).returning().then(r => r[0]);

    // Mock du service AI pour simuler un échec ou un retour indécis (confidence faible)
    const mockAI = {
      run: async () => {
        throw new Error('AI service error or empty response simulation');
      }
    };

    // Lancer l'analyse
    const analyzeRes = await app.request('http://localhost/bank-transactions/analyze?season=25-26', {
      method: 'POST'
    }, { DB: mockD1 as any, AI: mockAI as any });
    expect(analyzeRes.status).toBe(200);

    // Vérifier que Laurence Madrange a été identifiée de manière déterministe
    const getRes = await app.request('http://localhost/bank-transactions?season=25-26&status=pending', undefined, { DB: mockD1 as any });
    const json = await getRes.json() as any;
    const updatedBt = json.data.find((x: any) => x.id === bt.id);
    expect(updatedBt.aiSuggestions).not.toBeNull();
    
    const sug = JSON.parse(updatedBt.aiSuggestions);
    expect(sug.memberId).toBe(mLaurence.id);
    expect(sug.category).toBe('cordage_vente');
  });
});





