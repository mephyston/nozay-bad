import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { createOrder } from './handler';
import { productsTable, productCategoriesTable } from '../shared/schema';
import { seasonsTable } from '@nba/accounting/schema';
import { MemberNotEligibleError } from '../shared/errors';
import { insertMemberFixture } from '@nba/members/test-fixtures';

describe('createOrder handler (Eligibility & Validation)', () => {
  let db: any;
  let seasonId: number;
  let memberId: number;
  let productId: number;
  let paymentMethodCode: string;

  beforeEach(async () => {
    const mock = await setupMockDb();
    db = mock.db;

    const season = await db.insert(seasonsTable).values({
      code: '25-26', name: 'Saison 25-26', startDate: '2025-09-01', endDate: '2026-08-31', active: true, createdAt: new Date()
    }).returning().get();
    seasonId = season.id;

    const member = await insertMemberFixture(db, {
      licence: '111222', seasonId, lastName: 'Durand', firstName: 'Marie', gender: 'F', birthDate: '1995-03-20',
      status: 'valide', type: 'senior', paid: false, amountRemainingCents: 5000, importedAt: new Date()
    });
    memberId = member.id;

    const catRes = await mock.mockD1.prepare('SELECT id FROM categories').all();
    const cat = catRes.results;
    const pCat = await db.insert(productCategoriesTable).values({
      // `product_categories.label` est unique : le seed a déjà une famille « Volants ».
      label: 'Volants (test)', accountingCategoryId: cat[0].id, createdAt: new Date()
    }).returning().get();

    const product = await db.insert(productsTable).values({
      name: 'Boîte Volants', productCategoryId: pCat.id, priceCents: 1500, stock: 10, active: true, createdAt: new Date()
    }).returning().get();
    productId = product.id;

    const pmRes = await mock.mockD1.prepare('SELECT code FROM payment_methods').all();
    paymentMethodCode = pmRes.results[0].code as string;
  });

  it('1. Allows order creation for valid member even if installment payment is pending (paid = false)', async () => {
    const order = await createOrder(db, {
      seasonId, memberId, productId, quantity: 1, paymentMethod: paymentMethodCode
    });

    expect(order).toBeDefined();
    expect(order.status).toBe('created');
    expect(order.totalAmountCents).toBe(1500);
  });

  it('2. Rejects order creation if member is from a different season', async () => {
    const otherSeason = await db.insert(seasonsTable).values({
      code: '24-25', name: 'Saison 24-25', startDate: '2024-09-01', endDate: '2025-08-31', active: false, createdAt: new Date()
    }).returning().get();

    await expect(createOrder(db, {
      seasonId: otherSeason.id, memberId, productId, quantity: 1, paymentMethod: paymentMethodCode
    })).rejects.toThrowError(MemberNotEligibleError);
  });

  it('3. Rejects order creation if member status is not valide (e.g. suspendu)', async () => {
    const suspendedMember = await insertMemberFixture(db, {
      licence: '333444', seasonId, lastName: 'Martin', firstName: 'Paul', gender: 'M', birthDate: '1992-01-01',
      status: 'suspendu', type: 'senior', importedAt: new Date()
    });

    await expect(createOrder(db, {
      seasonId, memberId: suspendedMember.id, productId, quantity: 1, paymentMethod: paymentMethodCode
    })).rejects.toThrowError(MemberNotEligibleError);
  });

  /*
   * Règle du 27/09/2026 : la boutique s'ouvre dès le premier versement, comme l'espace
   * adhérent. Un paiement partiel commande ; rien de payé, non — et on dit pourquoi.
   */
  it('3b. Accepte un adhérent en paiement partiel', async () => {
    const partiel = await insertMemberFixture(db, {
      licence: '555666', seasonId, lastName: 'Durand', firstName: 'Camille', gender: 'F', birthDate: '1990-01-01',
      status: 'incomplet', type: 'senior', importedAt: new Date()
    });

    const order = await createOrder(db, { seasonId, memberId: partiel.id, productId, quantity: 1, paymentMethod: paymentMethodCode });
    expect(order.status).toBe('created');
  });

  it("3c. Refuse un adhérent qui n'a rien payé, en le disant en clair", async () => {
    const enAttente = await insertMemberFixture(db, {
      licence: '777888', seasonId, lastName: 'Petit', firstName: 'Léo', gender: 'M', birthDate: '1990-01-01',
      status: 'en_attente', type: 'senior', importedAt: new Date()
    });

    await expect(createOrder(db, { seasonId, memberId: enAttente.id, productId, quantity: 1, paymentMethod: paymentMethodCode }))
      .rejects.toThrowError("La cotisation de Léo n'a pas encore été réglée : la boutique s'ouvre dès le premier versement.");
  });

  it('4. Rejects order creation if paidAt is in the future', async () => {
    await expect(createOrder(db, {
      seasonId, memberId, productId, quantity: 1, paymentMethod: paymentMethodCode, paidAt: '2099-12-31'
    })).rejects.toThrowError("La date de paiement ne peut pas être postérieure à la date du jour.");
  });

  /*
   * Un moyen de paiement a deux volets : `active` le retire de partout, `storefront` de la
   * seule boutique des adhérents. Les deux se vérifient à la création, pas seulement dans
   * la liste proposée — une requête forgée ne doit pas les contourner.
   */
  it("refuse un moyen de paiement rendu inactif, à l'administration comme à la boutique", async () => {
    await db.run(`UPDATE payment_methods SET active = 0 WHERE code = '${paymentMethodCode}'`);
    await expect(createOrder(db, { seasonId, memberId, productId, quantity: 1, paymentMethod: paymentMethodCode })).rejects.toThrow("n'est plus proposé");
  });

  it("refuse à la boutique un moyen retiré du storefront, que l'administration garde", async () => {
    await db.run(`UPDATE payment_methods SET storefront = 0 WHERE code = '${paymentMethodCode}'`);
    await expect(
      createOrder(db, { seasonId, memberId, productId, quantity: 1, paymentMethod: paymentMethodCode }, { storefront: true })
    ).rejects.toThrow("n'est pas proposé dans la boutique");
    const order = await createOrder(db, { seasonId, memberId, productId, quantity: 1, paymentMethod: paymentMethodCode });
    expect(order.status).toBe('created');
  });

  /*
    `active` retire un article de partout, `storefront` de la seule boutique des
    adhérents : le bureau peut encore le commander pour quelqu'un. Une déclinaison suit
    son parent sur les deux.
  */
  it("refuse un article inactif, et une déclinaison dont le parent est inactif", async () => {
    await db.update(productsTable).set({ active: false }).run();
    await expect(createOrder(db, { seasonId, memberId, productId, quantity: 1, paymentMethod: paymentMethodCode })).rejects.toThrow("n'est plus proposé");

    const parent = await db.select().from(productsTable).get();
    const taille = await db.insert(productsTable).values({
      name: parent.name, productCategoryId: parent.productCategoryId, priceCents: 1500, parentId: parent.id, variantLabel: 'M', createdAt: new Date()
    }).returning().get();
    await expect(createOrder(db, { seasonId, memberId, productId: taille.id, quantity: 1, paymentMethod: paymentMethodCode })).rejects.toThrow("n'est plus proposé");
  });

  it("refuse un parent à déclinaisons : c'est une taille qu'on commande", async () => {
    const parent = await db.select().from(productsTable).get();
    await db.insert(productsTable).values({
      name: parent.name, productCategoryId: parent.productCategoryId, priceCents: 1500, parentId: parent.id, variantLabel: 'M', createdAt: new Date()
    }).run();
    await expect(createOrder(db, { seasonId, memberId, productId, quantity: 1, paymentMethod: paymentMethodCode })).rejects.toThrow('se décline');
  });

  it("refuse à la boutique un article réservé au bureau, que le bureau commande encore", async () => {
    await db.update(productsTable).set({ storefront: false }).run();
    const parent = await db.select().from(productsTable).get();
    const taille = await db.insert(productsTable).values({
      name: parent.name, productCategoryId: parent.productCategoryId, priceCents: 1500, parentId: parent.id, variantLabel: 'M', createdAt: new Date()
    }).returning().get();

    await expect(
      createOrder(db, { seasonId, memberId, productId: taille.id, quantity: 1, paymentMethod: paymentMethodCode }, { storefront: true })
    ).rejects.toThrow("n'est pas proposé dans la boutique");
    const order = await createOrder(db, { seasonId, memberId, productId: taille.id, quantity: 1, paymentMethod: paymentMethodCode });
    expect(order.status).toBe('created');
  });
});
