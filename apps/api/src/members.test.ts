import { seasonsTable } from '@nba/accounting/schema';
import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { membersRouter } from '@nba/members-api';
import { setupMockDb } from '@nba/db/test-utils';

import { sql, eq } from 'drizzle-orm';
import { AppError } from '@nba/db';
import { insertMemberFixture, insertMemberFixtures, readMemberFixtures } from '@nba/members/test-fixtures';

const app = new Hono<{ Bindings: { DB: any } }>();
app.onError((err, c) => {
  if (err instanceof AppError || (err && (err as any).name === 'AppError')) {
    return c.json({ success: false, error: err.message }, (err as any).status || 400);
  }
  return c.json({ success: false, error: err.message }, 500);
});
app.route('/members', membersRouter);

describe('POST /members/import', () => {
  it('should reject file upload if Content-Length exceeds 5MB', async () => {
    const req = new Request('http://localhost/members/import', {
      method: 'POST',
      headers: {
        'Content-Length': (5 * 1024 * 1024 + 1).toString(),
      },
    });
    const res = await app.request(req);
    expect(res.status).toBe(413);
    const body = await res.json() as any;
    expect(body.success).toBe(false);
    expect(body.error).toContain('limite autorisée de 5 Mo');
  });
  it('should import members from valid CSV and handle inserts and updates', async () => {
    const { mockD1, db } = await setupMockDb();

    // Initial check: empty DB
    const initialMembers = await readMemberFixtures(db).all();
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
    const body = await res.json() as any;
    expect(body).toEqual({
      success: true,
      inserted: 2,
      updated: 0,
      errors: 1, // the third row has invalid format / missing fields
    });

    // Verify in database
    const dbMembers = await readMemberFixtures(db).all();
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
    expect(m1.amountDueCents).toBe(25000);
    expect(m1.amountReceivedCents).toBe(10000);
    expect(m1.amountRemainingCents).toBe(15000);
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
    const updateBody = await updateRes.json() as any;
    expect(updateBody).toEqual({
      success: true,
      inserted: 1,
      updated: 1,
      errors: 0,
    });

    // Verify in database again
    const finalMembers = await readMemberFixtures(db).all();
    expect(finalMembers).toHaveLength(3); // Pierre, Sophie, Lucas

    const m1Updated = finalMembers.find(m => m.licence === '1111111')!;
    expect(m1Updated.lastName).toBe('Martin Updated');
    expect(m1Updated.email).toBe('pierre.martin.new@example.com');
    expect(m1Updated.phone).toBe('0600000099');
    expect(m1Updated.status).toBe('suspendu');
    expect(m1Updated.amountDueCents).toBe(25000);
    expect(m1Updated.amountReceivedCents).toBe(25000);
    expect(m1Updated.amountRemainingCents).toBe(0);
    expect(m1Updated.paid).toBe(true);
  });

  it('should import members from a real Poona CSV export format and map headers/values correctly', async () => {
    const { mockD1, db } = await setupMockDb();

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
    const dbMembers = await readMemberFixtures(db).all();
    expect(dbMembers).toHaveLength(2);

    const m1 = dbMembers.find(m => m.licence === '07104079')!;
    expect(m1).toBeDefined();
    expect(m1.seasonId).toBeDefined();
    expect(m1.lastName).toBe('ABADIE');
    expect(m1.firstName).toBe('Christophe');
    expect(m1.gender).toBe('M'); // H mapped to M
    expect(m1.birthDate).toBe('1969-09-22'); // DD-MM-YYYY mapped to YYYY-MM-DD
    expect(m1.email).toBe('CA@SPECTRUMFR-DESIGN.COM');
    expect(m1.status).toBe('valide'); // Oui/Dossier finalisé mapped to valide
    expect(m1.amountDueCents).toBe(0);
    expect(m1.parent1Phone).toBe('+33682681335');
    expect(m1.parent1Name).toBeNull();

    const m2 = dbMembers.find(m => m.licence === '07684632')!;
    expect(m2).toBeDefined();
    expect(m2.seasonId).toBeDefined();
    expect(m2.gender).toBe('F');
    expect(m2.birthDate).toBe('2017-09-17');
    expect(m2.status).toBe('suspendu'); // Non/Dossier annulé mapped to suspendu
  });

  it("importe la « Date de paiement » Poona et ne l'efface pas au ré-import", async () => {
    const { mockD1, db } = await setupMockDb();

    const post = async (csv: string) => {
      const formData = new FormData();
      formData.append('file', new Blob([csv], { type: 'text/csv' }), 'poona.csv');
      const res = await app.request(new Request('http://localhost/members/import', { method: 'POST', body: formData }), undefined, {
        DB: mockD1 as any
      });
      expect(res.status).toBe(200);
    };

    const header = 'Saison;Adhérent validé;Sexe;Nom;Prénom;Licence;Date naissance;Payé;Date de paiement;Tarif';
    await post(
      `${header}
"25-26";"Oui";"H";"REGLE";"Paul";"07000001";"22-09-1969";"Oui";"18-06-2026";"Loisirs"
"25-26";"Oui";"F";"SANSDATE";"Anne";"07000002";"17-09-1990";"Oui";"";"Loisirs"`
    );

    const afterFirst = await readMemberFixtures(db).all();
    // JJ-MM-AAAA converti en ISO, comme la date de naissance.
    expect(afterFirst.find((m) => m.licence === '07000001')!.paymentDate).toBe('2026-06-18');
    // Colonne vide : le PDF retombera sur le 1er septembre de la saison.
    expect(afterFirst.find((m) => m.licence === '07000002')!.paymentDate).toBeNull();

    // Ré-import avec la colonne vide pour tout le monde : la date connue survit.
    await post(
      `${header}
"25-26";"Oui";"H";"REGLE";"Paul";"07000001";"22-09-1969";"Oui";"";"Loisirs"
"25-26";"Oui";"F";"SANSDATE";"Anne";"07000002";"17-09-1990";"Oui";"12-07-2026";"Loisirs"`
    );

    const afterSecond = await readMemberFixtures(db).all();
    expect(afterSecond).toHaveLength(2);
    expect(afterSecond.find((m) => m.licence === '07000001')!.paymentDate).toBe('2026-06-18');
    expect(afterSecond.find((m) => m.licence === '07000002')!.paymentDate).toBe('2026-07-12');
  });

  it('should return 400 when file is missing', async () => {
    const { mockD1 } = await setupMockDb();
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
    const { mockD1 } = await setupMockDb();
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
    const { mockD1, db } = await setupMockDb();

    let season = await db.select().from(seasonsTable).get();
    if (!season) {
      season = await db.insert(seasonsTable).values({
        code: '25-26', name: 'Saison 2025-2026', startDate: '2025-09-01', endDate: '2026-08-31', active: true, createdAt: new Date()
      }).returning().get();
    }
    const seasonId = season.id;

    // Insert dummy members
    await insertMemberFixtures(db, [
      { seasonId, licence: '1000001', lastName: 'Dupont', firstName: 'Jean', gender: 'M', birthDate: '1990-01-01', status: 'valide', type: 'Competiteur', importedAt: new Date() },
      { seasonId, licence: '1000002', lastName: 'Martin', firstName: 'Sophie', gender: 'F', birthDate: '1985-05-15', status: 'valide', type: 'Loisir', importedAt: new Date() },
      { seasonId, licence: '1000003', lastName: 'Durand', firstName: 'Luc', gender: 'M', birthDate: '1995-12-25', status: 'suspendu', type: 'Competiteur', importedAt: new Date() },
    ]);

    // Test simple list
    const res = await app.request('http://localhost/members?page=1&limit=2', undefined, { DB: mockD1 as any });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(2);
    expect(body.pagination).toEqual({
      page: 1,
      limit: 2,
      total: 3,
      totalPages: 2
    });

    // Test search filter
    const searchRes = await app.request('http://localhost/members?search=sophie', undefined, { DB: mockD1 as any });
    const searchBody = await searchRes.json() as any;
    expect(searchBody.data).toHaveLength(1);
    expect(searchBody.data[0].lastName).toBe('Martin');

    // Test search filter by licence
    const searchLicenceRes = await app.request('http://localhost/members?search=1000003', undefined, { DB: mockD1 as any });
    const searchLicenceBody = await searchLicenceRes.json() as any;
    expect(searchLicenceBody.data).toHaveLength(1);
    expect(searchLicenceBody.data[0].lastName).toBe('Durand');
  });

  it('should filter members by season', async () => {
    const { mockD1, db } = await setupMockDb();

    // Insert seasons
    const season2425 = await db.insert(seasonsTable).values({
      code: '24-25',
      name: 'Saison 2024-2025',
      startDate: '2024-09-01',
      endDate: '2025-08-31',
      active: false,
      createdAt: new Date()
    }).returning().get();

    let season2526 = await db.select().from(seasonsTable).where(eq(seasonsTable.code, '25-26')).get();
    if (!season2526) {
      season2526 = await db.insert(seasonsTable).values({
        code: '25-26',
        name: 'Saison 2025-2026',
        startDate: '2025-09-01',
        endDate: '2026-08-31',
        active: true,
        createdAt: new Date()
      }).returning().get();
    }

    // Insert dummy members in different seasons
    await insertMemberFixtures(db, [
      { seasonId: season2425.id, licence: '1000001', lastName: 'Dupont', firstName: 'Jean', gender: 'M', birthDate: '1990-01-01', status: 'valide', type: 'Competiteur', importedAt: new Date() },
      { seasonId: season2526.id, licence: '1000001', lastName: 'Dupont', firstName: 'Jean', gender: 'M', birthDate: '1990-01-01', status: 'valide', type: 'Competiteur', importedAt: new Date() },
      { seasonId: season2526.id, licence: '1000002', lastName: 'Martin', firstName: 'Sophie', gender: 'F', birthDate: '1985-05-15', status: 'valide', type: 'Loisir', importedAt: new Date() },
    ]);

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

  it('should filter members by payment status (paid=true/false)', async () => {
    const { mockD1, db } = await setupMockDb();

    let season = await db.select().from(seasonsTable).get();
    if (!season) {
      season = await db.insert(seasonsTable).values({
        code: '25-26', name: 'Saison 2025-2026', startDate: '2025-09-01', endDate: '2026-08-31', active: true, createdAt: new Date()
      }).returning().get();
    }
    const seasonId = season.id;

    // Insert dummy members with different payment status
    await insertMemberFixtures(db, [
      { seasonId, licence: '1000001', lastName: 'Dupont', firstName: 'Jean', gender: 'M', birthDate: '1990-01-01', status: 'valide', type: 'Competiteur', importedAt: new Date(), paid: true },
      { seasonId, licence: '1000002', lastName: 'Martin', firstName: 'Sophie', gender: 'F', birthDate: '1985-05-15', status: 'valide', type: 'Loisir', importedAt: new Date(), paid: false },
      { seasonId, licence: '1000003', lastName: 'Durand', firstName: 'Luc', gender: 'M', birthDate: '1995-12-25', status: 'suspendu', type: 'Competiteur', importedAt: new Date(), paid: false },
    ]);

    // Query for paid=true
    const resPaid = await app.request('http://localhost/members?paid=true', undefined, { DB: mockD1 as any });
    const bodyPaid = await resPaid.json() as any;
    expect(bodyPaid.data).toHaveLength(1);
    expect(bodyPaid.data[0].licence).toBe('1000001');

    // Query for paid=false
    const resUnpaid = await app.request('http://localhost/members?paid=false', undefined, { DB: mockD1 as any });
    const bodyUnpaid = await resUnpaid.json() as any;
    expect(bodyUnpaid.data).toHaveLength(2);
    const licences = bodyUnpaid.data.map((m: any) => m.licence);
    expect(licences).toContain('1000002');
    expect(licences).toContain('1000003');
  });
});

describe('GET /members/:licence', () => {
  it('should return member details if found', async () => {
    const { mockD1, db } = await setupMockDb();

    let season = await db.select().from(seasonsTable).get();
    if (!season) {
      season = await db.insert(seasonsTable).values({
        code: '25-26', name: 'Saison 2025-2026', startDate: '2025-09-01', endDate: '2026-08-31', active: true, createdAt: new Date()
      }).returning().get();
    }
    const seasonId = season.id;

    await insertMemberFixture(db, {
      seasonId,
      licence: '7654321',
      lastName: 'Lemoine',
      firstName: 'Paul',
      gender: 'M',
      birthDate: '1992-04-18',
      status: 'valide',
      type: 'Competiteur',
      importedAt: new Date()
    });

    const res = await app.request('http://localhost/members/7654321', undefined, { DB: mockD1 as any });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
    expect(body.data.firstName).toBe('Paul');
    expect(body.data.lastName).toBe('Lemoine');
  });

  it('should return 404 if member is not found', async () => {
    const { mockD1 } = await setupMockDb();
    const res = await app.request('http://localhost/members/9999999', undefined, { DB: mockD1 as any });
    expect(res.status).toBe(404);
  });
});

describe('/members/:id/cse-data', () => {
  it('manages CSE members attestation data retrieval', async () => {
    const { mockD1, db } = await setupMockDb();

    // Ensure season exists
    let season = await db.select().from(seasonsTable).get();
    if (!season) {
      season = await db.insert(seasonsTable).values({
        code: '25-26', name: 'Saison 2025-2026', startDate: '2025-09-01', endDate: '2026-08-31', active: true, createdAt: new Date()
      }).returning().get();
    }
    const seasonId = season.id;

    // Create a member who has NOT paid fully
    await insertMemberFixture(db, {
      id: 10,
      licence: '1234500',
      seasonId,
      lastName: 'Durand',
      firstName: 'Alain',
      gender: 'M',
      birthDate: '1990-05-12',
      status: 'valide',
      type: 'Competiteur',
      amountDueCents: 25000,
      amountReceivedCents: 10000,
      amountRemainingCents: 15000,
      paid: false,
      importedAt: new Date()
    });

    // Create a member who HAS paid fully
    await insertMemberFixture(db, {
      id: 20,
      licence: '1234511',
      seasonId,
      lastName: 'Dupont',
      firstName: 'Marie',
      gender: 'F',
      birthDate: '1992-08-24',
      status: 'valide',
      type: 'Loisir',
      amountDueCents: 20000,
      amountReceivedCents: 20000,
      amountRemainingCents: 0,
      paid: true,
      importedAt: new Date()
    });

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
    // Poona n'a pas exporté de date de paiement : le PDF retombera sur le 1er septembre.
    expect(paidNoTxData.data.paymentDate).toBe('');

    // Add a transaction for Marie Dupont
    await db.run(sql`
      INSERT INTO ledger_entries (id, season_id, type, account_id, category_id, amount_cents, date, payment_method_id, description, member_id, created_at)
      VALUES (50, 1, 'recette', 1, 1, 20000, '2026-07-10', 2, 'Cotisation Marie Dupont', 20, strftime('%s', 'now'))
    `);

    // GET /members/:id/cse-data for paid member WITH transaction
    const paidWithTxRes = await app.request('http://localhost/members/20/cse-data', undefined, { DB: mockD1 as any });
    expect(paidWithTxRes.status).toBe(200);
    const paidWithTxData = await paidWithTxRes.json() as any;
    expect(paidWithTxData.success).toBe(true);
    expect(paidWithTxData.data.paymentMethod).toBe('Chèque');
    // La date de l'écriture comptable ne fait pas date de paiement : c'est la saisie du
    // trésorier. Seule la colonne Poona `payment_date` alimente la date d'émission.
    expect(paidWithTxData.data.paymentDate).toBe('');
    expect(paidWithTxData.data.amount).toBe(20000);

    // Date de règlement renseignée par Poona : elle prime et devient la date d'émission.
    await db.run(sql`UPDATE memberships SET payment_date = '2026-06-18' WHERE id = 20`);
    const withPoonaDateRes = await app.request('http://localhost/members/20/cse-data', undefined, { DB: mockD1 as any });
    const withPoonaDateData = await withPoonaDateRes.json() as any;
    expect(withPoonaDateData.data.paymentDate).toBe('2026-06-18');
  });

  it('should verify NaN IDs and return 400 for members endpoint', async () => {
    const { mockD1 } = await setupMockDb();
    const res = await app.request('http://localhost/members/not-a-number/cse-data', {
      method: 'GET',
    }, { DB: mockD1 as any });

    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body).toEqual({ success: false, error: 'Identifiant invalide' });
  });

  it('should return 400 validation error when file field is completely missing in POST /members/import', async () => {
    const { mockD1 } = await setupMockDb();
    const formData = new FormData();
    formData.append('other_field', 'some_value'); // Completely missing "file" field

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
    expect(body.error).toContain('Validation failed');
  });
});
