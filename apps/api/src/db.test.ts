import { membersTable } from '@nba/members/schema';
import { seasonsTable } from '@nba/accounting/schema';
import { ledgerEntriesTable, categoriesTable } from '@nba/accounting/schema';
import { describe, it, expect } from 'vitest';
import { usersTable } from '../../../libs/domains/members/shared/schema';
import { seasonBalancesTable, bankStatementLinesTable, checkDepositsTable, checksTable, invoicesTable, invoiceItemsTable, accountClassesTable } from '../../../libs/domains/accounting/shared/schema';
import { productsTable, productCategoriesTable, ordersTable } from '../../../libs/domains/shop/shared/schema';
import { setupMockDb } from '@nba/db/test-utils';
import { eq } from 'drizzle-orm';

describe('Database Tests', () => {
  it('should run migrations and insert/retrieve a member and a user', async () => {
    const { db } = await setupMockDb();

    let season = await db.select().from(seasonsTable).get();
    if (!season) {
      season = await db.insert(seasonsTable).values({
        code: '25-26', name: 'Saison 2025-2026', startDate: '2025-09-01', endDate: '2026-08-31', active: true, createdAt: new Date()
      }).returning().get();
    }

    // Insert and verify a user
    const newUser = {
      email: 'admin@nozay-bad.fr',
      name: 'Admin',
      role: 'admin' as const,
      createdAt: new Date('2026-07-07T12:00:00Z'),
    };
    const userInsertResult = await db.insert(usersTable).values(newUser).run();
    expect(userInsertResult.success).toBe(true);

    const users = await db.select().from(usersTable).all();
    expect(users).toHaveLength(1);
    expect(users[0].email).toBe('admin@nozay-bad.fr');
    expect(users[0].name).toBe('Admin');
    expect(users[0].role).toBe('admin');

    // Insert a member
    const newMember = {
      seasonId: season.id,
      licence: '1234567',
      lastName: 'Dupont',
      firstName: 'Jean',
      gender: 'M' as const,
      birthDate: '1990-01-01',
      email: 'jean.dupont@example.com',
      phone: '0612345678',
      status: 'valide' as any,
      type: 'Competiteur',
      importedAt: new Date('2026-07-07T12:00:00Z'),
    };

    const insertResult = await db.insert(membersTable).values(newMember).run();
    expect(insertResult.success).toBe(true);

    // Retrieve the member
    const members = await db.select().from(membersTable).all();
    expect(members).toHaveLength(1);
    expect(members[0].licence).toBe('1234567');
    expect(members[0].seasonId).toBe(season.id);
    expect(members[0].lastName).toBe('Dupont');
    expect(members[0].firstName).toBe('Jean');
    expect(members[0].gender).toBe('M');
    expect(members[0].birthDate).toBe('1990-01-01');
    expect(members[0].email).toBe('jean.dupont@example.com');
    expect(members[0].phone).toBe('0612345678');
    expect(members[0].status).toBe('valide');
    expect(members[0].type).toBe('Competiteur');
    expect(members[0].importedAt).toBeInstanceOf(Date);
    expect(members[0].importedAt.getTime()).toBe(new Date('2026-07-07T12:00:00Z').getTime());
  });

  it('should insert season balances and transactions correctly', async () => {
    const { db } = await setupMockDb();

    let season = await db.select().from(seasonsTable).get();
    if (!season) {
      season = await db.insert(seasonsTable).values({
        code: '25-26', name: 'Saison 2025-2026', startDate: '2025-09-01', endDate: '2026-08-31', active: true, createdAt: new Date()
      }).returning().get();
    }

    // Insérer un solde initial
    const balance = {
      seasonId: season.id,
      accountId: 1,
      initialBalanceCents: 150000, // 1500,00 €
      createdAt: new Date()
    };
    const [insertedBalance] = await db.insert(seasonBalancesTable).values(balance).returning();
    expect(insertedBalance.initialBalanceCents).toBe(150000);

    // Insérer une transaction
    const transaction = {
      seasonId: season.id,
      type: 'recette' as const,
      accountId: 1,
      categoryId: 1,
      amountCents: 4500, // 45,00 €
      date: '2026-07-13',
      paymentMethodId: 1,
      description: 'Adhésion Dupont Jean',
      createdAt: new Date()
    };
    const [insertedTx] = await db.insert(ledgerEntriesTable).values(transaction).returning();
    expect(insertedTx.amountCents).toBe(4500);
    expect(insertedTx.categoryId).toBe(1);
  });

  it('should insert bank transactions correctly', async () => {
    const { db } = await setupMockDb();

    const op = {
      fitid: 'SG-123456-COURANT',
      accountId: 1,
      amountCents: -1560, // -15,60 €
      date: '2026-07-13',
      name: 'IONOS',
      memo: 'Facture Site Web',
      createdAt: new Date()
    };
    const [inserted] = await db.insert(bankStatementLinesTable).values(op).returning();
    expect(inserted.fitid).toBe('SG-123456-COURANT');
    expect(inserted.amountCents).toBe(-1560);
    expect(inserted.status).toBe('pending');
  });

  it('should support new member payment and transaction relation fields', async () => {
    const { db } = await setupMockDb();

    let season = await db.select().from(seasonsTable).get();
    if (!season) {
      season = await db.insert(seasonsTable).values({
        code: '25-26', name: 'Saison 2025-2026', startDate: '2025-09-01', endDate: '2026-08-31', active: true, createdAt: new Date()
      }).returning().get();
    }

    const [member] = await db.insert(membersTable).values({
      seasonId: season.id,
      licence: '7778889',
      lastName: 'Dupont',
      firstName: 'Jean',
      gender: 'M',
      birthDate: '2015-06-12',
      amountDueCents: 25000,
      amountReceivedCents: 10000,
      amountRemainingCents: 15000,
      paid: false,
      parent1Name: 'Dupont Marc',
      type: 'Competiteur',
      importedAt: new Date()
    }).returning();

    expect(member.amountDueCents).toBe(25000);
    expect(member.parent1Name).toBe('Dupont Marc');

    const [bt] = await db.insert(bankStatementLinesTable).values({
      fitid: 'FITID-RECONCILE-TEST',
      accountId: 1,
      amountCents: 10000,
      date: '2026-07-13',
      name: 'Virement Dupont',
      status: 'reconciled',
      createdAt: new Date()
    }).returning();

    const [tx] = await db.insert(ledgerEntriesTable).values({
      seasonId: season.id,
      type: 'recette',
      accountId: 1,
      categoryId: 1,
      amountCents: 10000,
      date: '2026-07-13',
      paymentMethodId: 1,
      description: 'Acompte Dupont Jean',
      memberId: member.id,
      bankStatementLineId: bt.id,
      createdAt: new Date()
    }).returning();

    expect(tx.memberId).toBe(member.id);
    expect(tx.bankStatementLineId).toBe(bt.id);
  });

  it('should support check deposits and checks insertion and linking', async () => {
    const { db } = await setupMockDb();

    let season = await db.select().from(seasonsTable).get();
    if (!season) {
      season = await db.insert(seasonsTable).values({
        code: '25-26', name: 'Saison 2025-2026', startDate: '2025-09-01', endDate: '2026-08-31', active: true, createdAt: new Date()
      }).returning().get();
    }

    // Insérer un dépôt de chèque
    const [deposit] = await db.insert(checkDepositsTable).values({
      seasonId: season.id,
      reference: 'REMISE-20260713-1',
      date: '2026-07-13',
      amountCents: 45000, // 450.00 €
      status: 'pending',
      createdAt: new Date()
    }).returning();

    expect(deposit.reference).toBe('REMISE-20260713-1');

    // Insérer des chèques liés à cette remise
    const [c1] = await db.insert(checksTable).values({
      checkDepositId: deposit.id,
      seasonId: season.id,
      number: '1234567',
      amountCents: 25000,
      emitter: 'Dupont Marc',
      bank: 'Société Générale',
      status: 'deposited',
      createdAt: new Date()
    }).returning();

    const [c2] = await db.insert(checksTable).values({
      checkDepositId: deposit.id,
      seasonId: season.id,
      number: '7654321',
      amountCents: 20000,
      emitter: 'Durand Julie',
      bank: 'Crédit Agricole',
      status: 'deposited',
      createdAt: new Date()
    }).returning();

    expect(c1.checkDepositId).toBe(deposit.id);
    expect(c1.number).toBe('1234567');
    expect(c2.amountCents).toBe(20000);

    const checks = await db.select().from(checksTable).all();
    expect(checks).toHaveLength(2);
  });

  it('should insert and query products and orders', async () => {
    const { db } = await setupMockDb();

    // Create product category first
    const pCat = await db.insert(productCategoriesTable).values({
      // Libellé propre au test : `product_categories.label` est unique et le seed
      // de référence fournit déjà une famille « Volants ».
      label: 'Volants (test)',
      accountingCategoryId: 1,
      createdAt: new Date()
    }).returning().get();

    const product = await db.insert(productsTable).values({
      name: 'RSL Grade 1',
      productCategoryId: pCat.id,
      priceCents: 1500,
      stock: 10,
      active: true,
      createdAt: new Date()
    }).returning().get();

    expect(product.id).toBeDefined();
    expect(product.name).toBe('RSL Grade 1');

    let season = await db.select().from(seasonsTable).get();
    if (!season) {
      season = await db.insert(seasonsTable).values({
        code: '25-26', name: 'Saison 2025-2026', startDate: '2025-09-01', endDate: '2026-08-31', active: true, createdAt: new Date()
      }).returning().get();
    }

    // Insert dependency tables for order referencing
    const [member] = await db.insert(membersTable).values({
      seasonId: season.id,
      licence: '1122334',
      lastName: 'Martin',
      firstName: 'Sophie',
      gender: 'F',
      birthDate: '1995-04-12',
      type: 'Loisir',
      importedAt: new Date()
    }).returning();

    const order = await db.insert(ordersTable).values({
      seasonId: season.id,
      memberId: member.id,
      productId: product.id,
      quantity: 2,
      totalAmountCents: 3000,
      paymentMethodId: 1,
      status: 'pending',
      createdAt: new Date()
    }).returning().get();

    expect(order.id).toBeDefined();
    expect(order.productId).toBe(product.id);
    expect(order.quantity).toBe(2);
    expect(order.totalAmountCents).toBe(3000);
  });

  it('should insert and query categories correctly', async () => {
    const { db } = await setupMockDb();

    // List seeded categories (our migration seeds 14 default categories)
    const list = await db.select().from(categoriesTable).all();
    expect(list.length).toBeGreaterThanOrEqual(14);

    const volantCat = list.find(c => c.adherentLabel === 'Volants');
    expect(volantCat).toBeDefined();
    expect(volantCat?.adminLabel).toBe('Volants');
    expect(volantCat?.adherentLabel).toBe('Volants');
    expect(volantCat?.hideInExpenses).toBe(false);

    const salaireCat = list.find(c => c.adminLabel === 'Salaires et Charges');
    expect(salaireCat).toBeDefined();
    expect(salaireCat?.hideInExpenses).toBe(true);
  });

  it('should support creating and querying account classes', async () => {
    const { db } = await setupMockDb();

    const testClass = {
      code: '99',
      label: '99 - Impôts et taxes',
      type: 'depense' as const,
      createdAt: new Date()
    };

    const insertResult = await db.insert(accountClassesTable).values(testClass).run();
    expect(insertResult.success).toBe(true);

    const list = await db.select().from(accountClassesTable).where(eq(accountClassesTable.code, '99')).all();
    expect(list).toHaveLength(1);
    expect(list[0].code).toBe('99');
    expect(list[0].label).toBe('99 - Impôts et taxes');
    expect(list[0].type).toBe('depense');
  });

  it('should support creating invoices and items', async () => {
    const { db } = await setupMockDb();

    let season = await db.select().from(seasonsTable).all().then(r => r.find(s => s.code === '25-26'));
    if (!season) {
      const insertedSeasons = await db.insert(seasonsTable).values({ code: '25-26', name: 'Saison 25-26', startDate: '2025-09-01', endDate: '2026-08-31', active: true, createdAt: new Date() }).returning();
      season = insertedSeasons[0];
    }
    const invoice = await db.insert(invoicesTable).values({
      invoiceNumber: 'FAC-2526-NBA91-0001',
      seasonId: season!.id,
      date: '2026-07-14',
      dueDate: '2026-08-14',
      clientName: 'Ligue IDF',
      totalAmountCents: 10000,
      createdAt: new Date()
    }).returning().then(r => r[0]);

    const item = await db.insert(invoiceItemsTable).values({
      invoiceId: invoice.id,
      description: 'Stage Jeunes',
      quantity: 1,
      unitPriceCents: 10000,
      totalPriceCents: 10000,
      createdAt: new Date()
    }).returning().then(r => r[0]);

    expect(invoice.id).toBeDefined();
    expect(item.id).toBeDefined();
  });
});
