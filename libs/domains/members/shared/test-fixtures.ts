import { membershipsTable, personsTable } from '@nba/members/schema';
import { eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { selectMembers } from './queries';

/**
 * Poser un adhérent en base, pour les tests.
 *
 * Un adhérent, c'est désormais deux lignes — une personne et son adhésion — et les tests
 * de six domaines en semaient une seule. Plutôt que de leur faire écrire la jointure à la
 * main (et de les faire diverger au premier champ ajouté), ils passent par ici.
 *
 * La forme des valeurs est celle qu'ils écrivaient déjà sur l'ancienne table `members`,
 * pour que la reprise se lise comme un remplacement et non comme une réécriture. Le retour
 * porte `id` — l'identifiant de l'**adhésion**, celui que stockent commandes, notes de
 * frais et écritures — et `personId`.
 */
export interface MemberFixture {
  licence: string;
  seasonId: number;
  lastName?: string;
  firstName?: string;
  gender?: 'M' | 'F';
  birthDate?: string;
  email?: string | null;
  phone?: string | null;
  parent1Name?: string | null;
  parent1Email?: string | null;
  parent1Phone?: string | null;
  parent2Name?: string | null;
  parent2Email?: string | null;
  parent2Phone?: string | null;
  status?: 'valide' | 'suspendu' | 'incomplet' | 'en_attente';
  type?: string;
  amountDueCents?: number;
  amountReceivedCents?: number;
  amountRemainingCents?: number;
  paid?: boolean;
  paymentDate?: string | null;
  expenseAuthorized?: boolean;
  importedAt?: Date;
  /** Identifiant d'adhésion imposé, quand le test le référence ailleurs. */
  id?: number;
}

export interface InsertedMember {
  /** Identifiant de l'adhésion. */
  id: number;
  personId: number;
  licence: string;
}

export async function insertMemberFixture(db: DbOrTx, values: MemberFixture): Promise<InsertedMember> {
  const importedAt = values.importedAt ?? new Date();

  // La personne peut déjà exister : un test qui inscrit la même licence sur deux saisons
  // ne doit pas buter sur l'unicité de la licence.
  const existing = await db
    .select({ id: personsTable.id })
    .from(personsTable)
    .where(eq(personsTable.licence, values.licence))
    .get();

  const personId = existing
    ? existing.id
    : (
        await db
          .insert(personsTable)
          .values({
            licence: values.licence,
            lastName: values.lastName ?? 'Nom',
            firstName: values.firstName ?? 'Prénom',
            gender: values.gender ?? 'M',
            birthDate: values.birthDate ?? '1990-01-01',
            email: values.email ?? null,
            phone: values.phone ?? null,
            parent1Name: values.parent1Name ?? null,
            parent1Email: values.parent1Email ?? null,
            parent1Phone: values.parent1Phone ?? null,
            parent2Name: values.parent2Name ?? null,
            parent2Email: values.parent2Email ?? null,
            parent2Phone: values.parent2Phone ?? null,
            createdAt: importedAt,
            updatedAt: importedAt
          })
          .returning({ id: personsTable.id })
          .get()
      )!.id;

  const membership = await db
    .insert(membershipsTable)
    .values({
      ...(values.id !== undefined ? { id: values.id } : {}),
      personId,
      seasonId: values.seasonId,
      status: values.status ?? 'valide',
      type: values.type ?? 'senior',
      amountDueCents: values.amountDueCents ?? 0,
      amountReceivedCents: values.amountReceivedCents ?? 0,
      amountRemainingCents: values.amountRemainingCents ?? 0,
      paid: values.paid ?? false,
      paymentDate: values.paymentDate ?? null,
      expenseAuthorized: values.expenseAuthorized ?? false,
      importedAt
    })
    .returning({ id: membershipsTable.id })
    .get();

  return { id: membership!.id, personId, licence: values.licence };
}

export async function insertMemberFixtures(db: DbOrTx, values: MemberFixture[]): Promise<InsertedMember[]> {
  const inserted: InsertedMember[] = [];
  // En série : la seconde adhésion d'une même licence doit voir la personne créée par la
  // première.
  for (const value of values) inserted.push(await insertMemberFixture(db, value));
  return inserted;
}

/**
 * Relit les adhérents tels que l'application les voit — l'adhésion et sa personne réunies.
 *
 * Exporté ici plutôt qu'atteint par un chemin relatif depuis `apps/api` : un test qui
 * plonge de trois niveaux dans `libs/` est un test qu'on oubliera de suivre le jour où le
 * fichier bouge.
 */
export const readMemberFixtures = (db: DbOrTx) => selectMembers(db);
