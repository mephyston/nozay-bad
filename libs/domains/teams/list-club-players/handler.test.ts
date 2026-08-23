import { describe, it, expect, beforeEach } from 'vitest';
import { sql } from 'drizzle-orm';
import { setupMockDb } from '@nba/db/test-utils';
import { type Db } from '@nba/db';
import { listClubPlayers } from './handler';

const SEASON = '25-26';

describe('listClubPlayers', () => {
  let db: Db;

  beforeEach(async () => {
    ({ db } = await setupMockDb());
    await db.run(sql`
      INSERT INTO seasons (code, name, start_date, end_date, active, created_at)
      VALUES (${SEASON}, 'Saison 2025-2026', '2025-09-01', '2026-08-31', 1, 0)
    `);
  });

  /** Une personne et son adhésion à la saison. `photo` : horodatage en secondes. */
  async function member(
    licence: string,
    lastName: string,
    firstName: string,
    photo: number | null = null,
    seasonCode = SEASON
  ) {
    await db.run(sql`
      INSERT INTO persons (licence, last_name, first_name, gender, birth_date, photo_updated_at, created_at, updated_at)
      VALUES (${licence}, ${lastName}, ${firstName}, 'F', '1990-01-01', ${photo}, 0, 0)
    `);
    const person = await db.get<{ id: number }>(sql`SELECT last_insert_rowid() as id`);
    const season = await db.get<{ id: number }>(
      sql`SELECT id FROM seasons WHERE code = ${seasonCode}`
    );
    await db.run(sql`
      INSERT INTO memberships (person_id, season_id, status, type, imported_at)
      VALUES (${person!.id}, ${season!.id}, 'valide', 'Adulte', 0)
    `);
  }

  const rank = (
    licence: string,
    eloDate: string,
    singles: string | null,
    doubles: string | null,
    mixed: string | null,
    cpph: [number | null, number | null, number | null] = [null, null, null],
    category: string | null = null
  ) =>
    db.run(sql`
      INSERT INTO player_rankings (licence, elo_date, season_code, last_name, first_name, gender, category, singles, doubles, mixed, cpph_singles, cpph_doubles, cpph_mixed, updated_at)
      VALUES (${licence}, ${eloDate}, ${SEASON}, 'X', 'Y', 'F', ${category}, ${singles}, ${doubles}, ${mixed}, ${cpph[0]}, ${cpph[1]}, ${cpph[2]}, 0)
    `);

  const clubFunction = async (licence: string, fn: string, seasonCode = SEASON) => {
    const season = await db.get<{ id: number }>(
      sql`SELECT id FROM seasons WHERE code = ${seasonCode}`
    );
    await db.run(sql`
      INSERT INTO member_club_functions (season_id, licence, function, created_at)
      VALUES (${season!.id}, ${licence}, ${fn}, 0)
    `);
  };

  it('classe du plus fort au plus faible, à la moyenne des cotes CPPH', async () => {
    await member('00000001', 'Faible', 'Anne');
    await member('00000002', 'Fort', 'Bruno');
    await member('00000003', 'Moyen', 'Chloé');
    await rank('00000001', '2026-01-15', 'P11', 'P11', 'P11', [400, 400, 400]);
    await rank('00000002', '2026-01-15', 'D7', 'D8', 'D9', [1500, 1400, 1300]);
    await rank('00000003', '2026-01-15', 'P10', 'P10', 'P10', [800, 800, 800]);

    const { players } = await listClubPlayers(db, { seasonCode: SEASON });

    expect(players.map((p) => p.lastName)).toEqual(['Fort', 'Moyen', 'Faible']);
    expect(players[0].eloAverage).toBe(1400);
  });

  /*
   * Un non-classé n'est pas « à zéro » : il n'est pas sur l'échelle. Le ranger avec les
   * cotes les plus basses le ferait lire comme le plus faible joueur du club.
   */
  it('renvoie les non-classés en fin de liste, triés par nom', async () => {
    await member('00000001', 'Zola', 'Anne');
    await member('00000002', 'Étienne', 'Bruno');
    await member('00000003', 'Classé', 'Chloé');
    await rank('00000003', '2026-01-15', 'P11', null, null, [400, null, null]);

    const { players } = await listClubPlayers(db, { seasonCode: SEASON });

    // Tri français : « Étienne » se range avec « Etienne », pas après « Zola ».
    expect(players.map((p) => p.lastName)).toEqual(['Classé', 'Étienne', 'Zola']);
  });

  /*
   * Diviser par trois quoi qu'il arrive punirait le joueur qui ne dispute que le simple :
   * 400 deviendrait 133, et il tomberait au bas de l'annuaire sans l'avoir mérité.
   */
  it('ne moyenne que les tableaux effectivement classés', async () => {
    await member('00000001', 'Simpliste', 'Anne');
    await rank('00000001', '2026-01-15', 'D7', null, null, [1200, null, null]);

    const { players } = await listClubPlayers(db, { seasonCode: SEASON });

    expect(players[0].eloAverage).toBe(1200);
  });

  it('rend la catégorie Poona telle quelle', async () => {
    await member('00000001', 'Martin', 'Léa');
    await member('00000002', 'Nadal', 'Paul');
    await rank('00000001', '2026-01-15', 'D7', 'D8', 'D9', [1, 1, 1], 'Veteran 5');

    const { players } = await listClubPlayers(db, { seasonCode: SEASON });

    expect(players.find((p) => p.licence === '00000001')!.category).toBe('Veteran 5');
    expect(players.find((p) => p.licence === '00000002')!.category).toBeNull();
  });

  it('rend le libellé de la fonction au club, et seulement pour la saison', async () => {
    await db.run(sql`
      INSERT INTO seasons (code, name, start_date, end_date, active, created_at)
      VALUES ('24-25', 'Saison 2024-2025', '2024-09-01', '2025-08-31', 0, 0)
    `);
    await member('00000001', 'Martin', 'Léa');
    await member('00000002', 'Nadal', 'Paul');
    await clubFunction('00000001', 'president');
    await clubFunction('00000002', 'treasurer', '24-25');

    const { players } = await listClubPlayers(db, { seasonCode: SEASON });

    expect(players.find((p) => p.licence === '00000001')!.clubFunction).toBe('Président');
    // Trésorier la saison passée : la fonction ne suit pas l'adhérent d'une saison à l'autre.
    expect(players.find((p) => p.licence === '00000002')!.clubFunction).toBeNull();
  });

  it('rattache à chacun ses classements à la date d’import la plus récente', async () => {
    await member('00000001', 'Martin', 'Léa');
    await rank('00000001', '2025-09-01', 'D8', 'D9', 'P10');
    await rank('00000001', '2026-01-15', 'D7', 'D8', 'D9');

    const { players, referenceEloDate } = await listClubPlayers(db, { seasonCode: SEASON });

    expect(referenceEloDate).toBe('2026-01-15');
    expect(players[0]).toMatchObject({ singles: 'D7', doubles: 'D8', mixed: 'D9', hasRanking: true });
  });

  /*
   * Un licencié non compétiteur n'a aucune ligne de classement. Il reste de l'annuaire :
   * l'écran dira « sans classement », il ne le fera pas disparaître du club.
   */
  it('garde un adhérent sans classement, et le signale', async () => {
    await member('00000001', 'Martin', 'Léa');
    await member('00000002', 'Nadal', 'Paul');
    await rank('00000001', '2026-01-15', 'D7', 'D8', 'D9');

    const { players } = await listClubPlayers(db, { seasonCode: SEASON });

    expect(players).toHaveLength(2);
    expect(players.find((p) => p.licence === '00000002')).toMatchObject({
      hasRanking: false,
      singles: null,
      doubles: null,
      mixed: null
    });
  });

  /*
   * L'identité vient du référentiel des adhérents, jamais des classements : l'export ELO
   * contient les licenciés d'autres clubs rencontrés en interclubs.
   */
  it('ignore un classé qui n’est pas adhérent du club', async () => {
    await member('00000001', 'Martin', 'Léa');
    await rank('09999999', '2026-01-15', 'D7', 'D8', 'D9');

    const { players } = await listClubPlayers(db, { seasonCode: SEASON });

    expect(players.map((p) => p.licence)).toEqual(['00000001']);
  });

  it('rend la version du portrait en millisecondes, ou null', async () => {
    await member('00000001', 'Martin', 'Léa', 1_700_000_000);
    await member('00000002', 'Nadal', 'Paul');

    const { players } = await listClubPlayers(db, { seasonCode: SEASON });

    expect(players.find((p) => p.licence === '00000001')!.photoUpdatedAt).toBe(1_700_000_000_000);
    expect(players.find((p) => p.licence === '00000002')!.photoUpdatedAt).toBeNull();
  });

  it('n’expose que la saison demandée', async () => {
    await db.run(sql`
      INSERT INTO seasons (code, name, start_date, end_date, active, created_at)
      VALUES ('24-25', 'Saison 2024-2025', '2024-09-01', '2025-08-31', 0, 0)
    `);
    await member('00000001', 'Martin', 'Léa');
    await member('00000002', 'Ancien', 'Jean', null, '24-25');

    const { players } = await listClubPlayers(db, { seasonCode: SEASON });

    expect(players.map((p) => p.licence)).toEqual(['00000001']);
  });

  it('ne réclame aucun classement quand aucun import n’a eu lieu', async () => {
    await member('00000001', 'Martin', 'Léa');

    const { players, referenceEloDate } = await listClubPlayers(db, { seasonCode: SEASON });

    expect(referenceEloDate).toBeNull();
    expect(players[0].hasRanking).toBe(false);
  });
});
