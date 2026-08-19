import { describe, it, expect } from 'vitest';
import { parseRankingCsv, toIsoDate, RankingCsvFormatError } from './ranking-csv';

/**
 * En-tête réel de l'export ELO Poona. La septième colonne n'a pas de nom : c'est elle
 * qui porte la date de classement, et tout le reste du domaine en dépend.
 */
const HEADER =
  'Sexe;Nom;Prénom;Licence;Saison;Catégorie;;ELO simple Classement;ELO simple rang;' +
  'ELO simple CPPH;ELO double Classement;ELO double rang;ELO double CPPH;' +
  'ELO mixte Classement;ELO mixte rang;ELO mixte CPPH;Muté';

const ABADIE_C =
  '"H";"ABADIE";"Christophe";"07104079";"25-26";"Veteran 5";13-08-2026;"P11";"97141";"559";' +
  '"P11";"68043";"698";"P11";"101347";"604";"Non muté"';

/** Un licencié non compétiteur : toutes les cellules de classement sont vides. */
const LOISIR = '"F";"MARTIN";"Claire";"07999999";"25-26";"Senior";13-08-2026;"";"";"";"";"";"";"";"";"";"Non muté"';

const csv = (...rows: string[]) => [HEADER, ...rows].join('\n');

describe('toIsoDate', () => {
  it('convertit le format français en ISO, qui seul se trie', () => {
    expect(toIsoDate('13-08-2026')).toBe('2026-08-13');
    expect(toIsoDate('01-01-2027')).toBe('2027-01-01');
  });

  it('rejette ce qui n’est pas une date', () => {
    expect(toIsoDate('P11')).toBeNull();
    expect(toIsoDate('')).toBeNull();
  });
});

describe('parseRankingCsv', () => {
  it('lit la date ELO malgré son en-tête vide', () => {
    expect(parseRankingCsv(csv(ABADIE_C)).eloDate).toBe('2026-08-13');
  });

  it('retrouve la date par sa forme si Poona nomme un jour la colonne', () => {
    const named = csv(ABADIE_C).replace(';;ELO simple', ';Date ELO;ELO simple');
    expect(parseRankingCsv(named).eloDate).toBe('2026-08-13');
  });

  it('lit les trois classements et les trois cotes', () => {
    const [row] = parseRankingCsv(csv(ABADIE_C)).rows;

    expect(row).toMatchObject({
      licence: '07104079',
      lastName: 'ABADIE',
      firstName: 'Christophe',
      gender: 'H',
      seasonCode: '25-26',
      category: 'Veteran 5',
      mutation: 'none',
      singles: 'P11',
      doubles: 'P11',
      mixed: 'P11',
      cpphSingles: 559,
      cpphDoubles: 698,
      cpphMixed: 604,
      nonCompetitor: false
    });
  });

  it('conserve les zéros de tête de la licence', () => {
    const stripped = ABADIE_C.replace('"07104079"', '"7104079"');
    expect(parseRankingCsv(csv(stripped)).rows[0].licence).toBe('07104079');
  });

  it('marque non compétiteur, et non en erreur, une ligne sans aucun classement', () => {
    const result = parseRankingCsv(csv(ABADIE_C, LOISIR));

    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[1].nonCompetitor).toBe(true);
    expect(result.rows[1].singles).toBeNull();
  });

  it('reconnaît les deux formes de mutation', () => {
    const normale = ABADIE_C.replace('"Non muté"', '"Mutation normale"');
    const dossier = ABADIE_C.replace('"Non muté"', '"Mutation sur dossier"');

    expect(parseRankingCsv(csv(normale)).rows[0].mutation).toBe('normal');
    expect(parseRankingCsv(csv(dossier)).rows[0].mutation).toBe('dossier');
  });

  it('signale la ligne fautive sans abandonner le reste du fichier', () => {
    const sansLicence = ABADIE_C.replace('"07104079"', '""');
    const result = parseRankingCsv(csv(sansLicence, LOISIR));

    expect(result.rows).toHaveLength(1);
    expect(result.errors).toEqual([{ line: 2, message: 'Licence absente.' }]);
  });

  it('refuse un fichier qui n’est pas un export ELO', () => {
    expect(() => parseRankingCsv('Licence;Nom;Prénom\n"1";"A";"B"')).toThrow(RankingCsvFormatError);
  });
});
