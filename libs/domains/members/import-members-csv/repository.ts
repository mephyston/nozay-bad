import { inArray, eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { membersTable, seasonsTable } from '../shared/schema';

export class ImportMembersRepository {
  async insertSeasons(db: DbOrTx, seasons: (typeof seasonsTable.$inferInsert)[]): Promise<void> {
    for (const season of seasons) {
      await db.insert(seasonsTable)
        .values(season)
        .onConflictDoNothing()
        .run();
    }
  }

  async getSeasonIdMap(db: DbOrTx, seasonCodes: string[]): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    if (seasonCodes.length === 0) return map;

    const seasons = await db.select({ id: seasonsTable.id, code: seasonsTable.code })
      .from(seasonsTable)
      .where(inArray(seasonsTable.code, seasonCodes))
      .all();

    for (const s of seasons) {
      map.set(s.code, s.id);
    }
    return map;
  }

  async getExistingLicenceSeasons(db: DbOrTx, licences: string[], seasonIds: number[]): Promise<Set<string>> {
    const existingSet = new Set<string>();
    if (licences.length === 0 || seasonIds.length === 0) return existingSet;

    const chunkSize = 80;
    for (let i = 0; i < licences.length; i += chunkSize) {
      const chunk = licences.slice(i, i + chunkSize);
      const existing = await db.select({ licence: membersTable.licence, seasonId: membersTable.seasonId })
        .from(membersTable)
        .where(inArray(membersTable.licence, chunk))
        .all();
      existing.forEach((m) => existingSet.add(`${m.licence}-${m.seasonId}`));
    }
    return existingSet;
  }

  async batchUpsertMembers(db: DbOrTx, members: (typeof membersTable.$inferInsert)[]): Promise<void> {
    if (members.length === 0) return;

    const statements = members.map(member => {
      return db.insert(membersTable)
        .values(member)
        .onConflictDoUpdate({
          target: [membersTable.licence, membersTable.seasonId],
          set: {
            lastName: member.lastName,
            firstName: member.firstName,
            gender: member.gender,
            birthDate: member.birthDate,
            email: member.email,
            phone: member.phone,
            status: member.status,
            type: member.type,
            amountDueCents: member.amountDueCents,
            amountReceivedCents: member.amountReceivedCents,
            amountRemainingCents: member.amountRemainingCents,
            paid: member.paid,
            parent1Name: member.parent1Name,
            parent1Email: member.parent1Email,
            parent1Phone: member.parent1Phone,
            parent2Name: member.parent2Name,
            parent2Email: member.parent2Email,
            parent2Phone: member.parent2Phone,
            importedAt: member.importedAt
          }
        });
    });

    const chunkSize = 50;
    for (let i = 0; i < statements.length; i += chunkSize) {
      await (db as any).batch(statements.slice(i, i + chunkSize));
    }
  }
}
