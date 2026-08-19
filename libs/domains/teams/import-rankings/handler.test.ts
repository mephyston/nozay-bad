import { describe, it, expect, beforeEach } from 'vitest';
import { sql } from 'drizzle-orm';
import { setupMockDb } from '@nba/db/test-utils';
import { type Db } from '@nba/db';
import { membersTable } from '@nba/members/schema';
import { playerRankingsTable } from '../shared/schema';
import { importRankings } from './handler';
import { saveTeam } from '../save-team/handler';
import { saveTeamRoster } from '../save-team-roster/handler';
import { InvalidRankingFileError, RankingDateMissingError } from '../shared/errors';

const NOW = new Date('2026-08-20T12:00:00Z');
const SEASON = '26-27';

const HEADER =
  'Sexe;Nom;Prénom;Licence;Saison;Catégorie;;ELO simple Classement;ELO simple rang;' +
  'ELO simple CPPH;ELO double Classement;ELO double rang;ELO double CPPH;' +
  'ELO mixte Classement;ELO mixte rang;ELO mixte CPPH;Muté';

function line(
  licence: string,
  name: string,
  opts: { gender?: 'H' | 'F'; singles?: string; date?: string; muted?: string } = {}
) {
  const { gender = 'H', singles = 'D8', date = '13-08-2026', muted = 'Non muté' } = opts;
  return (
    `"${gender}";"${name}";"Test";"${licence}";"${SEASON}";"Senior";${date};` +
    `"${singles}";"16349";"1257";"${singles}";"20535";"1191";"${singles}";"41492";"989";"${muted}"`
  );
}

const csv = (...rows: string[]) => [HEADER, ...rows].join('\n');

describe('import des classements', () => {
  let db: Db;

  /**
   * `seasons` appartient au domaine comptable : la fixture passe par du SQL brut plutôt
   * que par son schéma, pour ne pas ouvrir une dépendance que le domaine n'a pas.
   */
  let seasonId: number;

  beforeEach(async () => {
    ({ db } = await setupMockDb());
    await db.run(sql`
      INSERT INTO seasons (code, name, start_date, end_date, active, created_at)
      VALUES (${SEASON}, 'Saison 2026-2027', '2026-09-01', '2027-08-31', 1, 0)
    `);
    const row = await db.get<{ id: number }>(sql`SELECT id FROM seasons WHERE code = ${SEASON}`);
    seasonId = row!.id;
  });

  /** Inscrit un adhérent au référentiel de la saison. */
  async function member(licence: string, lastName: string) {
    await db.insert(membersTable).values({
      licence,
      seasonId,
      lastName,
      firstName: 'Test',
      gender: 'M',
      birthDate: '1985-01-01',
      type: 'Adulte',
      importedAt: NOW
    });
  }

  it('enregistre les classements à la date lue dans le fichier', async () => {
    await member('00210759', 'BANSSE');
    const result = await importRankings(db, { content: csv(line('00210759', 'BANSSE')), seasonCode: SEASON }, NOW);

    expect(result.eloDate).toBe('2026-08-13');
    expect(result.imported).toBe(1);
    expect(result.errors).toEqual([]);

    const [row] = await db.select().from(playerRankingsTable).all();
    expect(row).toMatchObject({ licence: '00210759', eloDate: '2026-08-13', singles: 'D8', source: 'import' });
  });

  it('laisse la date confirmée par le coach primer sur celle du fichier', async () => {
    await member('00210759', 'BANSSE');
    const result = await importRankings(
      db,
      { content: csv(line('00210759', 'BANSSE')), seasonCode: SEASON, eloDate: '2026-09-10' },
      NOW
    );

    expect(result.eloDate).toBe('2026-09-10');
  });

  describe('rapprochement avec le référentiel des adhérents', () => {
    it("signale un compétiteur qui n'est pas adhérent, sans le créer", async () => {
      await member('00210759', 'BANSSE');
      const result = await importRankings(
        db,
        { content: csv(line('00210759', 'BANSSE'), line('07469928', 'INCONNU')), seasonCode: SEASON },
        NOW
      );

      expect(result.unmatched).toEqual([
        { licence: '07469928', lastName: 'INCONNU', firstName: 'Test' }
      ]);
      // Aucun adhérent créé : c'est au bureau de relancer l'import des adhérents.
      const members = await db.select().from(membersTable).all();
      expect(members.map((m) => m.licence)).toEqual(['00210759']);
    });

    it('enregistre malgré tout son classement : la donnée est juste, seul l’ordre des imports diverge', async () => {
      await importRankings(db, { content: csv(line('07469928', 'INCONNU')), seasonCode: SEASON }, NOW);

      const rows = await db.select().from(playerRankingsTable).all();
      expect(rows).toHaveLength(1);
    });

    it('ne signale pas un licencié non compétiteur absent du référentiel', async () => {
      const loisir =
        `"F";"MARTIN";"Claire";"07999999";"${SEASON}";"Senior";13-08-2026;` +
        '"";"";"";"";"";"";"";"";"";"Non muté"';
      const result = await importRankings(db, { content: csv(loisir), seasonCode: SEASON }, NOW);

      expect(result.nonCompetitors).toBe(1);
      expect(result.unmatched).toEqual([]);
    });

    it('rapproche malgré des zéros de tête perdus côté adhérents', async () => {
      await member('210759', 'BANSSE');
      const result = await importRankings(db, { content: csv(line('00210759', 'BANSSE')), seasonCode: SEASON }, NOW);

      expect(result.unmatched).toEqual([]);
    });
  });

  it('historise plutôt que d’écraser : deux dates cohabitent pour un même joueur', async () => {
    await member('00210759', 'BANSSE');
    await importRankings(db, { content: csv(line('00210759', 'BANSSE', { singles: 'D8' })), seasonCode: SEASON }, NOW);
    await importRankings(
      db,
      { content: csv(line('00210759', 'BANSSE', { singles: 'D7', date: '10-12-2026' })), seasonCode: SEASON },
      NOW
    );

    const rows = await db.select().from(playerRankingsTable).all();
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.singles).sort()).toEqual(['D7', 'D8']);
  });

  it('rejoue un import sans dupliquer, et corrige la ligne', async () => {
    await member('00210759', 'BANSSE');
    await importRankings(db, { content: csv(line('00210759', 'BANSSE', { singles: 'D8' })), seasonCode: SEASON }, NOW);
    await importRankings(db, { content: csv(line('00210759', 'BANSSE', { singles: 'D9' })), seasonCode: SEASON }, NOW);

    const rows = await db.select().from(playerRankingsTable).all();
    expect(rows).toHaveLength(1);
    expect(rows[0].singles).toBe('D9');
  });

  it('n’efface pas les joueurs absents d’un export partiel', async () => {
    await member('00210759', 'BANSSE');
    await member('07469928', 'AUTRE');
    await importRankings(
      db,
      { content: csv(line('00210759', 'BANSSE'), line('07469928', 'AUTRE')), seasonCode: SEASON },
      NOW
    );
    // Export de début de saison suivante : une seule ligne, même date.
    await importRankings(db, { content: csv(line('00210759', 'BANSSE')), seasonCode: SEASON }, NOW);

    expect(await db.select().from(playerRankingsTable).all()).toHaveLength(2);
  });

  /**
   * D1 refuse plus de 100 paramètres liés par requête. Avec 19 colonnes par ligne, cela
   * fait cinq lignes par insertion — et une insertion groupée naïve échoue en bloc.
   *
   * Ce test insère bien au-delà du plafond parce que le cas nominal, à trois lignes, ne
   * l'atteignait jamais : c'est l'import réel, deux cent treize licenciés, qui a cassé.
   */
  it('importe un fichier volumineux sans buter sur la limite de paramètres de D1', async () => {
    const rows = Array.from({ length: 213 }, (_, i) =>
      line(String(10_000_000 + i), `JOUEUR${i}`)
    );
    await member('10000000', 'JOUEUR0');

    const result = await importRankings(db, { content: csv(...rows), seasonCode: SEASON }, NOW);

    expect(result.imported).toBe(213);
    expect(result.errors).toEqual([]);
    expect(await db.select().from(playerRankingsTable).all()).toHaveLength(213);
  });

  it('remplace un effectif plus large que la limite de paramètres de D1', async () => {
    // Trois colonnes par ligne : le plafond tombe à 33 joueurs par requête.
    const licences = Array.from({ length: 80 }, (_, i) => String(20_000_000 + i));
    for (const licence of licences) await member(licence, `EFFECTIF${licence}`);

    const team = await saveTeam(
      db,
      { seasonCode: SEASON, championship: 'icd_mixte', division: 'D2', number: 1 },
      NOW
    );
    const result = await saveTeamRoster(db, { teamId: team.id, licences }, NOW);

    expect(result.count).toBe(80);
    expect(result.rejected).toEqual([]);
  });

  it('reconnaît les mutés, que le règlement plafonne par rencontre', async () => {
    await member('00210759', 'BANSSE');
    await importRankings(
      db,
      { content: csv(line('00210759', 'BANSSE', { muted: 'Mutation sur dossier' })), seasonCode: SEASON },
      NOW
    );

    const [row] = await db.select().from(playerRankingsTable).all();
    expect(row.mutation).toBe('dossier');
  });

  it('refuse un fichier qui n’est pas un export ELO', async () => {
    await expect(
      importRankings(db, { content: 'Licence;Nom\n"1";"A"', seasonCode: SEASON }, NOW)
    ).rejects.toBeInstanceOf(InvalidRankingFileError);
  });

  it('refuse d’importer sans date de classement, plutôt que d’en inventer une', async () => {
    const undated = csv(line('00210759', 'BANSSE')).replace(';13-08-2026;', ';;');

    await expect(
      importRankings(db, { content: undated, seasonCode: SEASON }, NOW)
    ).rejects.toBeInstanceOf(RankingDateMissingError);
  });
});
