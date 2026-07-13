import { describe, it, expect } from 'vitest';
import { membersTable } from '../../../libs/shared/db/src/schema';
import { drizzle } from 'drizzle-orm/d1';
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
    const csvContent = `Licence;Nom;Prénom;Sexe;Date de naissance;Email;Téléphone;Statut;Type
1111111;Martin;Pierre;M;1985-05-15;pierre.martin@example.com;0600000001;valide;Competiteur
2222222;Bernard;Sophie;F;1990-10-20;sophie.bernard@example.com;0600000002;valide;Loisir
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
    expect(m1.importedAt).toBeInstanceOf(Date);

    // Now send another CSV with one update, one insert, and check counts
    const updateCsvContent = `Licence;Nom;Prénom;Sexe;Date de naissance;Email;Téléphone;Statut;Type
1111111;Martin Updated;Pierre;M;1985-05-15;pierre.martin.new@example.com;0600000099;suspendu;Competiteur
4444444;Petit;Lucas;M;1995-12-25;lucas.petit@example.com;;valide;Loisir`;

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
    const body = await res.json();
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
    const body = await res.json();
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
    const body = await res.json();
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
    const bodySearch = await resSearch.json();
    expect(bodySearch.data).toHaveLength(1);
    expect(bodySearch.data[0].firstName).toBe('Sophie');

    // Test search filter (lastName)
    const resSearchLast = await app.request('http://localhost/members?search=dupont', undefined, { DB: mockD1 as any });
    const bodySearchLast = await resSearchLast.json();
    expect(bodySearchLast.data).toHaveLength(1);
    expect(bodySearchLast.data[0].firstName).toBe('Jean');

    // Test search filter (licence)
    const resSearchLicence = await app.request('http://localhost/members?search=1000003', undefined, { DB: mockD1 as any });
    const bodySearchLicence = await resSearchLicence.json();
    expect(bodySearchLicence.data).toHaveLength(1);
    expect(bodySearchLicence.data[0].firstName).toBe('Luc');

    // Test type & gender filter
    const resFilter = await app.request('http://localhost/members?type=Competiteur&gender=M', undefined, { DB: mockD1 as any });
    const bodyFilter = await resFilter.json();
    expect(bodyFilter.data).toHaveLength(2); // Dupont and Durand
  });
});


