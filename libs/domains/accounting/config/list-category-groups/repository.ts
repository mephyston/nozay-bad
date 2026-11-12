import { type DbOrTx } from '@nba/db';
import { sql } from 'drizzle-orm';
import type { CategoryGroupOutput } from './dto';

export class ListCategoryGroupsRepository {
  async listCategoryGroups(db: DbOrTx): Promise<CategoryGroupOutput[]> {
    const rows = await db.all<{ id: number; kind: CategoryGroupOutput['kind']; label: string; position: number; membership_fees: number; category_count: number }>(sql`
      SELECT g.id, g.kind, g.label, g.position, g.membership_fees,
        (SELECT COUNT(*) FROM categories c WHERE c.pole_id = g.id OR c.rubrique_id = g.id) AS category_count
      FROM category_groups g
      ORDER BY g.kind, g.position, g.label
    `);
    return rows.map((r) => ({
      id: r.id,
      kind: r.kind,
      label: r.label,
      position: r.position,
      membershipFees: !!r.membership_fees,
      categoryCount: r.category_count
    }));
  }
}
