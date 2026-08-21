import { personsTable } from '@nba/members/schema';
import { eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';

/**
 * Le portrait est une colonne de `persons` : il appartient à la personne, pas à son
 * adhésion de l'année. Il n'y a donc plus de table annexe à créer paresseusement —
 * `member_profiles` a fusionné dans `persons`, et une licence sans personne n'est pas un
 * adhérent du club.
 */
export class MemberPhotoRepository {
  async findByLicence(
    db: DbOrTx,
    licence: string
  ): Promise<{ photoKey: string | null; photoUpdatedAt: Date | null } | undefined> {
    return db
      .select({ photoKey: personsTable.photoKey, photoUpdatedAt: personsTable.photoUpdatedAt })
      .from(personsTable)
      .where(eq(personsTable.licence, licence))
      .get();
  }

  /** Rend `false` si la licence n'est pas celle d'un adhérent connu. */
  async savePhotoKey(db: DbOrTx, licence: string, photoKey: string | null, now: Date): Promise<boolean> {
    const updated = await db
      .update(personsTable)
      .set({ photoKey, photoUpdatedAt: photoKey ? now : null, updatedAt: now })
      .where(eq(personsTable.licence, licence))
      .returning({ id: personsTable.id })
      .all();
    return updated.length > 0;
  }
}
