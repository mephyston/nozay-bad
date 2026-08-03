import { membersTable } from '@nba/members/schema';
import { and, eq, or, sql } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { getActiveSeasonId } from '@nba/accounting-api';

export interface HouseholdMember {
  id: number;
  firstName: string;
  lastName: string;
  licence: string;
  paid: boolean;
  expenseAuthorized: boolean;
}

export interface HouseholdLookupResult {
  // Email au dossier vers lequel envoyer l'OTP (jamais renvoyé au client tel quel).
  accountEmail: string | null;
  members: HouseholdMember[];
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export class LookupHouseholdRepository {
  // Tous les adhérents dont l'email OU un email de parent/contact correspond (insensible à la casse),
  // restreint à la saison active si elle est configurée.
  private async membersByEmail(db: DbOrTx, email: string, seasonId?: number): Promise<HouseholdMember[]> {
    const emailMatch = or(
      sql`lower(${membersTable.email}) = ${email}`,
      sql`lower(${membersTable.parent1Email}) = ${email}`,
      sql`lower(${membersTable.parent2Email}) = ${email}`
    );
    const where = seasonId !== undefined ? and(emailMatch, eq(membersTable.seasonId, seasonId)) : emailMatch;
    const rows = await db
      .select({
        id: membersTable.id,
        firstName: membersTable.firstName,
        lastName: membersTable.lastName,
        licence: membersTable.licence,
        paid: membersTable.paid,
        expenseAuthorized: membersTable.expenseAuthorized
      })
      .from(membersTable)
      .where(where)
      .all();
    return rows as HouseholdMember[];
  }

  async lookup(db: DbOrTx, identifier: string): Promise<HouseholdLookupResult> {
    const raw = identifier.trim();
    if (!raw) return { accountEmail: null, members: [] };

    const activeSeasonId = await getActiveSeasonId(db);
    let accountEmail: string | null = null;

    if (raw.includes('@')) {
      accountEmail = normalizeEmail(raw);
    } else {
      // Identifiant = licence → on résout l'email au dossier, puis on débloque tout le foyer
      // rattaché à cet email (cohérent avec un login par email).
      const licenceConds = [eq(membersTable.licence, raw)];
      if (activeSeasonId !== undefined) licenceConds.push(eq(membersTable.seasonId, activeSeasonId));
      const member = await db
        .select({
          email: membersTable.email,
          parent1Email: membersTable.parent1Email,
          parent2Email: membersTable.parent2Email
        })
        .from(membersTable)
        .where(and(...licenceConds))
        .get();
      const found = member?.email || member?.parent1Email || member?.parent2Email || null;
      accountEmail = found ? normalizeEmail(found) : null;
    }

    if (!accountEmail) {
      return { accountEmail: null, members: [] };
    }

    const members = await this.membersByEmail(db, accountEmail, activeSeasonId);
    return { accountEmail, members };
  }
}
