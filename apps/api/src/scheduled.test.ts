import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { membersTable } from '@nba/members/schema';
import { seasonsTable } from '@nba/accounting/schema';
import { ordersTable, productsTable, productCategoriesTable } from '../../../libs/domains/shop/shared/schema';
import { pushMessagesTable } from '../../../libs/domains/notifications/shared/schema';
import { sendAwaitingPaymentOrderReminders } from './scheduled';

/** Le cron hebdomadaire tourne un lundi matin ; les dates du test s'y rapportent. */
const NOW = new Date('2026-03-16T08:00:00.000Z');

describe('relance des commandes en attente de paiement', () => {
  let db: any;
  let mockD1: any;
  let seasonId: number;
  let productId: number;
  let paymentMethodId: number;

  async function seedMember(values: { licence: string; email: string; parent1Email?: string }) {
    return db.insert(membersTable).values({
      licence: values.licence,
      seasonId,
      lastName: 'Dupont',
      firstName: 'Jean',
      gender: 'M',
      birthDate: '1990-05-15',
      email: values.email,
      parent1Email: values.parent1Email ?? null,
      status: 'valide',
      type: 'senior',
      importedAt: new Date(),
      createdAt: new Date()
    }).returning().get();
  }

  async function seedOrder(memberId: number, values: { status: string; awaitingPaymentSince: string | null }) {
    return db.insert(ordersTable).values({
      seasonId,
      memberId,
      productId,
      quantity: 1,
      totalAmountCents: 1500,
      paymentMethodId,
      status: values.status as any,
      awaitingPaymentSince: values.awaitingPaymentSince,
      createdAt: new Date()
    }).returning().get();
  }

  const reminders = async () =>
    (await db.select().from(pushMessagesTable).all()).filter(
      (m: any) => m.source === 'reminder:order-awaiting-payment'
    );

  beforeEach(async () => {
    const mock = await setupMockDb();
    db = mock.db;
    mockD1 = mock.mockD1;

    const season = await db.insert(seasonsTable).values({
      code: '25-26',
      name: 'Saison 2025-2026',
      startDate: '2025-09-01',
      endDate: '2026-08-31',
      active: true,
      closedAt: null,
      createdAt: new Date()
    }).returning().get();
    seasonId = season.id;

    const pmRes = await mockD1.prepare('SELECT id FROM payment_methods').all();
    paymentMethodId = pmRes.results[0].id as number;

    const catRes = await mockD1.prepare('SELECT id FROM categories').all();
    const productCategory = await db.insert(productCategoriesTable).values({
      label: 'Volants (test)',
      accountingCategoryId: catRes.results[0].id as number,
      createdAt: new Date()
    }).returning().get();

    const product = await db.insert(productsTable).values({
      name: 'Boîte Volants RSL',
      productCategoryId: productCategory.id,
      priceCents: 1500,
      stock: 10,
      active: true,
      createdAt: new Date()
    }).returning().get();
    productId = product.id;
  });

  it('relance une commande en attente depuis plus de sept jours', async () => {
    const member = await seedMember({ licence: '11111111', email: 'Jean.Dupont@Example.com' });
    await seedOrder(member.id, { status: 'awaiting_payment', awaitingPaymentSince: '2026-03-01' });

    await sendAwaitingPaymentOrderReminders(db, NOW);

    const messages = await reminders();
    expect(messages).toHaveLength(1);
    expect(messages[0].category).toBe('reminder');
    expect(messages[0].title).toBe('Commande à régler');
    expect(messages[0].url).toBe('/mon-compte');
  });

  it('laisse tranquille une commande validée dans la semaine', async () => {
    const member = await seedMember({ licence: '22222222', email: 'recent@example.com' });
    await seedOrder(member.id, { status: 'awaiting_payment', awaitingPaymentSince: '2026-03-14' });

    await sendAwaitingPaymentOrderReminders(db, NOW);

    expect(await reminders()).toHaveLength(0);
  });

  it('ignore les commandes qui ne sont pas en attente de paiement', async () => {
    const member = await seedMember({ licence: '33333333', email: 'autre@example.com' });
    await seedOrder(member.id, { status: 'created', awaitingPaymentSince: null });
    await seedOrder(member.id, { status: 'paid', awaitingPaymentSince: '2026-01-05' });
    await seedOrder(member.id, { status: 'cancelled', awaitingPaymentSince: null });

    await sendAwaitingPaymentOrderReminders(db, NOW);

    expect(await reminders()).toHaveLength(0);
  });

  it('ne renvoie rien si une relance est déjà partie dans les six derniers jours', async () => {
    const member = await seedMember({ licence: '44444444', email: 'jean@example.com' });
    await seedOrder(member.id, { status: 'awaiting_payment', awaitingPaymentSince: '2026-03-01' });

    // Un Cron Trigger peut être invoqué plusieurs fois pour la même échéance.
    await sendAwaitingPaymentOrderReminders(db, NOW);
    await sendAwaitingPaymentOrderReminders(db, new Date(NOW.getTime() + 60 * 1000));

    expect(await reminders()).toHaveLength(1);
  });

  it("n'envoie rien quand aucun contact n'est joignable", async () => {
    const member = await db.insert(membersTable).values({
      licence: '55555555',
      seasonId,
      lastName: 'Sans',
      firstName: 'Adresse',
      gender: 'F',
      birthDate: '2012-04-02',
      email: null,
      status: 'valide',
      type: 'jeune',
      importedAt: new Date(),
      createdAt: new Date()
    }).returning().get();
    await seedOrder(member.id, { status: 'awaiting_payment', awaitingPaymentSince: '2026-03-01' });

    await sendAwaitingPaymentOrderReminders(db, NOW);

    expect(await reminders()).toHaveLength(0);
  });

  it('relance aussi une commande validée avant le suivi de la date de mise en attente', async () => {
    const member = await seedMember({ licence: '66666666', email: 'legacy@example.com' });
    // Colonne nulle : la commande précède l'introduction du suivi, elle attend donc
    // depuis plus longtemps que le seuil par construction.
    await seedOrder(member.id, { status: 'awaiting_payment', awaitingPaymentSince: null });

    await sendAwaitingPaymentOrderReminders(db, NOW);

    expect(await reminders()).toHaveLength(1);
  });
});
