import { membershipsTable, personsTable } from '@nba/members/schema';
import { inArray, eq, sql } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { insertSeasons, getSeasonsByCodes } from '@nba/accounting-api';

/** Une ligne de l'export Poona, résolue : la personne et son adhésion réunies. */
export interface ImportedMember {
  licence: string;
  seasonId: number;
  lastName: string;
  firstName: string;
  gender: 'M' | 'F';
  birthDate: string;
  email: string | null;
  phone: string | null;
  status: 'valide' | 'suspendu' | 'incomplet' | 'en_attente';
  type: string;
  amountDueCents: number;
  amountReceivedCents: number;
  amountRemainingCents: number;
  paid: boolean;
  paymentDate: string | null;
  parent1Name: string | null;
  parent1Email: string | null;
  parent1Phone: string | null;
  parent2Name: string | null;
  parent2Email: string | null;
  parent2Phone: string | null;
  importedAt: Date;
}

export class ImportMembersRepository {
  async insertSeasons(db: DbOrTx, seasons: any[]): Promise<void> {
    await insertSeasons(db, seasons);
  }

  async getSeasonIdMap(db: DbOrTx, seasonCodes: string[]): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    if (seasonCodes.length === 0) return map;

    const seasons = await getSeasonsByCodes(db, seasonCodes);

    for (const s of seasons) {
      map.set(s.code, s.id);
    }
    return map;
  }

  /** Clés `licence-seasonId` déjà présentes, pour distinguer les créations des mises à jour. */
  async getExistingLicenceSeasons(db: DbOrTx, licences: string[], seasonIds: number[]): Promise<Set<string>> {
    const existingSet = new Set<string>();
    if (licences.length === 0 || seasonIds.length === 0) return existingSet;

    const chunkSize = 80;
    for (let i = 0; i < licences.length; i += chunkSize) {
      const chunk = licences.slice(i, i + chunkSize);
      const existing = await db
        .select({ licence: personsTable.licence, seasonId: membershipsTable.seasonId })
        .from(membershipsTable)
        .innerJoin(personsTable, eq(personsTable.id, membershipsTable.personId))
        .where(inArray(personsTable.licence, chunk))
        .all();
      existing.forEach((m) => existingSet.add(`${m.licence}-${m.seasonId}`));
    }
    return existingSet;
  }

  /**
   * Dépose l'export en deux temps : les personnes, puis leurs adhésions.
   *
   * L'ordre n'est pas négociable — une adhésion référence sa personne. Et les deux upserts
   * n'ont pas la même règle : l'adhésion est **écrasée** (c'est l'état d'une saison, Poona
   * en est la source), la personne est **complétée**. Sans ce `coalesce`, ré-importer une
   * saison ancienne dont l'export ne portait pas encore les coordonnées effacerait celles
   * qu'on connaît aujourd'hui.
   */
  async batchUpsertMembers(db: DbOrTx, members: ImportedMember[]): Promise<void> {
    if (members.length === 0) return;

    await this.upsertPersons(db, members);
    const personIds = await this.getPersonIdsByLicence(db, [...new Set(members.map((m) => m.licence))]);
    await this.upsertMemberships(db, members, personIds);
  }

  private async upsertPersons(db: DbOrTx, members: ImportedMember[]): Promise<void> {
    // Un export peut couvrir plusieurs saisons : c'est la plus récente qui dit l'identité.
    const latestByLicence = new Map<string, ImportedMember>();
    for (const member of [...members].sort((a, b) => a.seasonId - b.seasonId)) {
      latestByLicence.set(member.licence, member);
    }

    const statements = [...latestByLicence.values()].map((m) =>
      db
        .insert(personsTable)
        .values({
          licence: m.licence,
          lastName: m.lastName,
          firstName: m.firstName,
          gender: m.gender,
          birthDate: m.birthDate,
          email: m.email,
          phone: m.phone,
          parent1Name: m.parent1Name,
          parent1Email: m.parent1Email,
          parent1Phone: m.parent1Phone,
          parent2Name: m.parent2Name,
          parent2Email: m.parent2Email,
          parent2Phone: m.parent2Phone,
          createdAt: m.importedAt,
          updatedAt: m.importedAt
        })
        .onConflictDoUpdate({
          target: personsTable.licence,
          set: {
            // L'identité, elle, fait foi : c'est la fédération qui la tient.
            lastName: m.lastName,
            firstName: m.firstName,
            gender: m.gender,
            birthDate: m.birthDate,
            // Les coordonnées se complètent sans jamais s'effacer.
            email: sql`coalesce(excluded.email, ${personsTable.email})`,
            phone: sql`coalesce(excluded.phone, ${personsTable.phone})`,
            parent1Name: sql`coalesce(excluded.parent1_name, ${personsTable.parent1Name})`,
            parent1Email: sql`coalesce(excluded.parent1_email, ${personsTable.parent1Email})`,
            parent1Phone: sql`coalesce(excluded.parent1_phone, ${personsTable.parent1Phone})`,
            parent2Name: sql`coalesce(excluded.parent2_name, ${personsTable.parent2Name})`,
            parent2Email: sql`coalesce(excluded.parent2_email, ${personsTable.parent2Email})`,
            parent2Phone: sql`coalesce(excluded.parent2_phone, ${personsTable.parent2Phone})`,
            updatedAt: m.importedAt
          }
        })
    );

    await this.runBatched(db, statements);
  }

  private async getPersonIdsByLicence(db: DbOrTx, licences: string[]): Promise<Map<string, number>> {
    const ids = new Map<string, number>();
    const chunkSize = 80;
    for (let i = 0; i < licences.length; i += chunkSize) {
      const rows = await db
        .select({ id: personsTable.id, licence: personsTable.licence })
        .from(personsTable)
        .where(inArray(personsTable.licence, licences.slice(i, i + chunkSize)))
        .all();
      for (const row of rows) ids.set(row.licence, row.id);
    }
    return ids;
  }

  private async upsertMemberships(
    db: DbOrTx,
    members: ImportedMember[],
    personIds: Map<string, number>
  ): Promise<void> {
    const statements = members.flatMap((m) => {
      const personId = personIds.get(m.licence);
      // Ne peut survenir que si l'upsert précédent a échoué : mieux vaut sauter la ligne
      // que planter tout l'import sur une personne.
      if (personId === undefined) return [];

      return [
        db
          .insert(membershipsTable)
          .values({
            personId,
            seasonId: m.seasonId,
            status: m.status,
            type: m.type,
            amountDueCents: m.amountDueCents,
            amountReceivedCents: m.amountReceivedCents,
            amountRemainingCents: m.amountRemainingCents,
            paid: m.paid,
            paymentDate: m.paymentDate,
            importedAt: m.importedAt
          })
          .onConflictDoUpdate({
            target: [membershipsTable.personId, membershipsTable.seasonId],
            set: {
              status: m.status,
              type: m.type,
              amountDueCents: m.amountDueCents,
              amountReceivedCents: m.amountReceivedCents,
              amountRemainingCents: m.amountRemainingCents,
              paid: m.paid,
              // Seul champ non écrasé aveuglément : Poona laisse « Date de paiement » vide
              // dans la plupart des exports, et un ré-import ne doit pas effacer une date
              // déjà connue — l'attestation retomberait sans bruit sur le 1er septembre.
              paymentDate: sql`coalesce(excluded.payment_date, ${membershipsTable.paymentDate})`,
              importedAt: m.importedAt
            }
            // `expenseAuthorized` reste hors du `set` : c'est une décision du bureau, pas
            // une donnée de la fédération, et un ré-import ne doit pas la révoquer.
          })
      ];
    });

    await this.runBatched(db, statements);
  }

  /** Lots de 50 instructions : au-delà, D1 refuse le batch. */
  private async runBatched(db: DbOrTx, statements: unknown[]): Promise<void> {
    const chunkSize = 50;
    for (let i = 0; i < statements.length; i += chunkSize) {
      await (db as any).batch(statements.slice(i, i + chunkSize));
    }
  }
}
