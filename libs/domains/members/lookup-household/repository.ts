import { membershipsTable, personsTable } from '@nba/members/schema';
import { and, eq, or, sql } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { getSeasonAtDate, getAdjacentSeason, type SeasonRow } from '@nba/accounting-api';

export interface HouseholdMember {
  id: number;
  firstName: string;
  lastName: string;
  licence: string;
  paid: boolean;
  expenseAuthorized: boolean;
}

/**
 * - `granted`  : licence détenue pour la saison en cours. Seul statut qui ouvre une session.
 * - `upcoming` : inscription anticipée, licence prise pour la saison suivante seulement.
 *   L'accès s'ouvrira au premier jour de cette saison ; d'ici là, l'app n'aurait aucune de
 *   ses données à lui montrer.
 * - `lapsed`   : plus de licence, mais un dossier la saison précédente. On connaît son
 *   email : on peut l'inviter à réadhérer.
 * - `unknown`  : rien à moins d'une saison d'écart. Indiscernable d'un inconnu.
 */
export type HouseholdStatus = 'granted' | 'upcoming' | 'lapsed' | 'unknown';

export interface HouseholdLookupResult {
  // Email au dossier vers lequel écrire (jamais renvoyé au client tel quel).
  accountEmail: string | null;
  // Dossiers de la saison en cours. Vide hors de `granted`.
  members: HouseholdMember[];
  status: HouseholdStatus;
  // Saison EN COURS au sens des dates : elle horodate la session et pilote tout
  // l'affichage. Jamais la saison comptable (`active`), qui bascule à la clôture.
  seasonCode: string | null;
  // Saison dont parle le message : celle qui manque (`lapsed`), celle qui va s'ouvrir
  // (`upcoming`), celle qu'on joue (`granted`).
  seasonName: string | null;
  // Premier jour de la saison à venir (`YYYY-MM-DD`), renseigné pour `upcoming` seulement.
  accessOpensOn: string | null;
  // Membres du foyer licenciés la saison passée et absents de la saison en cours.
  // Renseigné pour `granted` uniquement : c'est le foyer mixte — un enfant réinscrit,
  // l'autre pas. L'accès étant accordé, aucun email d'alerte ne part ; le rappel se fait
  // donc dans l'app, où l'on s'adresse à quelqu'un d'authentifié et où l'on peut nommer
  // l'absent sans rien divulguer.
  lapsedMembers: HouseholdMember[];
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Date du jour à Paris, en `YYYY-MM-DD`. Le worker tourne en UTC : s'en remettre à lui
 * ferait basculer la saison deux heures trop tard, le 31 août au soir.
 *
 * `en-CA` rend la date en ISO — un découpage sûr, là où l'ordre des parties d'un format
 * localisé ne se lit pas par position (même idiome que `list-birthdays/route.ts`).
 */
export function parisToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now);
}

export class LookupHouseholdRepository {
  // Tous les adhérents d'une saison dont l'email OU un email de parent/contact correspond
  // (insensible à la casse).
  //
  // L'adresse est désormais celle de la **personne**, pas de son dossier de l'année :
  // c'est elle qui identifie le foyer. La saison n'intervient plus que pour décider qui,
  // parmi les personnes trouvées, est adhérent — ce qui est exactement la question posée.
  private async membersByEmail(db: DbOrTx, email: string, seasonId: number): Promise<HouseholdMember[]> {
    const rows = await db
      .select({
        id: membershipsTable.id,
        firstName: personsTable.firstName,
        lastName: personsTable.lastName,
        licence: personsTable.licence,
        paid: membershipsTable.paid,
        expenseAuthorized: membershipsTable.expenseAuthorized
      })
      .from(membershipsTable)
      .innerJoin(personsTable, eq(personsTable.id, membershipsTable.personId))
      .where(
        and(
          or(
            sql`lower(${personsTable.email}) = ${email}`,
            sql`lower(${personsTable.parent1Email}) = ${email}`,
            sql`lower(${personsTable.parent2Email}) = ${email}`
          ),
          eq(membershipsTable.seasonId, seasonId)
        )
      )
      .all();
    return rows as HouseholdMember[];
  }

  // Email au dossier d'une licence, la saison servant à vérifier qu'elle a bien adhéré
  // cette année-là — l'adresse, elle, ne dépend plus de la saison.
  private async emailByLicence(db: DbOrTx, licence: string, seasonId: number): Promise<string | null> {
    const member = await db
      .select({
        email: personsTable.email,
        parent1Email: personsTable.parent1Email,
        parent2Email: personsTable.parent2Email
      })
      .from(membershipsTable)
      .innerJoin(personsTable, eq(personsTable.id, membershipsTable.personId))
      .where(and(eq(personsTable.licence, licence), eq(membershipsTable.seasonId, seasonId)))
      .get();
    const found = member?.email || member?.parent1Email || member?.parent2Email || null;
    return found ? normalizeEmail(found) : null;
  }

  /**
   * Saison en cours au sens des dates, et ses deux voisines immédiates. On ne regarde
   * jamais plus loin : au-delà d'une saison d'écart, un dossier n'est plus un
   * renouvellement mais une nouvelle adhésion.
   *
   * Si aucune saison ne couvre la date du jour (trou de calendrier : la nouvelle saison
   * n'a pas encore été créée en base), on retombe sur la dernière saison commencée plutôt
   * que de verrouiller tout le monde. Le portillon ne se referme donc qu'une fois la
   * nouvelle saison réellement enregistrée — un oubli du bureau ne coupe personne.
   */
  private async resolveSeasons(
    db: DbOrTx,
    today: string
  ): Promise<{ current?: SeasonRow; next?: SeasonRow; previous?: SeasonRow }> {
    const current =
      (await getSeasonAtDate(db, today)) ?? (await getAdjacentSeason(db, today, 'before'));
    if (!current) return {};

    return {
      current,
      next: await getAdjacentSeason(db, current.startDate, 'after'),
      previous: await getAdjacentSeason(db, current.startDate, 'before')
    };
  }

  async lookup(db: DbOrTx, identifier: string, today: string = parisToday()): Promise<HouseholdLookupResult> {
    const raw = identifier.trim();
    const { current, next, previous } = await this.resolveSeasons(db, today);

    const empty: HouseholdLookupResult = {
      accountEmail: null,
      members: [],
      status: 'unknown',
      seasonCode: current?.code ?? null,
      seasonName: current?.name ?? null,
      accessOpensOn: null,
      lapsedMembers: []
    };
    if (!raw || !current) return empty;

    // Saisons sondées pour retrouver l'email d'une licence : les trois. Sans la précédente,
    // l'ex-adhérent qui se connecte avec son numéro de licence resterait introuvable, donc
    // muet — alors qu'on veut justement l'inviter à réadhérer.
    const searchable = [current, next, previous].filter((s): s is SeasonRow => Boolean(s));

    let accountEmail: string | null = null;
    if (raw.includes('@')) {
      accountEmail = normalizeEmail(raw);
    } else {
      for (const season of searchable) {
        accountEmail = await this.emailByLicence(db, raw, season.id);
        if (accountEmail) break;
      }
    }
    if (!accountEmail) return empty;

    const members = await this.membersByEmail(db, accountEmail, current.id);
    if (members.length > 0) {
      // Le foyer entre. Reste à repérer ceux qu'on y a perdus en route : la comparaison se
      // fait sur la licence, l'`id` changeant d'une saison à l'autre.
      const licences = new Set(members.map((m) => m.licence));
      const lapsedMembers = previous
        ? (await this.membersByEmail(db, accountEmail, previous.id)).filter((m) => !licences.has(m.licence))
        : [];
      return { ...empty, accountEmail, members, status: 'granted', lapsedMembers };
    }

    // Inscription anticipée : la licence existe, mais pour une saison qui n'a pas commencé.
    // Lui ouvrir l'app maintenant l'amènerait sur des écrans vides — la saison en cours
    // n'est pas la sienne. On lui donne rendez-vous à la date d'ouverture.
    if (next) {
      const early = await this.membersByEmail(db, accountEmail, next.id);
      if (early.length > 0) {
        return {
          ...empty,
          accountEmail,
          status: 'upcoming',
          seasonName: next.name,
          accessOpensOn: next.startDate
        };
      }
    }

    if (previous) {
      const lapsed = await this.membersByEmail(db, accountEmail, previous.id);
      if (lapsed.length > 0) {
        return { ...empty, accountEmail, status: 'lapsed' };
      }
    }

    return { ...empty, accountEmail };
  }
}
