import { memberClubFunctionsTable, membershipsTable, personsTable } from '@nba/members/schema';
import { getActiveSeasonId, getSeasonId, isSeasonClosed } from '@nba/accounting-api';
import { and, desc, eq, inArray, or, sql } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import type { ClubFunction } from './club-functions';


/**
 * Une adhésion, augmentée de l'identité de la personne qui la porte.
 *
 * `id` reste l'identifiant de l'**adhésion** — celui que stockent les commandes, les notes
 * de frais, les écritures comptables, les chèques et les inscriptions aux événements. Les
 * appelants qui le transmettent n'ont donc rien à changer. `personId` est nouveau : c'est
 * lui qui désigne la personne, stable d'une saison à l'autre.
 *
 * Les champs décrivent enfin ce que la requête rend vraiment. Le type promettait
 * auparavant `season`, `amountDue`, `amountReceived` et `amountRemaining`, qu'aucune des
 * fonctions de ce fichier n'a jamais renvoyés : les lignes étaient castées depuis un
 * `select()` complet et portaient `seasonId` et `amount*Cents`. Un appelant l'a payé —
 * l'analyse bancaire composait son invite avec `amountRemaining / 100`, soit `NaN`.
 */
export interface MemberSummary {
  id: number;
  personId: number;
  licence: string;
  seasonId: number;
  lastName: string;
  firstName: string;
  gender: 'M' | 'F';
  birthDate: string;
  email: string | null;
  phone: string | null;
  parent1Name: string | null;
  parent1Email: string | null;
  parent1Phone: string | null;
  parent2Name: string | null;
  parent2Email: string | null;
  parent2Phone: string | null;
  status: string;
  type: string;
  amountDueCents: number;
  amountReceivedCents: number;
  amountRemainingCents: number;
  paid: boolean;
  /** Date de règlement Poona, date d'émission de l'attestation CSE. */
  paymentDate: string | null;
  expenseAuthorized: boolean;
  /** Horodatage du dernier import Poona ayant touché l'adhésion. */
  importedAt: Date;
  /** Version du portrait, portée par la personne. `null` : aucune photo. */
  photoUpdatedAt: Date | null;
}

/** Projection unique de l'adhésion et de sa personne : une seule liste à tenir à jour. */
const memberColumns = {
  id: membershipsTable.id,
  personId: personsTable.id,
  licence: personsTable.licence,
  seasonId: membershipsTable.seasonId,
  lastName: personsTable.lastName,
  firstName: personsTable.firstName,
  gender: personsTable.gender,
  birthDate: personsTable.birthDate,
  email: personsTable.email,
  phone: personsTable.phone,
  parent1Name: personsTable.parent1Name,
  parent1Email: personsTable.parent1Email,
  parent1Phone: personsTable.parent1Phone,
  parent2Name: personsTable.parent2Name,
  parent2Email: personsTable.parent2Email,
  parent2Phone: personsTable.parent2Phone,
  status: membershipsTable.status,
  type: membershipsTable.type,
  amountDueCents: membershipsTable.amountDueCents,
  amountReceivedCents: membershipsTable.amountReceivedCents,
  amountRemainingCents: membershipsTable.amountRemainingCents,
  paid: membershipsTable.paid,
  paymentDate: membershipsTable.paymentDate,
  expenseAuthorized: membershipsTable.expenseAuthorized,
  importedAt: membershipsTable.importedAt,
  photoUpdatedAt: personsTable.photoUpdatedAt
} as const;

export const selectMembers = (db: DbOrTx) =>
  db
    .select(memberColumns)
    .from(membershipsTable)
    .innerJoin(personsTable, eq(personsTable.id, membershipsTable.personId));

/** Les trois adresses par lesquelles un dossier est joignable, désormais portées par la personne. */
const contactColumns = {
  email: personsTable.email,
  parent1Email: personsTable.parent1Email,
  parent2Email: personsTable.parent2Email
} as const;

function collectEmails(rows: { email: string | null; parent1Email: string | null; parent2Email: string | null }[]): string[] {
  const emails = new Set<string>();
  for (const row of rows) {
    for (const value of [row.email, row.parent1Email, row.parent2Email]) {
      const normalized = value?.trim().toLowerCase();
      if (normalized) emails.add(normalized);
    }
  }
  return [...emails];
}

export async function getMemberById(db: DbOrTx, id: number): Promise<MemberSummary | undefined> {
  return selectMembers(db).where(eq(membershipsTable.id, id)).get();
}

export async function getMembersByIds(db: DbOrTx, ids: number[]): Promise<MemberSummary[]> {
  if (ids.length === 0) return [];

  const chunkSize = 90;
  const results: MemberSummary[] = [];

  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    results.push(...(await selectMembers(db).where(inArray(membershipsTable.id, chunk)).all()));
  }

  return results;
}

export async function getMembersBySeason(db: DbOrTx, seasonId: string | number): Promise<MemberSummary[]> {
  const numericId = await getSeasonId(db, seasonId);
  const condition = numericId !== undefined
    ? eq(membershipsTable.seasonId, numericId)
    : eq(membershipsTable.seasonId, seasonId as never);
  return selectMembers(db).where(condition).all();
}

/**
 * Toutes les adhésions, toutes saisons confondues, la plus récente d'abord.
 *
 * Une personne réinscrite y figure autant de fois qu'elle a adhéré : c'est voulu, le seul
 * appelant (rapprochement de l'émetteur d'un chèque) a besoin d'un identifiant d'adhésion
 * pour imputer un règlement. Le tri est neuf : il retenait jusqu'ici la première ligne
 * rencontrée, donc une adhésion d'une saison quelconque ; désormais la plus récente gagne.
 */
export async function getAllMembers(db: DbOrTx): Promise<MemberSummary[]> {
  return selectMembers(db).orderBy(desc(membershipsTable.seasonId)).all();
}

/**
 * Emails de contact d'un adhérent : le sien et ceux de ses représentants légaux.
 * Un adhérent mineur n'a pas d'email au dossier — c'est le parent qui détient le
 * compte du storefront, donc l'abonnement aux notifications.
 *
 * L'argument reste un identifiant d'**adhésion** : tous les appelants en tiennent un.
 */
export async function getContactEmailsForMember(db: DbOrTx, memberId: number): Promise<string[]> {
  const row = await db
    .select(contactColumns)
    .from(membershipsTable)
    .innerJoin(personsTable, eq(personsTable.id, membershipsTable.personId))
    .where(eq(membershipsTable.id, memberId))
    .get();
  return row ? collectEmails([row]) : [];
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
      .select(contactColumns)
      .from(membershipsTable)
      .innerJoin(personsTable, eq(personsTable.id, membershipsTable.personId))
      .where(inArray(membershipsTable.id, unique.slice(i, i + chunkSize)))
      .all();
    for (const email of collectEmails(rows)) emails.add(email);
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

  const conditions = [eq(membershipsTable.seasonId, seasonId)];
  if (options.unpaidOnly) {
    conditions.push(eq(membershipsTable.paid, false));
  }
  if (options.types) {
    // Une liste vide ne doit jamais dégénérer en « tout le club ».
    if (options.types.length === 0) return [];
    conditions.push(inArray(membershipsTable.type, options.types));
  }

  const rows = await db
    .select(contactColumns)
    .from(membershipsTable)
    .innerJoin(personsTable, eq(personsTable.id, membershipsTable.personId))
    .where(and(...conditions))
    .all();

  return collectEmails(rows);
}

/**
 * Emails de contact des titulaires de fonctions au club sur une saison.
 *
 * Mêmes règles que `getContactEmailsForMember` : parents inclus (le compte storefront
 * d'un mineur est celui du représentant légal), minuscules, dédupliqués. Une seule
 * requête jointe — les appelants sont des traitements programmés où chaque requête D1
 * compte, et le bureau se compte sur les doigts d'une main.
 *
 * La fonction reste attribuée par licence : c'est par elle qu'on rejoint la personne, et
 * l'adhésion de la saison n'est là que pour écarter un dirigeant qui n'aurait pas repris
 * sa licence.
 *
 * `functions` absent = toutes les fonctions ; liste vide = personne (jamais de
 * dégénérescence en « tout le club », même garde que le ciblage par groupes).
 */
export async function getContactEmailsForClubFunctions(
  db: DbOrTx,
  season: string | number,
  functions?: ClubFunction[]
): Promise<string[]> {
  const seasonId = await getSeasonId(db, season);
  if (seasonId === undefined) return [];
  if (functions && functions.length === 0) return [];

  const conditions = [
    eq(memberClubFunctionsTable.seasonId, seasonId),
    eq(membershipsTable.seasonId, seasonId)
  ];
  if (functions) conditions.push(inArray(memberClubFunctionsTable.function, functions));

  const rows = await db
    .selectDistinct(contactColumns)
    .from(memberClubFunctionsTable)
    .innerJoin(personsTable, eq(personsTable.licence, memberClubFunctionsTable.licence))
    .innerJoin(membershipsTable, eq(membershipsTable.personId, personsTable.id))
    .where(and(...conditions))
    .all();

  return collectEmails(rows);
}

/**
 * Emails de contact d'une liste de licences, sur une saison.
 *
 * Mêmes règles que `getContactEmailsForClubFunctions` : parents inclus (le compte
 * storefront d'un mineur est celui du représentant légal), minuscules, dédupliqués. La
 * licence rejoint la personne, l'adhésion de la saison n'étant là que pour écarter
 * quelqu'un qui n'aurait pas repris sa licence.
 *
 * Liste vide = personne. Jamais de dégénérescence en « tout le club » : c'est la même
 * garde que le ciblage par groupes, et elle compte double ici — l'appelant est un
 * traitement programmé, personne ne relit ce qu'il envoie.
 *
 * Découpée en paquets : D1 plafonne le nombre de paramètres liés d'une requête, et rien
 * n'interdit au bureau de confier un badge à trente personnes.
 */
export async function getContactEmailsForLicences(
  db: DbOrTx,
  season: string | number,
  licences: string[]
): Promise<string[]> {
  if (licences.length === 0) return [];
  const seasonId = await getSeasonId(db, season);
  if (seasonId === undefined) return [];

  const emails = new Set<string>();
  for (let start = 0; start < licences.length; start += 90) {
    const rows = await db
      .selectDistinct(contactColumns)
      .from(personsTable)
      .innerJoin(membershipsTable, eq(membershipsTable.personId, personsTable.id))
      .where(
        and(
          inArray(personsTable.licence, licences.slice(start, start + 90)),
          eq(membershipsTable.seasonId, seasonId)
        )
      )
      .all();
    for (const email of collectEmails(rows)) emails.add(email);
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
    .select({ type: membershipsTable.type, members: sql<number>`count(*)` })
    .from(membershipsTable)
    .where(eq(membershipsTable.seasonId, seasonId))
    .groupBy(membershipsTable.type)
    .orderBy(membershipsTable.type)
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
      firstName: personsTable.firstName,
      lastName: personsTable.lastName,
      birthDate: personsTable.birthDate
    })
    .from(membershipsTable)
    .innerJoin(personsTable, eq(personsTable.id, membershipsTable.personId))
    .where(
      and(eq(membershipsTable.seasonId, seasonId), sql`substr(${personsTable.birthDate}, 6) = ${monthDay}`)
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
        sql`lower(${personsTable.email}) = ${email}`,
        sql`lower(${personsTable.parent1Email}) = ${email}`,
        sql`lower(${personsTable.parent2Email}) = ${email}`
      )
    );
    const rows = await db
      .select({
        id: membershipsTable.id,
        firstName: personsTable.firstName,
        lastName: personsTable.lastName,
        type: membershipsTable.type,
        ...contactColumns
      })
      .from(membershipsTable)
      .innerJoin(personsTable, eq(personsTable.id, membershipsTable.personId))
      .where(and(eq(membershipsTable.seasonId, seasonId), or(...matchesChunk)))
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
