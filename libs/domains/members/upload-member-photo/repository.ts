import { memberProfilesTable } from '@nba/members/schema';
import { eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';

export class MemberPhotoRepository {
  async findByLicence(
    db: DbOrTx,
    licence: string
  ): Promise<typeof memberProfilesTable.$inferSelect | undefined> {
    return db.select().from(memberProfilesTable).where(eq(memberProfilesTable.licence, licence)).get();
  }

  /**
   * Crée le profil au besoin : la ligne n'existe qu'à partir du premier geste durable
   * de l'adhérent, l'import Poona n'en crée aucune.
   */
  async savePhotoKey(db: DbOrTx, licence: string, photoKey: string | null, now: Date): Promise<void> {
    await db
      .insert(memberProfilesTable)
      .values({
        licence,
        photoKey,
        photoUpdatedAt: photoKey ? now : null,
        createdAt: now,
        updatedAt: now
      })
      .onConflictDoUpdate({
        target: memberProfilesTable.licence,
        set: { photoKey, photoUpdatedAt: photoKey ? now : null, updatedAt: now }
      })
      .run();
  }
}
