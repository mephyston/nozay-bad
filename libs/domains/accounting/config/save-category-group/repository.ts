import { type Db } from '@nba/db';
import { and, eq, ne, sql } from 'drizzle-orm';
import { categoryGroupsTable, type CategoryGroupKind } from '../../shared/schema';

type GroupRow = typeof categoryGroupsTable.$inferSelect;

export class SaveCategoryGroupRepository {
  async findById(db: Db, id: number): Promise<GroupRow | undefined> {
    return db.select().from(categoryGroupsTable).where(eq(categoryGroupsTable.id, id)).get();
  }

  async findByLabel(db: Db, kind: CategoryGroupKind, label: string): Promise<GroupRow | undefined> {
    return db.select().from(categoryGroupsTable)
      .where(and(eq(categoryGroupsTable.kind, kind), eq(categoryGroupsTable.label, label))).get();
  }

  async nextPosition(db: Db, kind: CategoryGroupKind): Promise<number> {
    const row = await db.get<{ p: number | null }>(sql`SELECT MAX(position) AS p FROM category_groups WHERE kind = ${kind}`);
    return (row?.p ?? 0) + 1;
  }

  /**
   * Insère, ou met à jour, et retire le drapeau « cotisations » aux autres rubriques dans
   * le même lot : il n'y en a jamais deux, sans quoi l'indicateur ne saurait laquelle
   * rapporter au coût d'un adhérent.
   */
  async insert(db: Db, values: typeof categoryGroupsTable.$inferInsert): Promise<GroupRow> {
    const insert = db.insert(categoryGroupsTable).values(values).returning();
    if (!values.membershipFees) return (await insert.all())[0];
    const [, rows] = await db.batch([
      db.update(categoryGroupsTable).set({ membershipFees: false }).where(eq(categoryGroupsTable.kind, 'rubrique')),
      insert
    ]);
    return rows[0];
  }

  async update(db: Db, id: number, values: Partial<GroupRow>): Promise<GroupRow> {
    const update = db.update(categoryGroupsTable).set(values).where(eq(categoryGroupsTable.id, id)).returning();
    if (!values.membershipFees) return (await update.all())[0];
    const [, rows] = await db.batch([
      db.update(categoryGroupsTable).set({ membershipFees: false })
        .where(and(eq(categoryGroupsTable.kind, 'rubrique'), ne(categoryGroupsTable.id, id))),
      update
    ]);
    return rows[0];
  }
}
