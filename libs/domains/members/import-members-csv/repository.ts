import { inArray } from 'drizzle-orm';
import { type DbOrTx } from '@metacult/shared-db';
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

  async getExistingLicenceSeasons(db: DbOrTx, licences: string[]): Promise<Set<string>> {
    const existingLicenceSeasons = new Set<string>();
    if (licences.length > 0) {
      const chunkSize = 80;
      for (let i = 0; i < licences.length; i += chunkSize) {
        const chunk = licences.slice(i, i + chunkSize);
        const existing = await db.select({ licence: membersTable.licence, season: membersTable.season })
          .from(membersTable)
          .where(inArray(membersTable.licence, chunk))
          .all();
        existing.forEach((m) => existingLicenceSeasons.add(`${m.licence}-${m.season}`));
      }
    }
    return existingLicenceSeasons;
  }

  async batchUpsertMembers(db: DbOrTx, members: (typeof membersTable.$inferInsert)[]): Promise<void> {
    if (members.length === 0) return;

    const importedAt = new Date();
    const batchPromises = members.map(member => {
      return db.insert(membersTable)
        .values({
          ...member,
          importedAt
        })
        .onConflictDoUpdate({
          target: [membersTable.licence, membersTable.season],
          set: {
            lastName: member.lastName,
            firstName: member.firstName,
            gender: member.gender,
            birthDate: member.birthDate,
            email: member.email,
            phone: member.phone,
            status: member.status,
            type: member.type,
            amountDue: member.amountDue,
            amountReceived: member.amountReceived,
            amountRemaining: member.amountRemaining,
            paid: member.paid,
            parent1Name: member.parent1Name,
            parent1Email: member.parent1Email,
            parent1Phone: member.parent1Phone,
            parent2Name: member.parent2Name,
            parent2Email: member.parent2Email,
            parent2Phone: member.parent2Phone,
            importedAt,
          }
        });
    });

    const batchChunkSize = 200;
    for (let i = 0; i < batchPromises.length; i += batchChunkSize) {
      const chunk = batchPromises.slice(i, i + batchChunkSize);
      for (const query of chunk) {
        await query.run();
      }
    }
  }
}
