import { describe, it, expect } from 'vitest';
import { membersTable, seasonsTable, seasonBalancesTable, transactionsTable, bankTransactionsTable, checksTable, checkDepositsTable, productsTable, ordersTable, expensesTable, invoicesTable } from '../../../libs/shared/db/src/schema';
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

describe('POST and PUT /seasons', () => {
  it('should support creating and updating seasons', async () => {
    const mockD1 = await setupMockDb();
    
    // Create new season
    const res = await app.request('http://localhost/seasons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: '26-27',
        name: 'Saison 2026-2027',
        active: true
      })
    }, { DB: mockD1 as any });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
    expect(body.data.id).toBe('26-27');
    expect(body.data.active).toBe(true);

    // Verify other seasons became inactive
    const db = drizzle(mockD1 as any);
    const prevSeason = await db.select().from(seasonsTable).where(eq(seasonsTable.id, '25-26')).get();
    expect(prevSeason?.active).toBe(false);

    // Update season
    const updateRes = await app.request('http://localhost/seasons/26-27', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Saison 2026-2027 Modifiée',
        active: false
      })
    }, { DB: mockD1 as any });
    expect(updateRes.status).toBe(200);
    const updateBody = await updateRes.json() as any;
    expect(updateBody.success).toBe(true);
    expect(updateBody.data.name).toBe('Saison 2026-2027 Modifiée');
    expect(updateBody.data.active).toBe(false);
  });

  it('should support closing a season and block write actions on closed season', async () => {
    const mockD1 = await setupMockDb();
    
    // Close season
    const closeRes = await app.request('http://localhost/seasons/25-26/close', {
      method: 'POST'
    }, { DB: mockD1 as any });
    expect(closeRes.status).toBe(200);
    const closeBody = await closeRes.json() as any;
    expect(closeBody.success).toBe(true);
    expect(closeBody.data.closed).toBe(true);

    // Try to create transaction
    const txRes = await app.request('http://localhost/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seasonId: '25-26',
        type: 'recette',
        accountId: 'current',
        category: 'adhesions',
        amount: 5000,
        date: '2026-07-13',
        paymentMethod: 'virement',
        description: 'Should fail'
      })
    }, { DB: mockD1 as any });
    expect(txRes.status).toBe(400);
    const txBody = await txRes.json() as any;
    expect(txBody.success).toBe(false);
    expect(txBody.error).toContain('clôturée');

    // Try to submit expense
    const expRes = await app.request('http://localhost/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seasonId: '25-26',
        description: 'Should fail',
        category: 'deplacements',
        amount: 2000,
        emitterName: 'Test'
      })
    }, { DB: mockD1 as any });
    expect(expRes.status).toBe(400);
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
    expect(pnl.categories['1'].total).toBe(25000);

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

  it('supports reconciling a bank transaction directly with a club invoice', async () => {
    const mockD1 = await setupMockDb();
    const db = drizzle(mockD1 as any);

    // 1. Créer une facture
    const inv = await db.insert(invoicesTable).values({
      invoiceNumber: 'FAC-2526-NBA91-0010',
      seasonId: '25-26',
      date: '2026-07-14',
      dueDate: '2026-08-14',
      clientName: 'Comité 91',
      totalAmount: 15000,
      status: 'sent',
      createdAt: new Date()
    }).returning().then(r => r[0]);

    // 2. Insérer une ligne de relevé bancaire de 150.00 €
    const bt = await db.insert(bankTransactionsTable).values({
      fitid: 'FITID-RECON-INV-1',
      accountId: 'current',
      seasonId: '25-26',
      amount: 15000,
      date: '2026-07-15',
      name: 'VIR RECU COMITE 91',
      status: 'pending',
      createdAt: new Date()
    }).returning().then(r => r[0]);

    // 3. Rapprocher via l'API
    const reconcileRes = await app.request(`http://localhost/bank-transactions/${bt.id}/reconcile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create',
        invoiceId: inv.id,
        transaction: {
          seasonId: '25-26',
          type: 'recette',
          accountId: 'current',
          category: 7, // Cordage ou autre vente
          amount: 15000,
          date: '2026-07-15',
          paymentMethod: 'virement',
          description: 'Règlement Facture FAC-2526-NBA91-0010'
        }
      })
    }, { DB: mockD1 as any });
    expect(reconcileRes.status).toBe(200);

    // 4. Vérifier que la facture est payée et que la ligne D1 pointe dessus
    const updatedInv = await db.select().from(invoicesTable).where(eq(invoicesTable.id, inv.id)).get();
    expect(updatedInv.status).toBe('paid');
    expect(updatedInv.bankTransactionId).toBe(bt.id);
  });

  it('should return 404 when reconciling with a non-existent invoiceId', async () => {
    const mockD1 = await setupMockDb();
    const db = drizzle(mockD1 as any);

    // 1. Insérer une ligne de relevé bancaire
    const bt = await db.insert(bankTransactionsTable).values({
      fitid: 'FITID-RECON-INV-404',
      accountId: 'current',
      seasonId: '25-26',
      amount: 15000,
      date: '2026-07-15',
      name: 'VIR RECU COMITE 91',
      status: 'pending',
      createdAt: new Date()
    }).returning().then(r => r[0]);

    // 2. Rapprocher avec un invoiceId inexistant
    const reconcileRes = await app.request(`http://localhost/bank-transactions/${bt.id}/reconcile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create',
        invoiceId: 99999, // non-existent invoice ID
        transaction: {
          seasonId: '25-26',
          type: 'recette',
          accountId: 'current',
          category: 7,
          amount: 15000,
          date: '2026-07-15',
          paymentMethod: 'virement',
          description: 'Règlement Facture Inexistante'
        }
      })
    }, { DB: mockD1 as any });

    expect(reconcileRes.status).toBe(404);
    const body = await reconcileRes.json() as any;
    expect(body.success).toBe(false);
    expect(body.error).toBe('Facture introuvable');
  });

  it('should return 400 when reconciling with an invoice from a closed season', async () => {
    const mockD1 = await setupMockDb();
    const db = drizzle(mockD1 as any);

    // 1. Créer une saison clôturée
    await db.insert(seasonsTable).values({
      id: '24-25',
      name: 'Saison 2024-2025',
      active: false,
      closed: true,
      createdAt: new Date()
    }).run();

    // 2. Créer une facture dans cette saison
    const inv = await db.insert(invoicesTable).values({
      invoiceNumber: 'FAC-2425-NBA91-0001',
      seasonId: '24-25',
      date: '2025-07-14',
      dueDate: '2025-08-14',
      clientName: 'Comité 91',
      totalAmount: 15000,
      status: 'sent',
      createdAt: new Date()
    }).returning().then(r => r[0]);

    // 3. Insérer une ligne de relevé bancaire
    const bt = await db.insert(bankTransactionsTable).values({
      fitid: 'FITID-RECON-INV-CLOSED',
      accountId: 'current',
      seasonId: '25-26',
      amount: 15000,
      date: '2025-07-15',
      name: 'VIR RECU COMITE 91',
      status: 'pending',
      createdAt: new Date()
    }).returning().then(r => r[0]);

    // 4. Tenter de rapprocher via l'API
    const reconcileRes = await app.request(`http://localhost/bank-transactions/${bt.id}/reconcile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create',
        invoiceId: inv.id,
        transaction: {
          seasonId: '24-25',
          type: 'recette',
          accountId: 'current',
          category: 7,
          amount: 15000,
          date: '2025-07-15',
          paymentMethod: 'virement',
          description: 'Règlement Facture FAC-2425-NBA91-0001'
        }
      })
    }, { DB: mockD1 as any });

    expect(reconcileRes.status).toBe(400);
    const body = await reconcileRes.json() as any;
    expect(body.success).toBe(false);
    expect(body.error).toBe('La saison de la facture est clôturée.');
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
            category: 1,
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
          category: 1,
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

  it('supports analyzing a single transaction ID via query parameter', async () => {
    const mockD1 = await setupMockDb();
    const db = drizzle(mockD1 as any);

    const m = await db.insert(membersTable).values({
      licence: '12345678',
      season: '25-26',
      lastName: 'PIGNON',
      firstName: 'Eliot',
      gender: 'M',
      birthDate: '2015-08-01',
      email: 'eliot@pignon.com',
      status: 'valide',
      type: 'Jeunes',
      amountDue: 25000,
      amountReceived: 0,
      amountRemaining: 25000,
      paid: false,
      importedAt: new Date()
    }).returning().then(r => r[0]);

    const bt1 = await db.insert(bankTransactionsTable).values({
      fitid: 'FITID-SINGLE-1',
      accountId: 'current',
      seasonId: '25-26',
      amount: 25000,
      date: '2026-02-02',
      name: 'VIR INST RE 653287691266',
      memo: 'DE: M SEBASTIEN PIGNON MOTIF: ADHESION ELIOT PIGNON',
      status: 'pending',
      createdAt: new Date()
    }).returning().then(r => r[0]);

    const bt2 = await db.insert(bankTransactionsTable).values({
      fitid: 'FITID-SINGLE-2',
      accountId: 'current',
      seasonId: '25-26',
      amount: 1500,
      date: '2026-02-02',
      name: 'SUMUP *NOZAY BAD',
      status: 'pending',
      createdAt: new Date()
    }).returning().then(r => r[0]);

    let aiCallsCount = 0;
    const mockAI = {
      run: async (model: string, input: any) => {
        aiCallsCount++;
        return {
          response: JSON.stringify({
            memberId: m.id,
            memberName: 'Eliot PIGNON',
            category: 1,
            confidence: 0.95
          })
        };
      }
    };

    const analyzeRes = await app.request(`http://localhost/bank-transactions/analyze?season=25-26&id=${bt1.id}`, {
      method: 'POST'
    }, { DB: mockD1 as any, AI: mockAI as any });
    expect(analyzeRes.status).toBe(200);
    const analyzeJson = await analyzeRes.json() as any;
    expect(analyzeJson.count).toBe(1);
    expect(aiCallsCount).toBe(1);

    const updatedBt1 = await db.select().from(bankTransactionsTable).where(eq(bankTransactionsTable.id, bt1.id)).get();
    expect(updatedBt1.aiSuggestions).not.toBeNull();

    const updatedBt2 = await db.select().from(bankTransactionsTable).where(eq(bankTransactionsTable.id, bt2.id)).get();
    expect(updatedBt2.aiSuggestions).toBeNull();
  });

  it('classifies club recharges and long numeric IDs as internal transfers (category 15)', async () => {
    const mockD1 = await setupMockDb();
    const db = drizzle(mockD1 as any);

    const bt1 = await db.insert(bankTransactionsTable).values({
      fitid: '30930863000300846000500078472020260602',
      accountId: 'current',
      seasonId: '25-26',
      amount: 7000,
      date: '2026-06-02',
      name: 'VIR RECU 9615367317665',
      memo: 'DE: NOZAY BADMINTON MOTIF: Recharge juin 2026',
      status: 'pending',
      createdAt: new Date()
    }).returning().then(r => r[0]);

    const bt2 = await db.insert(bankTransactionsTable).values({
      fitid: '15509713000300846000500078472020260618',
      accountId: 'current',
      seasonId: '25-26',
      amount: -1000000,
      date: '2026-06-18',
      name: '000001 VIR EUROPEEN EMIS NET',
      memo: 'POUR: NOZAY BADMINTON REF: 9616980182494 REMISE: mise en reserve MOTIF: mise en reserve',
      status: 'pending',
      createdAt: new Date()
    }).returning().then(r => r[0]);

    const analyzeRes = await app.request('http://localhost/bank-transactions/analyze?season=25-26', {
      method: 'POST'
    }, { DB: mockD1 as any, AI: { run: async () => ({}) } as any });
    expect(analyzeRes.status).toBe(200);

    const updatedBt1 = await db.select().from(bankTransactionsTable).where(eq(bankTransactionsTable.id, bt1.id)).get();
    expect(updatedBt1.aiSuggestions).not.toBeNull();
    const sug1 = JSON.parse(updatedBt1.aiSuggestions);
    expect(sug1.category).toBe(15);
    expect(sug1.memberId).toBeNull();

    const updatedBt2 = await db.select().from(bankTransactionsTable).where(eq(bankTransactionsTable.id, bt2.id)).get();
    expect(updatedBt2.aiSuggestions).not.toBeNull();
    const sug2 = JSON.parse(updatedBt2.aiSuggestions);
    expect(sug2.category).toBe(15);
    expect(sug2.memberId).toBeNull();
  });

  it('matches transaction category based on exact product price (category 8 for 31.50)', async () => {
    const mockD1 = await setupMockDb();
    const db = drizzle(mockD1 as any);

    await db.insert(productsTable).values({
      name: 'Babolat 2',
      category: 'shuttlecock',
      price: 3150,
      stock: 50,
      active: true,
      createdAt: new Date()
    });

    const bt = await db.insert(bankTransactionsTable).values({
      fitid: '13800243000300846000500078472020260423',
      accountId: 'current',
      seasonId: '25-26',
      amount: 3150,
      date: '2026-04-23',
      name: 'VIR RECU 2383707922S',
      memo: 'DE: MLLE LAETITIA CLEMENT MOTIF: Virement de Mlle Laetitia Clement REF: Virement de Mlle Laetitia Clement',
      status: 'pending',
      createdAt: new Date()
    }).returning().then(r => r[0]);

    const member = await db.insert(membersTable).values({
      licence: '1234567',
      season: '25-26',
      firstName: 'Laetitia',
      lastName: 'Clement',
      gender: 'F',
      birthDate: '1995-04-12',
      status: 'valide',
      type: 'Adultes',
      amountDue: 0,
      amountReceived: 0,
      amountRemaining: 0,
      paid: true,
      importedAt: new Date()
    }).returning().then(r => r[0]);

    const aiMock = {
      run: async (model: string, options: any) => {
        return {
          response: JSON.stringify({
            memberId: member.id,
            memberName: 'Clement Laetitia',
            category: 8,
            confidence: 0.9,
            reasoning: 'Montant de 31.50 EUR correspond exactement au prix des volants Babolat 2.'
          })
        };
      }
    };

    const analyzeRes = await app.request('http://localhost/bank-transactions/analyze?season=25-26', {
      method: 'POST'
    }, { DB: mockD1 as any, AI: aiMock as any });
    expect(analyzeRes.status).toBe(200);

    const updatedBt = await db.select().from(bankTransactionsTable).where(eq(bankTransactionsTable.id, bt.id)).get();
    expect(updatedBt.aiSuggestions).not.toBeNull();
    const suggestions = JSON.parse(updatedBt.aiSuggestions);
    expect(suggestions.category).toBe(8);
    expect(suggestions.memberId).toBe(member.id);
  });

  it('matches transaction category based on product price multiples (category 7 for 30.00 representing 2 strings)', async () => {
    const mockD1 = await setupMockDb();
    const db = drizzle(mockD1 as any);

    await db.insert(productsTable).values({
      name: 'Cordage adulte',
      category: 'string',
      price: 1500,
      stock: 50,
      active: true,
      createdAt: new Date()
    });

    const bt = await db.insert(bankTransactionsTable).values({
      fitid: '16271243000300846000500078472020260324',
      accountId: 'current',
      seasonId: '25-26',
      amount: 3000,
      date: '2026-03-24',
      name: 'VIR INST RE 658284570674',
      memo: 'DE: MR OU MME DOMASZEWICZ WOLFGANG DATE: 23/03/2026 20:56 MOTIF: VIR. DE MR OU MME DOMASZEWICZ WOLFG ANG',
      status: 'pending',
      createdAt: new Date()
    }).returning().then(r => r[0]);

    const member = await db.insert(membersTable).values({
      licence: '7654321',
      season: '25-26',
      firstName: 'Wolfgang',
      lastName: 'Domaszewicz',
      gender: 'M',
      birthDate: '1980-11-22',
      status: 'valide',
      type: 'Adultes',
      amountDue: 0,
      amountReceived: 0,
      amountRemaining: 0,
      paid: true,
      importedAt: new Date()
    }).returning().then(r => r[0]);

    const aiMock = {
      run: async (model: string, options: any) => {
        return {
          response: JSON.stringify({
            memberId: member.id,
            memberName: 'Domaszewicz Wolfgang',
            category: 7,
            confidence: 0.95,
            reasoning: 'Montant de 30.00 EUR correspond exactement à 2 cordages à 15.00 EUR.'
          })
        };
      }
    };

    const analyzeRes = await app.request('http://localhost/bank-transactions/analyze?season=25-26', {
      method: 'POST'
    }, { DB: mockD1 as any, AI: aiMock as any });
    expect(analyzeRes.status).toBe(200);

    const updatedBt = await db.select().from(bankTransactionsTable).where(eq(bankTransactionsTable.id, bt.id)).get();
    expect(updatedBt.aiSuggestions).not.toBeNull();
    const suggestions = JSON.parse(updatedBt.aiSuggestions);
    expect(suggestions.category).toBe(7);
    expect(suggestions.memberId).toBe(member.id);
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
    expect(sug.category).toBe(7);
  });

  it('resolves parent-child matching correctly when parent name is wrapped in parentheses in database', async () => {
    const mockD1 = await setupMockDb();
    const db = drizzle(mockD1 as any);

    // Ajouter Lubin LEFEBVRE avec sa mère ARTICO Lucie
    const mLubin = await db.insert(membersTable).values({
      licence: '07355187',
      season: '25-26',
      lastName: 'LEFEBVRE',
      firstName: 'Lubin',
      gender: 'M',
      birthDate: '2014-09-16',
      email: 'liolef@hotmail.fr',
      status: 'valide',
      type: 'Elite Jeunes (Collège)',
      parent1Name: 'ARTICO Lucie (Parent)',
      amountDue: 24100,
      amountReceived: 24100,
      amountRemaining: 0,
      paid: true,
      importedAt: new Date()
    }).returning().then(r => r[0]);

    // Insérer la transaction
    const bt = await db.insert(bankTransactionsTable).values({
      fitid: '18444113000300846000500078472020260708',
      seasonId: '25-26',
      accountId: 'current',
      amount: 1500,
      date: '2026-07-08',
      name: 'VIR INST RE 668997068210',
      memo: 'DE: MLE ARTICO LUCIE OU DATE: 08/07/2026 09:26 MOTIF: Cordage Lubin Avril REF: NOT PROVIDED',
      status: 'pending',
      createdAt: new Date()
    }).returning().then(r => r[0]);

    const mockAI = {
      run: async () => {
        throw new Error('AI service error simulation');
      }
    };

    // Lancer l'analyse
    const analyzeRes = await app.request('http://localhost/bank-transactions/analyze?season=25-26', {
      method: 'POST'
    }, { DB: mockD1 as any, AI: mockAI as any });
    expect(analyzeRes.status).toBe(200);

    // Vérifier le match déterministe
    const getRes = await app.request('http://localhost/bank-transactions?season=25-26&status=pending', undefined, { DB: mockD1 as any });
    const json = await getRes.json() as any;
    const updatedBt = json.data.find((x: any) => x.id === bt.id);
    expect(updatedBt.aiSuggestions).not.toBeNull();
    
    const sug = JSON.parse(updatedBt.aiSuggestions);
    expect(sug.memberId).toBe(mLubin.id);
    expect(sug.category).toBe(7);
  });

  it('correctly maps young travel displacement expenses to actions_jeunes category in deterministic fallback', async () => {
    const mockD1 = await setupMockDb();
    const db = drizzle(mockD1 as any);

    const coach = await db.insert(membersTable).values({
      licence: '99887766',
      season: '25-26',
      lastName: 'TETEVUIDE',
      firstName: 'Cyril',
      gender: 'M',
      birthDate: '1985-05-15',
      email: 'cyril.tetevuide@test.com',
      status: 'valide',
      type: 'Adultes',
      amountDue: 0,
      amountReceived: 0,
      amountRemaining: 0,
      paid: true,
      importedAt: new Date()
    }).returning().then(r => r[0]);

    const bt = await db.insert(bankTransactionsTable).values({
      fitid: '58441093000300846000500078472020260511',
      seasonId: '25-26',
      accountId: 'current',
      amount: -12020,
      date: '2026-05-11',
      name: '000001 VIR EUROPEEN EMIS NET',
      memo: 'POUR: M CYRIL TETEVUIDE REMISE: deplacement jeune avril2026 debut',
      status: 'pending',
      createdAt: new Date()
    }).returning().then(r => r[0]);

    const mockAI = {
      run: async () => {
        throw new Error('AI offline simulation');
      }
    };

    const analyzeRes = await app.request('http://localhost/bank-transactions/analyze?season=25-26', {
      method: 'POST'
    }, { DB: mockD1 as any, AI: mockAI as any });
    expect(analyzeRes.status).toBe(200);

    const updatedBt = await db.select().from(bankTransactionsTable).where(eq(bankTransactionsTable.id, bt.id)).get();
    expect(updatedBt.aiSuggestions).not.toBeNull();
    
    const sug = JSON.parse(updatedBt.aiSuggestions);
    expect(sug.category).toBe(4); // Actions Jeunes
    expect(sug.memberId).toBe(coach.id);
  });

  it('does not impact member remaining balance when linking a non-membership transaction (e.g. cordage)', async () => {
    const mockD1 = await setupMockDb();
    const db = drizzle(mockD1 as any);

    // 1. Ajouter un adhérent
    const m = await db.insert(membersTable).values({
      licence: '1234567',
      season: '25-26',
      lastName: 'PIGNON',
      firstName: 'Eliot',
      gender: 'M',
      birthDate: '2010-01-01',
      status: 'valide',
      type: 'Loisir',
      amountDue: 25000,
      amountReceived: 0,
      amountRemaining: 25000,
      importedAt: new Date()
    }).returning().then(r => r[0]);

    // 2. Insérer une transaction bancaire de cordage (15.00 €)
    const bt = await db.insert(bankTransactionsTable).values({
      fitid: 'TEST-CORDAGE-BT',
      seasonId: '25-26',
      accountId: 'current',
      amount: 1500,
      date: '2026-02-02',
      name: 'VIR INST RE 653287691266',
      memo: 'DE: MLE ARTICO LUCIE MOTIF: Cordage',
      status: 'pending',
      createdAt: new Date()
    }).returning().then(r => r[0]);

    // 3. Réaliser le pointage avec la catégorie 'cordage_vente'
    const reconRes = await app.request(`http://localhost/bank-transactions/${bt.id}/reconcile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create',
        btId: bt.id,
        memberId: m.id,
        transaction: {
          seasonId: '25-26',
          type: 'recette',
          accountId: 'current',
          category: 'cordage_vente',
          amount: 1500,
          date: '2026-02-02',
          paymentMethod: 'virement',
          description: 'Achat cordage Eliot PIGNON',
          memberId: m.id,
          reference: 'FITID-CORDAGE'
        }
      })
    }, { DB: mockD1 as any });
    expect(reconRes.status).toBe(200);

    // 4. Vérifier que l'adhérent a son solde d'adhésion inchangé (toujours 250.00 € restant, amountReceived à 0)
    const updatedMember = await db.select().from(membersTable).where(eq(membersTable.id, m.id)).get();
    expect(updatedMember.amountReceived).toBe(0);
    expect(updatedMember.amountRemaining).toBe(25000);
    expect(updatedMember.paid).toBe(false);

    // 5. Récupérer la transaction créée
    const createdTx = await db.select().from(transactionsTable).where(eq(transactionsTable.bankTransactionId, bt.id)).get();
    expect(createdTx).toBeDefined();

    // 6. Supprimer cette transaction
    const deleteRes = await app.request(`http://localhost/transactions/${createdTx.id}`, {
      method: 'DELETE'
    }, { DB: mockD1 as any });
    expect(deleteRes.status).toBe(200);

    // 7. Vérifier que le solde de l'adhérent est toujours inchangé et n'a pas été déduit négativement
    const finalMember = await db.select().from(membersTable).where(eq(membersTable.id, m.id)).get();
    expect(finalMember.amountReceived).toBe(0);
    expect(finalMember.amountRemaining).toBe(25000);
  });

  it('supports checks and check-deposits workflow endpoints', async () => {
    const mockD1 = await setupMockDb();
    const db = drizzle(mockD1 as any);

    // 1. Ajouter un adhérent
    const m = await db.insert(membersTable).values({
      licence: '7766554',
      season: '25-26',
      lastName: 'DUPONT',
      firstName: 'Jean',
      gender: 'M',
      birthDate: '1995-05-05',
      status: 'valide',
      type: 'Adulte',
      amountDue: 26000,
      amountReceived: 0,
      amountRemaining: 26000,
      importedAt: new Date()
    }).returning().then(r => r[0]);

    // 2. Insérer un chèque via POST /checks (Catégorie adhésion)
    const checkPostRes = await app.request('http://localhost/checks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seasonId: '25-26',
        number: '8877665',
        amount: 26000, // 260.00 €
        emitter: 'Jean Dupont',
        bank: 'Bred',
        memberId: m.id,
        category: 1,
        date: '2026-07-10'
      })
    }, { DB: mockD1 as any });
    expect(checkPostRes.status).toBe(200);

    // 3. Vérifier que la fiche de l'adhérent a été mise à jour (réglée)
    const updatedMember = await db.select().from(membersTable).where(eq(membersTable.id, m.id)).get();
    expect(updatedMember.amountReceived).toBe(26000);
    expect(updatedMember.amountRemaining).toBe(0);
    expect(updatedMember.paid).toBe(true);

    // 4. Récupérer le chèque via GET /checks
    const getRes = await app.request('http://localhost/checks?season=25-26&status=received', undefined, { DB: mockD1 as any });
    expect(getRes.status).toBe(200);
    const getBody = await getRes.json() as any;
    expect(getBody.data).toHaveLength(1);
    expect(getBody.data[0].number).toBe('8877665');
    expect(getBody.data[0].memberName).toBe('DUPONT Jean');

    const checkId = getBody.data[0].id;
    const txId = getBody.data[0].transactionId;
    const checkTx = await db.select().from(transactionsTable).where(eq(transactionsTable.id, txId)).get();
    expect(checkTx.date).toBe('2026-07-10');

    // 5. Créer un bordereau de remise de chèques
    const depositRes = await app.request('http://localhost/check-deposits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seasonId: '25-26',
        reference: 'REMISE-DE-TEST',
        date: '2026-07-13',
        checkIds: [checkId]
      })
    }, { DB: mockD1 as any });
    expect(depositRes.status).toBe(200);
    const depositBody = await depositRes.json() as any;
    expect(depositBody.data.amount).toBe(26000);

    const depositId = depositBody.data.id;

    // 6. Vérifier que le chèque est marqué comme 'deposited'
    const checkAfterDeposit = await db.select().from(checksTable).where(eq(checksTable.id, checkId)).get();
    expect(checkAfterDeposit.status).toBe('deposited');
    expect(checkAfterDeposit.checkDepositId).toBe(depositId);

    // 7. Simuler le rapprochement avec une transaction de relevé bancaire (id: 999)
    // On doit d'abord insérer cette transaction fictive ou simuler son existence
    await db.insert(bankTransactionsTable).values({
      id: 999,
      fitid: 'SG-DEPOT-999',
      seasonId: '25-26',
      accountId: 'current',
      amount: 26000,
      date: '2026-07-13',
      name: 'SG DEPOT CHEQUE',
      status: 'pending',
      createdAt: new Date()
    }).run();

    const clearRes = await app.request(`http://localhost/check-deposits/${depositId}/clear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bankTransactionId: 999
      })
    }, { DB: mockD1 as any });
    expect(clearRes.status).toBe(200);

    // Vérifier le statut de la remise
    const finalDeposit = await db.select().from(checkDepositsTable).where(eq(checkDepositsTable.id, depositId)).get();
    expect(finalDeposit.status).toBe('cleared');
    expect(finalDeposit.bankTransactionId).toBe(999);

    // 8. Supprimer le chèque
    const delCheckRes = await app.request(`http://localhost/checks/${checkId}`, {
      method: 'DELETE'
    }, { DB: mockD1 as any });
    expect(delCheckRes.status).toBe(200);

    // Vérifier que le chèque est supprimé et la fiche membre remise à zéro
    const deletedCheck = await db.select().from(checksTable).where(eq(checksTable.id, checkId)).get();
    expect(deletedCheck).toBeUndefined();

    const resetMember = await db.select().from(membersTable).where(eq(membersTable.id, m.id)).get();
    expect(resetMember.amountReceived).toBe(0);
    expect(resetMember.amountRemaining).toBe(26000);
    expect(resetMember.paid).toBe(false);
  });

  it('supports check photo vision OCR analysis with Workers AI mock', async () => {
    const mockD1 = await setupMockDb();
    const db = drizzle(mockD1 as any);

    // Ajouter un adhérent potentiel
    await db.insert(membersTable).values({
      licence: '7766554',
      season: '25-26',
      lastName: 'DUPONT',
      firstName: 'Jean',
      gender: 'M',
      birthDate: '1995-05-05',
      status: 'valide',
      type: 'Adulte',
      amountDue: 26000,
      amountReceived: 0,
      amountRemaining: 26000,
      importedAt: new Date()
    }).run();

    const mockAI = {
      run: async (model: string, input: any) => {
        return JSON.stringify({
          number: '8877665',
          amount: 260,
          emitter: 'JEAN DUPONT',
          bank: 'Société Générale',
          date: '2026-07-10'
        });
      }
    };

    const formData = new FormData();
    formData.append('file', new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' }), 'check.png');

    const req = new Request('http://localhost/checks/analyze', {
      method: 'POST',
      body: formData
    });

    const res = await app.request(req, undefined, { DB: mockD1 as any, AI: mockAI as any });

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
    expect(body.data.number).toBe('8877665');
    expect(body.data.emitter).toBe('JEAN DUPONT');
    expect(body.data.memberName).toBe('DUPONT Jean');
    expect(body.data.date).toBe('2026-07-10');
  });
});

describe('Products API Endpoints', () => {
  it('supports product CRUD operations', async () => {
    const mockD1 = await setupMockDb();

    // 1. Create a product (POST /products)
    const createRes = await app.request('http://localhost/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Yonex BG65', category: 'string', price: 1200, stock: 5 })
    }, { DB: mockD1 as any });

    expect(createRes.status).toBe(200);
    const createJson = await createRes.json() as any;
    expect(createJson.success).toBe(true);
    expect(createJson.data.name).toBe('Yonex BG65');
    expect(createJson.data.category).toBe('string');
    expect(createJson.data.price).toBe(1200);
    expect(createJson.data.stock).toBe(5);
    expect(createJson.data.active).toBe(true);
    expect(createJson.data.id).toBeDefined();

    const productId = createJson.data.id;

    // 2. Read products (GET /products)
    const listRes = await app.request('http://localhost/products', undefined, { DB: mockD1 as any });
    expect(listRes.status).toBe(200);
    const listJson = await listRes.json() as any;
    expect(listJson.success).toBe(true);
    expect(listJson.data).toHaveLength(1);
    expect(listJson.data[0].name).toBe('Yonex BG65');

    // Test GET /products with query filters
    const listResFilter1 = await app.request('http://localhost/products?category=string', undefined, { DB: mockD1 as any });
    const listJsonFilter1 = await listResFilter1.json() as any;
    expect(listJsonFilter1.data).toHaveLength(1);

    const listResFilter2 = await app.request('http://localhost/products?category=shuttlecock', undefined, { DB: mockD1 as any });
    const listJsonFilter2 = await listResFilter2.json() as any;
    expect(listJsonFilter2.data).toHaveLength(0);

    const listResFilter3 = await app.request('http://localhost/products?active=true', undefined, { DB: mockD1 as any });
    const listJsonFilter3 = await listResFilter3.json() as any;
    expect(listJsonFilter3.data).toHaveLength(1);

    // 3. Update a product (PUT /products/:id)
    const updateRes = await app.request(`http://localhost/products/${productId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Yonex BG65 Updated', price: 1500, stock: 10, active: false })
    }, { DB: mockD1 as any });

    expect(updateRes.status).toBe(200);
    const updateJson = await updateRes.json() as any;
    expect(updateJson.success).toBe(true);
    expect(updateJson.data.name).toBe('Yonex BG65 Updated');
    expect(updateJson.data.price).toBe(1500);
    expect(updateJson.data.stock).toBe(10);
    expect(updateJson.data.active).toBe(false);

    // Verify it is updated in DB listing
    const verifyRes = await app.request('http://localhost/products?active=false', undefined, { DB: mockD1 as any });
    const verifyJson = await verifyRes.json() as any;
    expect(verifyJson.data).toHaveLength(1);
    expect(verifyJson.data[0].name).toBe('Yonex BG65 Updated');
  });
});

describe('Orders API Endpoints', () => {
  it('processes orders and creates transaction on approval', async () => {
    const mockD1 = await setupMockDb();
    const db = drizzle(mockD1 as any);

    // Insert a season
    await db.insert(seasonsTable).values({
      id: '25-26',
      name: 'Saison 2025-2026',
      active: true,
      createdAt: new Date()
    }).onConflictDoNothing().run();

    // Insert a member
    await db.insert(membersTable).values({
      id: 1,
      licence: '1234567',
      season: '25-26',
      lastName: 'Dupont',
      firstName: 'Jean',
      gender: 'M',
      birthDate: '1990-01-01',
      status: 'valide',
      type: 'Competiteur',
      amountDue: 25000,
      amountReceived: 0,
      amountRemaining: 25000,
      importedAt: new Date()
    }).run();

    // Insert a product with stock = 5
    await db.insert(productsTable).values({
      id: 1,
      name: 'Yonex BG65',
      category: 'string' as any,
      price: 1200,
      stock: 5,
      active: true,
      createdAt: new Date()
    }).run();
    // 1. Post order
    const res = await app.request('http://localhost/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seasonId: '25-26', memberId: 1, productId: 1, quantity: 2, paymentMethod: 'virement' })
    }, { DB: mockD1 as any });
    expect(res.status).toBe(200);
    const orderJson = await res.json() as any;
    expect(orderJson.success).toBe(true);
    expect(orderJson.data.status).toBe('pending');
    expect(orderJson.data.totalAmount).toBe(2400); // 1200 * 2

    // 2. Approve
    const appRes = await app.request(`http://localhost/orders/${orderJson.data.id}/approve`, {
      method: 'POST'
    }, { DB: mockD1 as any });
    expect(appRes.status).toBe(200);
    const json = await appRes.json() as any;
    expect(json.data.status).toBe('approved');
    expect(json.data.transactionId).toBeDefined();

    // 3. Verify stock is unchanged
    const updatedProd = await db.select().from(productsTable).where(eq(productsTable.id, 1)).get();
    expect(updatedProd.stock).toBe(5);

    // 4. Verify transaction is created
    const tx = await db.select().from(transactionsTable).where(eq(transactionsTable.id, json.data.transactionId)).get();
    expect(tx).toBeDefined();
    expect(tx.amount).toBe(2400);
    expect(tx.category).toBe('boutique');
    expect(tx.memberId).toBe(1);

    // 5. Test GET /orders
    const getRes = await app.request('http://localhost/orders?season=25-26', undefined, { DB: mockD1 as any });
    expect(getRes.status).toBe(200);
    const getJson = await getRes.json() as any;
    expect(getJson.success).toBe(true);
    expect(getJson.data).toHaveLength(1);
    expect(getJson.data[0].order.id).toBe(orderJson.data.id);
    expect(getJson.data[0].member.lastName).toBe('Dupont');
    expect(getJson.data[0].product.name).toBe('Yonex BG65');
  });

  it('supports rejecting an order', async () => {
    const mockD1 = await setupMockDb();
    const db = drizzle(mockD1 as any);

    // Insert season, member, product
    await db.insert(seasonsTable).values({ id: '25-26', name: 'Saison 2025-2026', active: true, createdAt: new Date() }).onConflictDoNothing().run();
    await db.insert(membersTable).values({ id: 1, licence: '1234567', season: '25-26', lastName: 'Dupont', firstName: 'Jean', gender: 'M', birthDate: '1990-01-01', status: 'valide', type: 'Competiteur', amountDue: 25000, amountReceived: 0, amountRemaining: 25000, importedAt: new Date() }).run();
    await db.insert(productsTable).values({ id: 1, name: 'Yonex BG65', category: 'string' as any, price: 1200, stock: 5, active: true, createdAt: new Date() }).run();

    // 1. Create order
    const res = await app.request('http://localhost/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seasonId: '25-26', memberId: 1, productId: 1, quantity: 2, paymentMethod: 'virement' })
    }, { DB: mockD1 as any });
    const order = (await res.json() as any).data;

    // 2. Reject order
    const rejectRes = await app.request(`http://localhost/orders/${order.id}/reject`, {
      method: 'POST'
    }, { DB: mockD1 as any });
    expect(rejectRes.status).toBe(200);
    const rejectJson = await rejectRes.json() as any;
    expect(rejectJson.data.status).toBe('rejected');

    // 3. Verify stock is unchanged
    const prod = await db.select().from(productsTable).where(eq(productsTable.id, 1)).get();
    expect(prod.stock).toBe(5);

    // 4. Trying to approve rejected order should fail
    const approveRes = await app.request(`http://localhost/orders/${order.id}/approve`, {
      method: 'POST'
    }, { DB: mockD1 as any });
    expect(approveRes.status).toBe(400);

    // 5. Trying to reject already rejected order should fail
    const rejectRes2 = await app.request(`http://localhost/orders/${order.id}/reject`, {
      method: 'POST'
    }, { DB: mockD1 as any });
    expect(rejectRes2.status).toBe(400);
  });

  it('creates order even if quantity is greater than stock', async () => {
    const mockD1 = await setupMockDb();
    const db = drizzle(mockD1 as any);

    // Insert season, member, product
    await db.insert(seasonsTable).values({ id: '25-26', name: 'Saison 2025-2026', active: true, createdAt: new Date() }).onConflictDoNothing().run();
    await db.insert(membersTable).values({ id: 1, licence: '1234567', season: '25-26', lastName: 'Dupont', firstName: 'Jean', gender: 'M', birthDate: '1990-01-01', status: 'valide', type: 'Competiteur', amountDue: 25000, amountReceived: 0, amountRemaining: 25000, importedAt: new Date() }).run();
    await db.insert(productsTable).values({ id: 1, name: 'Yonex BG65', category: 'string' as any, price: 1200, stock: 1, active: true, createdAt: new Date() }).run();

    const res = await app.request('http://localhost/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seasonId: '25-26', memberId: 1, productId: 1, quantity: 2, paymentMethod: 'virement' })
    }, { DB: mockD1 as any });
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.success).toBe(true);
  });

  describe('Expenses API Endpoints', () => {
    it('supports creating, listing, approving and rejecting expenses', async () => {
      const mockD1 = await setupMockDb();
      const db = drizzle(mockD1 as any);

      // Insert season
      await db.insert(seasonsTable).values({ id: '25-26', name: 'Saison 2025-2026', active: true, createdAt: new Date() }).onConflictDoNothing().run();

      // 1. Create a pending expense report
      const res = await app.request('http://localhost/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seasonId: '25-26',
          description: 'Achat de cartons pour tournoi',
          category: 'materiel_club',
          amount: 4500, // 45.00 €
          photoUrl: 'justificatif_carton.jpg',
          emitterName: 'Marie Curie'
        })
      }, { DB: mockD1 as any });
      expect(res.status).toBe(200);
      const createJson = await res.json() as any;
      expect(createJson.success).toBe(true);
      expect(createJson.data.id).toBeDefined();
      expect(createJson.data.status).toBe('pending');
      expect(createJson.data.emitterName).toBe('Marie Curie');

      const expenseId = createJson.data.id;

      // 2. List expenses
      const listRes = await app.request('http://localhost/expenses?season=25-26', undefined, { DB: mockD1 as any });
      expect(listRes.status).toBe(200);
      const listJson = await listRes.json() as any;
      expect(listJson.success).toBe(true);
      expect(listJson.data).toHaveLength(1);
      expect(listJson.data[0].id).toBe(expenseId);

      // 3. Approve expense
      const approveRes = await app.request(`http://localhost/expenses/${expenseId}/approve`, {
        method: 'POST'
      }, { DB: mockD1 as any });
      expect(approveRes.status).toBe(200);
      const approveJson = await approveRes.json() as any;
      expect(approveJson.success).toBe(true);
      expect(approveJson.data.status).toBe('approved');
      expect(approveJson.data.transactionId).toBeDefined();

      // Verify transaction was created in compta
      const tx = await db.select().from(transactionsTable).where(eq(transactionsTable.id, approveJson.data.transactionId)).get();
      expect(tx).toBeDefined();
      expect(tx.type).toBe('depense');
      expect(tx.amount).toBe(4500);
      expect(tx.category).toBe(10);
      expect(tx.description).toContain('Remboursement frais - Marie Curie - Achat de cartons pour tournoi');

      // 4. Create another expense to test rejection
      const res2 = await app.request('http://localhost/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seasonId: '25-26',
          description: 'Repas de Noel',
          category: 'evenements_buvettes',
          amount: 8500,
          emitterName: 'Albert Einstein'
        })
      }, { DB: mockD1 as any });
      const expenseId2 = (await res2.json() as any).data.id;

      // Reject expense
      const rejectRes = await app.request(`http://localhost/expenses/${expenseId2}/reject`, {
        method: 'POST'
      }, { DB: mockD1 as any });
      expect(rejectRes.status).toBe(200);
      const rejectJson = await rejectRes.json() as any;
      expect(rejectJson.success).toBe(true);
      expect(rejectJson.data.status).toBe('rejected');

      // 5. Update expense
      const updateRes = await app.request(`http://localhost/expenses/${expenseId2}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: 'Repas de Noel avec buvette',
          category: 'evenements_buvettes',
          amount: 9000
        })
      }, { DB: mockD1 as any });
      expect(updateRes.status).toBe(200);
      const updateJson = await updateRes.json() as any;
      expect(updateJson.success).toBe(true);
      expect(updateJson.data.description).toBe('Repas de Noel avec buvette');
      expect(updateJson.data.amount).toBe(9000);

      // 6. Test cancellation of approved expense
      const cancelRes = await app.request(`http://localhost/expenses/${expenseId}/cancel`, {
        method: 'POST'
      }, { DB: mockD1 as any });
      expect(cancelRes.status).toBe(200);
      const cancelJson = await cancelRes.json() as any;
      expect(cancelJson.success).toBe(true);
      expect(cancelJson.data.status).toBe('pending');
      expect(cancelJson.data.transactionId).toBeNull();

      // Check associated transaction is deleted
      const txDeleted = await db.select().from(transactionsTable).where(eq(transactionsTable.id, approveJson.data.transactionId)).get();
      expect(txDeleted).toBeUndefined();

      // 7. Approve again to test transaction deletion cascading
      const approveResAgain = await app.request(`http://localhost/expenses/${expenseId}/approve`, {
        method: 'POST'
      }, { DB: mockD1 as any });
      const txIdAgain = (await approveResAgain.json() as any).data.transactionId;
      expect(txIdAgain).toBeDefined();

      // Delete the transaction directly in the ledger
      const deleteTxRes = await app.request(`http://localhost/transactions/${txIdAgain}`, {
        method: 'DELETE'
      }, { DB: mockD1 as any });
      expect(deleteTxRes.status).toBe(200);

      // Verify the expense claim status went back to pending
      const finalExpense = await db.select().from(expensesTable).where(eq(expensesTable.id, expenseId)).get();
      expect(finalExpense.status).toBe('pending');
      expect(finalExpense.transactionId).toBeNull();
    });
  });

  describe('Categories API Endpoints', () => {
    it('supports listing, creating, updating and deleting categories', async () => {
      const mockD1 = await setupMockDb();

      // 1. List default categories
      const res = await app.request('http://localhost/categories', undefined, { DB: mockD1 as any });
      expect(res.status).toBe(200);
      const listJson = await res.json() as any;
      expect(listJson.success).toBe(true);
      expect(listJson.data.length).toBeGreaterThanOrEqual(14);

      // 2. Create custom category
      const createRes = await app.request('http://localhost/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: 'custom_grip',
          adminLabel: 'Achat de grips et surgrips',
          adherentLabel: 'Grips & Accessoires',
          hideInExpenses: false
        })
      }, { DB: mockD1 as any });
      expect(createRes.status).toBe(200);
      const createJson = await createRes.json() as any;
      expect(createJson.success).toBe(true);
      expect(typeof createJson.data.id).toBe('number');

      const customGripId = createJson.data.id;

      // 3. Update category
      const updateRes = await app.request(`http://localhost/categories/${customGripId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminLabel: 'Grips (vente ou achat)',
          adherentLabel: 'Grips & Accessoires',
          hideInExpenses: true
        })
      }, { DB: mockD1 as any });
      expect(updateRes.status).toBe(200);
      const updateJson = await updateRes.json() as any;
      expect(updateJson.success).toBe(true);
      expect(updateJson.data.adminLabel).toBe('Grips (vente ou achat)');
      expect(updateJson.data.hideInExpenses).toBe(true);

      // 4. Delete category
      const deleteRes = await app.request(`http://localhost/categories/${customGripId}`, {
        method: 'DELETE'
      }, { DB: mockD1 as any });
      expect(deleteRes.status).toBe(200);
      const deleteJson = await deleteRes.json() as any;
      expect(deleteJson.success).toBe(true);
    });
  });
});

describe('Invoices and Attestation CSE API Endpoints', () => {
  it('manages invoices workflow endpoints and handles next sequential code generation', async () => {
    const mockD1 = await setupMockDb();
    const db = drizzle(mockD1 as any);

    // Ensure season exists and is not closed
    await db.insert(seasonsTable).values({
      id: '25-26',
      name: 'Saison 2025-2026',
      active: true,
      closed: false,
      createdAt: new Date()
    }).onConflictDoNothing().run();

    // Create a first invoice
    const createRes = await app.request('http://localhost/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seasonId: '25-26',
        date: '2026-07-14',
        dueDate: '2026-08-14',
        clientName: 'Ligue IDF',
        totalAmount: 12000,
        items: [{ description: 'Stage ligue', quantity: 2, unitPrice: 6000 }]
      })
    }, { DB: mockD1 as any });
    expect(createRes.status).toBe(200);
    const createData = await createRes.json() as any;
    expect(createData.data.invoiceNumber).toBe('FAC-2526-NBA91-0001');
    const invoiceId1 = createData.data.id;

    // Verify sequential increment
    const createRes2 = await app.request('http://localhost/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seasonId: '25-26',
        date: '2026-07-15',
        dueDate: '2026-08-15',
        clientName: 'Ligue IDF n2',
        totalAmount: 5000,
        items: []
      })
    }, { DB: mockD1 as any });
    const createData2 = await createRes2.json() as any;
    expect(createData2.data.invoiceNumber).toBe('FAC-2526-NBA91-0002');
    const invoiceId2 = createData2.data.id;

    // GET /invoices with season filter
    const getListRes = await app.request('http://localhost/invoices?season=25-26', undefined, { DB: mockD1 as any });
    expect(getListRes.status).toBe(200);
    const listData = await getListRes.json() as any;
    expect(listData.success).toBe(true);
    expect(listData.data).toHaveLength(2);

    // GET /invoices without season parameter (should return 400)
    const getListNoSeasonRes = await app.request('http://localhost/invoices', undefined, { DB: mockD1 as any });
    expect(getListNoSeasonRes.status).toBe(400);

    // GET /invoices/:id
    const getInvoiceRes = await app.request(`http://localhost/invoices/${invoiceId1}`, undefined, { DB: mockD1 as any });
    expect(getInvoiceRes.status).toBe(200);
    const invoiceData = await getInvoiceRes.json() as any;
    expect(invoiceData.success).toBe(true);
    expect(invoiceData.data.invoiceNumber).toBe('FAC-2526-NBA91-0001');
    expect(invoiceData.data.items).toHaveLength(1);
    expect(invoiceData.data.items[0].description).toBe('Stage ligue');

    // GET /invoices/:id not found
    const getInvoiceNotFoundRes = await app.request('http://localhost/invoices/99999', undefined, { DB: mockD1 as any });
    expect(getInvoiceNotFoundRes.status).toBe(404);

    // PUT /invoices/:id (update draft invoice)
    const updateRes = await app.request(`http://localhost/invoices/${invoiceId1}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: '2026-07-16',
        dueDate: '2026-08-16',
        clientName: 'Ligue IDF Updated',
        totalAmount: 18000,
        items: [
          { description: 'Stage ligue modifié', quantity: 3, unitPrice: 6000 }
        ]
      })
    }, { DB: mockD1 as any });
    expect(updateRes.status).toBe(200);
    
    // Verify changes
    const verifyRes = await app.request(`http://localhost/invoices/${invoiceId1}`, undefined, { DB: mockD1 as any });
    const verifyData = await verifyRes.json() as any;
    expect(verifyData.data.clientName).toBe('Ligue IDF Updated');
    expect(verifyData.data.date).toBe('2026-07-16');
    expect(verifyData.data.items).toHaveLength(1);
    expect(verifyData.data.items[0].description).toBe('Stage ligue modifié');

    // POST /invoices/:id/status (transition to sent)
    const statusRes = await app.request(`http://localhost/invoices/${invoiceId1}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'sent' })
    }, { DB: mockD1 as any });
    expect(statusRes.status).toBe(200);

    // Verify status update
    const verifyStatusRes = await app.request(`http://localhost/invoices/${invoiceId1}`, undefined, { DB: mockD1 as any });
    const verifyStatusData = await verifyStatusRes.json() as any;
    expect(verifyStatusData.data.status).toBe('sent');

    // PUT on non-draft should fail
    const updateNonDraftRes = await app.request(`http://localhost/invoices/${invoiceId1}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: '2026-07-16',
        dueDate: '2026-08-16',
        clientName: 'Ligue IDF Fail',
        totalAmount: 18000
      })
    }, { DB: mockD1 as any });
    expect(updateNonDraftRes.status).toBe(400);

    // DELETE on non-draft/non-cancelled should fail
    const deleteSentRes = await app.request(`http://localhost/invoices/${invoiceId1}`, {
      method: 'DELETE'
    }, { DB: mockD1 as any });
    expect(deleteSentRes.status).toBe(400);

    // Set status to cancelled
    await app.request(`http://localhost/invoices/${invoiceId1}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'cancelled' })
    }, { DB: mockD1 as any });

    // DELETE cancelled invoice should succeed
    const deleteRes = await app.request(`http://localhost/invoices/${invoiceId1}`, {
      method: 'DELETE'
    }, { DB: mockD1 as any });
    expect(deleteRes.status).toBe(200);

    // Verify it is deleted
    const verifyDeletedRes = await app.request(`http://localhost/invoices/${invoiceId1}`, undefined, { DB: mockD1 as any });
    expect(verifyDeletedRes.status).toBe(404);
  });

  it('handles closed seasons blocking invoice write operations', async () => {
    const mockD1 = await setupMockDb();
    const db = drizzle(mockD1 as any);

    // Create a closed season
    await db.insert(seasonsTable).values({
      id: '24-25',
      name: 'Saison 2024-2025',
      active: false,
      closed: true,
      createdAt: new Date()
    }).run();

    // Try to create invoice in closed season
    const createRes = await app.request('http://localhost/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seasonId: '24-25',
        date: '2025-07-14',
        dueDate: '2025-08-14',
        clientName: 'Ligue IDF',
        totalAmount: 12000
      })
    }, { DB: mockD1 as any });
    expect(createRes.status).toBe(400);
    const createData = await createRes.json() as any;
    expect(createData.error).toBe('Saison clôturée');

    // Create an open season to insert a draft invoice first
    await db.insert(seasonsTable).values({
      id: '25-26',
      name: 'Saison 2025-2026',
      active: true,
      closed: false,
      createdAt: new Date()
    }).onConflictDoUpdate({
      target: seasonsTable.id,
      set: { closed: false, active: true }
    }).run();

    const insertRes = await app.request('http://localhost/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seasonId: '25-26',
        date: '2026-07-14',
        dueDate: '2026-08-14',
        clientName: 'Ligue IDF',
        totalAmount: 12000
      })
    }, { DB: mockD1 as any });
    const invoice = (await insertRes.json() as any).data;

    // Now close the season
    await db.update(seasonsTable).set({ closed: true }).where(eq(seasonsTable.id, '25-26')).run();

    // Try to update invoice in closed season
    const updateRes = await app.request(`http://localhost/invoices/${invoice.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: '2026-07-15',
        dueDate: '2026-08-15',
        clientName: 'Ligue IDF Updated',
        totalAmount: 15000
      })
    }, { DB: mockD1 as any });
    expect(updateRes.status).toBe(400);

    // Try to change status in closed season
    const statusRes = await app.request(`http://localhost/invoices/${invoice.id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'sent' })
    }, { DB: mockD1 as any });
    expect(statusRes.status).toBe(400);

    // Try to delete in closed season
    const deleteRes = await app.request(`http://localhost/invoices/${invoice.id}`, {
      method: 'DELETE'
    }, { DB: mockD1 as any });
    expect(deleteRes.status).toBe(400);
  });

  it('manages CSE members attestation data retrieval', async () => {
    const mockD1 = await setupMockDb();
    const db = drizzle(mockD1 as any);

    // Ensure season exists
    await db.insert(seasonsTable).values({
      id: '25-26',
      name: 'Saison 2025-2026',
      active: true,
      closed: false,
      createdAt: new Date()
    }).onConflictDoNothing().run();

    // Create a member who has NOT paid fully
    await db.insert(membersTable).values({
      id: 10,
      licence: '1234500',
      season: '25-26',
      lastName: 'Durand',
      firstName: 'Alain',
      gender: 'M',
      birthDate: '1990-05-12',
      status: 'valide',
      type: 'Competiteur',
      amountDue: 25000,
      amountReceived: 10000,
      amountRemaining: 15000,
      paid: false,
      importedAt: new Date()
    }).run();

    // Create a member who HAS paid fully
    await db.insert(membersTable).values({
      id: 20,
      licence: '1234511',
      season: '25-26',
      lastName: 'Dupont',
      firstName: 'Marie',
      gender: 'F',
      birthDate: '1992-08-24',
      status: 'valide',
      type: 'Loisir',
      amountDue: 20000,
      amountReceived: 20000,
      amountRemaining: 0,
      paid: true,
      importedAt: new Date()
    }).run();

    // GET /members/:id/cse-data for non-existent member
    const notFoundRes = await app.request('http://localhost/members/999/cse-data', undefined, { DB: mockD1 as any });
    expect(notFoundRes.status).toBe(404);

    // GET /members/:id/cse-data for unpaid member (should return 400)
    const unpaidRes = await app.request('http://localhost/members/10/cse-data', undefined, { DB: mockD1 as any });
    expect(unpaidRes.status).toBe(400);
    const unpaidData = await unpaidRes.json() as any;
    expect(unpaidData.error).toBe("L'adhérent n'a pas entièrement réglé sa cotisation.");

    // GET /members/:id/cse-data for paid member but NO transaction yet
    const paidNoTxRes = await app.request('http://localhost/members/20/cse-data', undefined, { DB: mockD1 as any });
    expect(paidNoTxRes.status).toBe(200);
    const paidNoTxData = await paidNoTxRes.json() as any;
    expect(paidNoTxData.success).toBe(true);
    expect(paidNoTxData.data.lastName).toBe('Dupont');
    expect(paidNoTxData.data.paymentMethod).toBe('virement'); // Default fallback
    expect(paidNoTxData.data.paymentDate).toBe('date de validation'); // Default fallback

    // Add a transaction for Marie Dupont
    await db.insert(transactionsTable).values({
      id: 50,
      seasonId: '25-26',
      type: 'recette',
      accountId: 'current',
      category: 1, // adhesions_inscriptions
      amount: 20000,
      date: '2026-07-10',
      paymentMethod: 'cheque',
      description: 'Cotisation Marie Dupont',
      memberId: 20,
      createdAt: new Date()
    }).run();

    // GET /members/:id/cse-data for paid member WITH transaction
    const paidWithTxRes = await app.request('http://localhost/members/20/cse-data', undefined, { DB: mockD1 as any });
    expect(paidWithTxRes.status).toBe(200);
    const paidWithTxData = await paidWithTxRes.json() as any;
    expect(paidWithTxData.success).toBe(true);
    expect(paidWithTxData.data.paymentMethod).toBe('cheque');
    expect(paidWithTxData.data.paymentDate).toBe('2026-07-10');
    expect(paidWithTxData.data.amount).toBe(20000);
  });
});

describe('Final Improvements API checks', () => {
  it('should validate status values in POST /invoices/:id/status', async () => {
    const mockD1 = await setupMockDb();
    const db = drizzle(mockD1 as any);

    // Create an invoice
    const inv = await db.insert(invoicesTable).values({
      invoiceNumber: 'FAC-2526-NBA91-0020',
      seasonId: '25-26',
      date: '2026-07-14',
      dueDate: '2026-08-14',
      clientName: 'Client Test',
      totalAmount: 10000,
      status: 'draft',
      createdAt: new Date()
    }).returning().then(r => r[0]);

    // Send invalid status
    const res = await app.request(`http://localhost/invoices/${inv.id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'invalid_status_value' })
    }, { DB: mockD1 as any });

    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.success).toBe(false);
    expect(body.error).toBe('Statut invalide');

    // Send valid status
    const resValid = await app.request(`http://localhost/invoices/${inv.id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'sent' })
    }, { DB: mockD1 as any });

    expect(resValid.status).toBe(200);
    const bodyValid = await resValid.json() as any;
    expect(bodyValid.success).toBe(true);
  });

  it('should verify NaN IDs and return 400 for specific endpoints', async () => {
    const mockD1 = await setupMockDb();

    const endpoints = [
      { url: 'http://localhost/invoices/not-a-number', method: 'GET' },
      { url: 'http://localhost/invoices/not-a-number', method: 'PUT', body: {} },
      { url: 'http://localhost/invoices/not-a-number', method: 'DELETE' },
      { url: 'http://localhost/invoices/not-a-number/status', method: 'POST', body: { status: 'sent' } },
      { url: 'http://localhost/members/not-a-number/cse-data', method: 'GET' }
    ];

    for (const ep of endpoints) {
      const res = await app.request(ep.url, {
        method: ep.method,
        headers: ep.body ? { 'Content-Type': 'application/json' } : undefined,
        body: ep.body ? JSON.stringify(ep.body) : undefined
      }, { DB: mockD1 as any });

      expect(res.status).toBe(400);
      const body = await res.json() as any;
      expect(body).toEqual({ success: false, error: 'Identifiant invalide' });
    }
  });

  it('should lock reconciliation when the bank transaction season is closed', async () => {
    const mockD1 = await setupMockDb();
    const db = drizzle(mockD1 as any);

    // 1. Create a closed season
    await db.insert(seasonsTable).values({
      id: '24-25',
      name: 'Saison 2024-2025',
      active: false,
      closed: true,
      createdAt: new Date()
    }).run();

    // 2. Create bank transaction in closed season
    const bt = await db.insert(bankTransactionsTable).values({
      fitid: 'FITID-CLOSED-SEASON',
      accountId: 'current',
      seasonId: '24-25',
      amount: 15000,
      date: '2025-07-15',
      name: 'VIR RECU',
      status: 'pending',
      createdAt: new Date()
    }).returning().then(r => r[0]);

    // 3. Attempt to reconcile
    const res = await app.request(`http://localhost/bank-transactions/${bt.id}/reconcile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create',
        transaction: {
          seasonId: '24-25',
          type: 'recette',
          accountId: 'current',
          category: 7,
          amount: 15000,
          date: '2025-07-15',
          paymentMethod: 'virement',
          description: 'Fail reconcile'
        }
      })
    }, { DB: mockD1 as any });

    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.success).toBe(false);
    expect(body.error).toBe('La saison de l\'écriture bancaire est clôturée.');
  });

  it('should reject reconciliation if the invoice is already paid or cancelled', async () => {
    const mockD1 = await setupMockDb();
    const db = drizzle(mockD1 as any);

    // Create a paid invoice
    const invPaid = await db.insert(invoicesTable).values({
      invoiceNumber: 'FAC-2526-NBA91-0021',
      seasonId: '25-26',
      date: '2026-07-14',
      dueDate: '2026-08-14',
      clientName: 'Client Paid',
      totalAmount: 10000,
      status: 'paid',
      createdAt: new Date()
    }).returning().then(r => r[0]);

    // Create a cancelled invoice
    const invCancelled = await db.insert(invoicesTable).values({
      invoiceNumber: 'FAC-2526-NBA91-0022',
      seasonId: '25-26',
      date: '2026-07-14',
      dueDate: '2026-08-14',
      clientName: 'Client Cancelled',
      totalAmount: 10000,
      status: 'cancelled',
      createdAt: new Date()
    }).returning().then(r => r[0]);

    // Create bank transaction
    const bt = await db.insert(bankTransactionsTable).values({
      fitid: 'FITID-RECON-PAID',
      accountId: 'current',
      seasonId: '25-26',
      amount: 10000,
      date: '2026-07-15',
      name: 'VIR RECU',
      status: 'pending',
      createdAt: new Date()
    }).returning().then(r => r[0]);

    // 1. Attempt reconcile with already paid invoice
    const resPaid = await app.request(`http://localhost/bank-transactions/${bt.id}/reconcile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create',
        invoiceId: invPaid.id,
        transaction: {
          seasonId: '25-26',
          type: 'recette',
          accountId: 'current',
          category: 7,
          amount: 10000,
          date: '2026-07-15',
          paymentMethod: 'virement',
          description: 'Reconcile paid'
        }
      })
    }, { DB: mockD1 as any });

    expect(resPaid.status).toBe(400);
    const bodyPaid = await resPaid.json() as any;
    expect(bodyPaid.success).toBe(false);
    expect(bodyPaid.error).toBe('La facture a déjà été payée ou a été annulée.');

    // 2. Attempt reconcile with cancelled invoice
    const resCancelled = await app.request(`http://localhost/bank-transactions/${bt.id}/reconcile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create',
        invoiceId: invCancelled.id,
        transaction: {
          seasonId: '25-26',
          type: 'recette',
          accountId: 'current',
          category: 7,
          amount: 10000,
          date: '2026-07-15',
          paymentMethod: 'virement',
          description: 'Reconcile cancelled'
        }
      })
    }, { DB: mockD1 as any });

    expect(resCancelled.status).toBe(400);
    const bodyCancelled = await resCancelled.json() as any;
    expect(bodyCancelled.success).toBe(false);
    expect(bodyCancelled.error).toBe('La facture a déjà été payée ou a été annulée.');
  });
});

describe('Task 1: API Endpoints Advanced Reconciliation', () => {
  it('POST /bank-transactions/reconcile-bulk executes successfully when multiple valid suggestions are matched', async () => {
    const mockD1 = await setupMockDb();
    const db = drizzle(mockD1 as any);

    // Create active season '25-26'
    await db.insert(seasonsTable).values({
      id: '25-26',
      name: 'Saison 2025-2026',
      active: true,
      createdAt: new Date()
    }).onConflictDoNothing().run();

    // Create bank transactions
    const bt1 = await db.insert(bankTransactionsTable).values({
      fitid: 'FITID-BULK-1',
      accountId: 'current',
      seasonId: '25-26',
      amount: 10000,
      date: '2026-07-15',
      name: 'VIR RECU 1',
      status: 'pending',
      createdAt: new Date()
    }).returning().then(r => r[0]);

    const bt2 = await db.insert(bankTransactionsTable).values({
      fitid: 'FITID-BULK-2',
      accountId: 'current',
      seasonId: '25-26',
      amount: 20000,
      date: '2026-07-15',
      name: 'VIR RECU 2',
      status: 'pending',
      createdAt: new Date()
    }).returning().then(r => r[0]);

    // Send bulk reconcile request
    const res = await app.request('http://localhost/bank-transactions/reconcile-bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [
          {
            btId: bt1.id,
            action: 'create',
            transaction: {
              seasonId: '25-26',
              type: 'recette',
              accountId: 'current',
              category: 7,
              amount: 10000,
              date: '2026-07-15',
              paymentMethod: 'virement',
              description: 'Bulk Reconcile 1'
            }
          },
          {
            btId: bt2.id,
            action: 'create',
            transaction: {
              seasonId: '25-26',
              type: 'recette',
              accountId: 'current',
              category: 7,
              amount: 20000,
              date: '2026-07-15',
              paymentMethod: 'virement',
              description: 'Bulk Reconcile 2'
            }
          }
        ]
      })
    }, { DB: mockD1 as any });

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
    expect(body.count).toBe(2);

    // Verify bank transactions are reconciled
    const updatedBt1 = await db.select().from(bankTransactionsTable).where(eq(bankTransactionsTable.id, bt1.id)).get();
    const updatedBt2 = await db.select().from(bankTransactionsTable).where(eq(bankTransactionsTable.id, bt2.id)).get();
    expect(updatedBt1!.status).toBe('reconciled');
    expect(updatedBt2!.status).toBe('reconciled');

    // Verify ledger transactions were created
    const ledgerTxs = await db.select().from(transactionsTable).all();
    expect(ledgerTxs.filter(t => t.bankTransactionId === bt1.id)).toHaveLength(1);
    expect(ledgerTxs.filter(t => t.bankTransactionId === bt2.id)).toHaveLength(1);
  });

  it('POST /bank-transactions/reconcile-bulk rolls back all changes if one matching operation fails or is closed', async () => {
    const mockD1 = await setupMockDb();
    const db = drizzle(mockD1 as any);

    // Create seasons
    await db.insert(seasonsTable).values({
      id: '25-26',
      name: 'Saison 2025-2026',
      active: true,
      createdAt: new Date()
    }).onConflictDoNothing().run();

    await db.insert(seasonsTable).values({
      id: '24-25',
      name: 'Saison 2024-2025',
      active: false,
      closed: true,
      createdAt: new Date()
    }).onConflictDoNothing().run();

    // Create bank transactions
    const btValid = await db.insert(bankTransactionsTable).values({
      fitid: 'FITID-BULK-VALID',
      accountId: 'current',
      seasonId: '25-26',
      amount: 10000,
      date: '2026-07-15',
      name: 'VIR RECU VALID',
      status: 'pending',
      createdAt: new Date()
    }).returning().then(r => r[0]);

    const btClosed = await db.insert(bankTransactionsTable).values({
      fitid: 'FITID-BULK-CLOSED',
      accountId: 'current',
      seasonId: '24-25', // closed season
      amount: 20000,
      date: '2025-07-15',
      name: 'VIR RECU CLOSED',
      status: 'pending',
      createdAt: new Date()
    }).returning().then(r => r[0]);

    // Send bulk reconcile request
    const res = await app.request('http://localhost/bank-transactions/reconcile-bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [
          {
            btId: btValid.id,
            action: 'create',
            transaction: {
              seasonId: '25-26',
              type: 'recette',
              accountId: 'current',
              category: 7,
              amount: 10000,
              date: '2026-07-15',
              paymentMethod: 'virement',
              description: 'Valid Item'
            }
          },
          {
            btId: btClosed.id,
            action: 'create',
            transaction: {
              seasonId: '24-25', // closed season
              type: 'recette',
              accountId: 'current',
              category: 7,
              amount: 20000,
              date: '2025-07-15',
              paymentMethod: 'virement',
              description: 'Closed Item'
            }
          }
        ]
      })
    }, { DB: mockD1 as any });

    // Expecting error (e.g. 400 Bad Request or similar error status code)
    expect(res.status).not.toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(false);

    // Verify rollback: valid bt remains pending, no ledger transactions created
    const updatedBtValid = await db.select().from(bankTransactionsTable).where(eq(bankTransactionsTable.id, btValid.id)).get();
    expect(updatedBtValid!.status).toBe('pending');

    const ledgerTxs = await db.select().from(transactionsTable).all();
    expect(ledgerTxs).toHaveLength(0);
  });

  it('POST /bank-transactions/:id/reconcile successfully processes split transactions creating multiple entries', async () => {
    const mockD1 = await setupMockDb();
    const db = drizzle(mockD1 as any);

    await db.insert(seasonsTable).values({
      id: '25-26',
      name: 'Saison 2025-2026',
      active: true,
      createdAt: new Date()
    }).onConflictDoNothing().run();

    const bt = await db.insert(bankTransactionsTable).values({
      fitid: 'FITID-SPLIT',
      accountId: 'current',
      seasonId: '25-26',
      amount: 15000,
      date: '2026-07-15',
      name: 'VIR RECU SPLIT',
      status: 'pending',
      createdAt: new Date()
    }).returning().then(r => r[0]);

    // Send split reconcile request
    const res = await app.request(`http://localhost/bank-transactions/${bt.id}/reconcile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create',
        transactions: [
          {
            seasonId: '25-26',
            type: 'recette',
            accountId: 'current',
            category: 7,
            amount: 10000,
            date: '2026-07-15',
            paymentMethod: 'virement',
            description: 'Split 1'
          },
          {
            seasonId: '25-26',
            type: 'recette',
            accountId: 'current',
            category: 8,
            amount: 5000,
            date: '2026-07-15',
            paymentMethod: 'virement',
            description: 'Split 2'
          }
        ]
      })
    }, { DB: mockD1 as any });

    expect(res.status).toBe(200);

    // Verify bank transaction is reconciled
    const updatedBt = await db.select().from(bankTransactionsTable).where(eq(bankTransactionsTable.id, bt.id)).get();
    expect(updatedBt!.status).toBe('reconciled');

    // Verify multiple entries are created
    const ledgerTxs = await db.select().from(transactionsTable).where(eq(transactionsTable.bankTransactionId, bt.id)).all();
    expect(ledgerTxs).toHaveLength(2);
    expect(ledgerTxs.map(t => t.amount)).toContain(10000);
    expect(ledgerTxs.map(t => t.amount)).toContain(5000);
  });

  it('POST /bank-transactions/:id/reconcile successfully matches a single bank transaction to multiple invoiceIds', async () => {
    const mockD1 = await setupMockDb();
    const db = drizzle(mockD1 as any);

    await db.insert(seasonsTable).values({
      id: '25-26',
      name: 'Saison 2025-2026',
      active: true,
      createdAt: new Date()
    }).onConflictDoNothing().run();

    // Create 2 invoices
    const inv1 = await db.insert(invoicesTable).values({
      invoiceNumber: 'FAC-2526-NBA91-0101',
      seasonId: '25-26',
      date: '2026-07-14',
      dueDate: '2026-08-14',
      clientName: 'Client 1',
      totalAmount: 15000,
      status: 'sent',
      createdAt: new Date()
    }).returning().then(r => r[0]);

    const inv2 = await db.insert(invoicesTable).values({
      invoiceNumber: 'FAC-2526-NBA91-0102',
      seasonId: '25-26',
      date: '2026-07-14',
      dueDate: '2026-08-14',
      clientName: 'Client 2',
      totalAmount: 15000,
      status: 'sent',
      createdAt: new Date()
    }).returning().then(r => r[0]);

    const bt = await db.insert(bankTransactionsTable).values({
      fitid: 'FITID-MULTI-MATCH',
      accountId: 'current',
      seasonId: '25-26',
      amount: 30000,
      date: '2026-07-15',
      name: 'VIR RECU MULTI',
      status: 'pending',
      createdAt: new Date()
    }).returning().then(r => r[0]);

    // Send multi-match reconcile request
    const res = await app.request(`http://localhost/bank-transactions/${bt.id}/reconcile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create',
        invoiceIds: [inv1.id, inv2.id],
        transaction: {
          seasonId: '25-26',
          type: 'recette',
          accountId: 'current',
          category: 7,
          amount: 30000,
          date: '2026-07-15',
          paymentMethod: 'virement',
          description: 'Multi-match'
        }
      })
    }, { DB: mockD1 as any });

    expect(res.status).toBe(200);

    // Verify invoices are marked as paid and linked to bank transaction
    const updatedInv1 = await db.select().from(invoicesTable).where(eq(invoicesTable.id, inv1.id)).get();
    const updatedInv2 = await db.select().from(invoicesTable).where(eq(invoicesTable.id, inv2.id)).get();
    expect(updatedInv1!.status).toBe('paid');
    expect(updatedInv1!.bankTransactionId).toBe(bt.id);
    expect(updatedInv2!.status).toBe('paid');
    expect(updatedInv2!.bankTransactionId).toBe(bt.id);

    // Verify bank transaction is reconciled
    const updatedBt = await db.select().from(bankTransactionsTable).where(eq(bankTransactionsTable.id, bt.id)).get();
    expect(updatedBt!.status).toBe('reconciled');
  });

  it('POST /bank-transactions/:id/reconcile filters and sums only split transaction items that belong to the membership category', async () => {
    const mockD1 = await setupMockDb();
    const db = drizzle(mockD1 as any);

    await db.insert(seasonsTable).values({
      id: '25-26',
      name: 'Saison 2025-2026',
      active: true,
      createdAt: new Date()
    }).onConflictDoNothing().run();

    // Create a member who has NOT paid fully
    const m = await db.insert(membersTable).values({
      id: 30,
      licence: '1234599',
      season: '25-26',
      lastName: 'Martin',
      firstName: 'Sophie',
      gender: 'F',
      birthDate: '1995-03-15',
      status: 'valide',
      type: 'Competiteur',
      amountDue: 25000,
      amountReceived: 0,
      amountRemaining: 25000,
      paid: false,
      importedAt: new Date()
    }).returning().then(r => r[0]);

    const bt = await db.insert(bankTransactionsTable).values({
      fitid: 'FITID-SPLIT-MEMBER',
      accountId: 'current',
      seasonId: '25-26',
      amount: 15000,
      date: '2026-07-15',
      name: 'VIR RECU SPLIT MEMBER',
      status: 'pending',
      createdAt: new Date()
    }).returning().then(r => r[0]);

    // Send split reconcile request where:
    // - One transaction belongs to category 1 (adhesions_inscriptions) with amount 10000
    // - One transaction belongs to category 7 (cordage_vente) with amount 5000
    const res = await app.request(`http://localhost/bank-transactions/${bt.id}/reconcile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create',
        memberId: m.id,
        transactions: [
          {
            seasonId: '25-26',
            type: 'recette',
            accountId: 'current',
            category: 1, // membership category
            amount: 10000,
            date: '2026-07-15',
            paymentMethod: 'virement',
            description: 'Cotisation Split'
          },
          {
            seasonId: '25-26',
            type: 'recette',
            accountId: 'current',
            category: 7, // cordage_vente (not membership)
            amount: 5000,
            date: '2026-07-15',
            paymentMethod: 'virement',
            description: 'Cordage Split'
          }
        ]
      })
    }, { DB: mockD1 as any });

    expect(res.status).toBe(200);

    // Verify member amountReceived has only been incremented by the category 1 amount (10000)
    const updatedMember = await db.select().from(membersTable).where(eq(membersTable.id, m.id)).get();
    expect(updatedMember!.amountReceived).toBe(10000);
    expect(updatedMember!.amountRemaining).toBe(15000);
    expect(updatedMember!.paid).toBe(false);

    // Verify bank transaction is reconciled
    const updatedBt = await db.select().from(bankTransactionsTable).where(eq(bankTransactionsTable.id, bt.id)).get();
    expect(updatedBt!.status).toBe('reconciled');
  });
});





