import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { listProducts } from './handler';
import { productsTable, productCategoriesTable } from '../shared/schema';

/*
  Le catalogue selon qui le lit : le bureau voit tout ce qui est actif, la boutique des
  adhérents en retire ce qui lui est réservé — et une déclinaison suit son parent.
*/
describe('listProducts', () => {
  let db: any;
  let productCategoryId: number;

  async function seed(values: { name: string; active?: boolean; storefront?: boolean; parentId?: number; variantLabel?: string }) {
    return db.insert(productsTable).values({
      productCategoryId, priceCents: 2500, createdAt: new Date(), ...values
    }).returning().get();
  }

  beforeEach(async () => {
    const mock = await setupMockDb();
    db = mock.db;
    const cat = (await mock.mockD1.prepare('SELECT id FROM categories').all()).results[0];
    productCategoryId = (await db.insert(productCategoriesTable).values({
      label: 'Textile (test)', accountingCategoryId: cat.id, createdAt: new Date()
    }).returning().get()).id;

    const homme = await seed({ name: 'Maillot homme' });
    await seed({ name: 'Maillot homme', parentId: homme.id, variantLabel: 'M' });
    await seed({ name: 'Maillot homme', parentId: homme.id, variantLabel: 'L', storefront: false });
    const interclubs = await seed({ name: 'Maillot interclubs', storefront: false });
    await seed({ name: 'Maillot interclubs', parentId: interclubs.id, variantLabel: 'M' });
    const ancien = await seed({ name: 'Ancien maillot', active: false });
    await seed({ name: 'Ancien maillot', parentId: ancien.id, variantLabel: 'M' });
  });

  const noms = (rows: { displayName: string }[]) => rows.map((p) => p.displayName);

  it('donne au bureau tout ce qui est actif, réservé ou non à la boutique', async () => {
    expect(noms(await listProducts(db, { active: true }))).toEqual([
      'Maillot homme', 'Maillot homme — M', 'Maillot homme — L', 'Maillot interclubs', 'Maillot interclubs — M'
    ]);
  });

  it('retire de la boutique ce qui lui est réservé, et les déclinaisons du parent réservé', async () => {
    const vitrine = await listProducts(db, { active: true, storefront: true });
    expect(noms(vitrine)).toEqual(['Maillot homme', 'Maillot homme — M']);
    expect(vitrine.every((p) => p.storefront)).toBe(true);
  });

  it("rend tout le catalogue à l'écran des produits, avec l'état de chacun", async () => {
    const tout = await listProducts(db, {});
    expect(tout).toHaveLength(7);
    expect(tout.find((p) => p.displayName === 'Maillot interclubs')).toMatchObject({ active: true, storefront: false });
  });
});
