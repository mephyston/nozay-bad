import { membersTable } from '@nba/members/schema';
import { getActiveSeasonId, getSeasonId, isSeasonClosed } from '@nba/accounting-api';
import { and, eq, inArray, or, sql } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';


export interface MemberSummary {
  id: number;
  licence: string;
  season: string;
  lastName: string;
  firstName: string;
  gender: 'M' | 'F';
  birthDate: string;
  email: string | null;
  phone: string | null;
  status: string;
  type: string;
  amountDue: number;
  amountReceived: number;
  amountRemaining: number;
  paid: boolean;
  expenseAuthorized: boolean;
}

export async function getMemberById(db: DbOrTx, id: number): Promise<MemberSummary | undefined> {
  const result = await db.select().from(membersTable).where(eq(membersTable.id, id)).get();
  return result as unknown as MemberSummary | undefined;
}

export async function getMembersByIds(db: DbOrTx, ids: number[]): Promise<MemberSummary[]> {
  if (ids.length === 0) return [];
  
  const chunkSize = 90;
  const results: any[] = [];
  
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const chunkResults = await db.select().from(membersTable).where(inArray(membersTable.id, chunk)).all();
    results.push(...chunkResults);
  }
  
  return results as unknown as MemberSummary[];
}

export async function getMembersBySeason(db: DbOrTx, seasonId: string | number): Promise<MemberSummary[]> {
  const numericId = await getSeasonId(db, seasonId);
  const condition = numericId !== undefined
    ? eq(membersTable.seasonId, numericId)
    : eq(membersTable.seasonId, seasonId as any);
  const result = await db.select().from(membersTable).where(condition).all();
  return result as unknown as MemberSummary[];
}

export async function getAllMembers(db: DbOrTx): Promise<MemberSummary[]> {
  const result = await db.select().from(membersTable).all();
  return result as unknown as MemberSummary[];
}

/**
 * Emails de contact d'un adhérent : le sien et ceux de ses représentants légaux.
 * Un adhérent mineur n'a pas d'email au dossier — c'est le parent qui détient le
 * compte du storefront, donc l'abonnement aux notifications.
 */
export async function getContactEmailsForMember(db: DbOrTx, memberId: number): Promise<string[]> {
  const row = await db
    .select({
      email: membersTable.email,
      parent1Email: membersTable.parent1Email,
      parent2Email: membersTable.parent2Email
    })
    .from(membersTable)
    .where(eq(membersTable.id, memberId))
    .get();
  if (!row) return [];

  const emails = new Set<string>();
  for (const value of [row.email, row.parent1Email, row.parent2Email]) {
    const normalized = value?.trim().toLowerCase();
    if (normalized) emails.add(normalized);
  }
  return [...emails];
}

/**
 * Emails de contact de plusieurs adhérents, dédupliqués.
 *
 * Une seule requête par lot plutôt qu'un aller-retour par adhérent : les appelants
 * sont des traitements programmés, où chaque requête D1 consomme une sous-requête du
 * Worker. Le lot reste sous le plafond de paramètres liés de D1.
 */
export async function getContactEmailsForMembers(db: DbOrTx, memberIds: number[]): Promise<string[]> {
  if (memberIds.length === 0) return [];

  const emails = new Set<string>();
  const unique = [...new Set(memberIds)];
  const chunkSize = 90;

  for (let i = 0; i < unique.length; i += chunkSize) {
    const rows = await db
      .select({
        email: membersTable.email,
        parent1Email: membersTable.parent1Email,
        parent2Email: membersTable.parent2Email
      })
      .from(membersTable)
      .where(inArray(membersTable.id, unique.slice(i, i + chunkSize)))
      .all();

    for (const row of rows) {
      for (const value of [row.email, row.parent1Email, row.parent2Email]) {
        const normalized = value?.trim().toLowerCase();
        if (normalized) emails.add(normalized);
      }
    }
  }

  return [...emails];
}

/**
 * Emails de contact des foyers de la saison active, normalisés en minuscules.
 *
 * Les emails des parents sont inclus : pour un adhérent mineur, l'adresse au
 * dossier est celle du représentant légal, et c'est elle qui porte le compte du
 * storefront. Consommé par le ciblage des notifications push.
 */
export async function getHouseholdEmailsForActiveSeason(
  db: DbOrTx,
  options: { unpaidOnly?: boolean; types?: string[] } = {}
): Promise<string[]> {
  const seasonId = await getActiveSeasonId(db);
  if (seasonId === undefined) return [];

  const conditions = [eq(membersTable.seasonId, seasonId)];
  if (options.unpaidOnly) {
    conditions.push(eq(membersTable.paid, false));
  }
  if (options.types) {
    // Une liste vide ne doit jamais dégénérer en « tout le club ».
    if (options.types.length === 0) return [];
    conditions.push(inArray(membersTable.type, options.types));
  }

  const rows = await db
    .select({
      email: membersTable.email,
      parent1Email: membersTable.parent1Email,
      parent2Email: membersTable.parent2Email
    })
    .from(membersTable)
    .where(and(...conditions))
    .all();

  const emails = new Set<string>();
  for (const row of rows) {
    for (const value of [row.email, row.parent1Email, row.parent2Email]) {
      const normalized = value?.trim().toLowerCase();
      if (normalized) emails.add(normalized);
    }
  }
  return [...emails];
}

export interface MemberGroup {
  /** Libellé du type d'adhésion, tel qu'importé de Poona. */
  type: string;
  members: number;
}

/**
 * Groupes d'adhésion de la saison active, avec leurs effectifs.
 *
 * Les libellés viennent de l'import Poona et ne sont pas normalisés : ils sont donc
 * lus en base plutôt que figés dans le code, sans quoi un intitulé renommé d'une
 * saison à l'autre deviendrait une cible vide et silencieuse.
 */
export async function getMemberGroupsForActiveSeason(db: DbOrTx): Promise<MemberGroup[]> {
  const seasonId = await getActiveSeasonId(db);
  if (seasonId === undefined) return [];

  const rows = await db
    .select({ type: membersTable.type, members: sql<number>`count(*)` })
    .from(membersTable)
    .where(eq(membersTable.seasonId, seasonId))
    .groupBy(membersTable.type)
    .orderBy(membersTable.type)
    .all();

  return rows.map((row) => ({ type: row.type, members: Number(row.members ?? 0) }));
}

export interface MemberBirthday {
  firstName: string;
  lastName: string;
  /** Âge atteint ce jour-là. */
  age: number;
}

/**
 * Adhérents de la saison active dont c'est l'anniversaire à la date donnée.
 *
 * `birth_date` est stocké au format ISO `YYYY-MM-DD` : on compare le suffixe
 * `MM-DD`. Un 29 février ne remonte donc que les années bissextiles — comportement
 * assumé, plutôt que de fêter l'anniversaire un jour arbitraire.
 */
export async function getBirthdaysForActiveSeason(db: DbOrTx, date: Date): Promise<MemberBirthday[]> {
  const seasonId = await getActiveSeasonId(db);
  if (seasonId === undefined) return [];

  const monthDay = `${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
  const rows = await db
    .select({
      firstName: membersTable.firstName,
      lastName: membersTable.lastName,
      birthDate: membersTable.birthDate
    })
    .from(membersTable)
    .where(
      and(eq(membersTable.seasonId, seasonId), sql`substr(${membersTable.birthDate}, 6) = ${monthDay}`)
    )
    .all();

  return rows
    .map((row) => ({
      firstName: row.firstName,
      lastName: row.lastName,
      age: date.getUTCFullYear() - Number(row.birthDate.slice(0, 4))
    }))
    .filter((row) => Number.isFinite(row.age) && row.age > 0);
}

export interface MemberContact {
  id: number;
  firstName: string;
  lastName: string;
  type: string;
  /** Adresse par laquelle ce dossier est joignable (la sienne ou celle d'un parent). */
  matchedEmail: string;
}

/**
 * Adhérents de la saison active joignables aux adresses fournies.
 *
 * Un même email peut couvrir plusieurs dossiers (fratrie) : la fonction renvoie une
 * ligne par adhérent, pas par adresse.
 */
export async function getMemberContactsByEmails(
  db: DbOrTx,
  emails: string[]
): Promise<MemberContact[]> {
  if (emails.length === 0) return [];
  const seasonId = await getActiveSeasonId(db);
  if (seasonId === undefined) return [];

  const contacts: MemberContact[] = [];
  // 3 comparaisons par email : on reste sous le plafond de 100 paramètres liés de D1.
  const chunkSize = 30;
  for (let i = 0; i < emails.length; i += chunkSize) {
    const chunk = emails.slice(i, i + chunkSize);
    const matchesChunk = chunk.map((email) =>
      or(
        sql`lower(${membersTable.email}) = ${email}`,
        sql`lower(${membersTable.parent1Email}) = ${email}`,
        sql`lower(${membersTable.parent2Email}) = ${email}`
      )
    );
    const rows = await db
      .select({
        id: membersTable.id,
        firstName: membersTable.firstName,
        lastName: membersTable.lastName,
        type: membersTable.type,
        email: membersTable.email,
        parent1Email: membersTable.parent1Email,
        parent2Email: membersTable.parent2Email
      })
      .from(membersTable)
      .where(and(eq(membersTable.seasonId, seasonId), or(...matchesChunk)))
      .all();

    for (const row of rows) {
      const matched = [row.email, row.parent1Email, row.parent2Email]
        .map((value) => value?.trim().toLowerCase())
        .find((value) => value && chunk.includes(value));
      if (matched) {
        contacts.push({
          id: row.id,
          firstName: row.firstName,
          lastName: row.lastName,
          type: row.type,
          matchedEmail: matched
        });
      }
    }
  }
  return contacts;
}

export { isSeasonClosed };

