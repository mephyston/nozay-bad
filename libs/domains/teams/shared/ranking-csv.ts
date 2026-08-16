/**
 * Lecture de l'export ELO Poona (« liste des compétiteurs »).
 *
 * Le fichier porte, par licencié et par discipline, le classement, le rang national et la
 * cote (CPPH), le tout arrêté à une date — celle qui, dans les quatre règlements, décide
 * quel classement fait foi. Trois particularités du format guident ce module :
 *
 * 1. **La colonne de la date n'a pas d'en-tête.** On la repère par sa forme, pas par son
 *    nom, pour ne pas dépendre d'un index que Poona peut décaler.
 * 2. **La licence porte ses zéros de tête** (« 07104079 »). On normalise, sinon la
 *    jointure avec les adhérents échoue en silence et ressemble à « pas de classement ».
 * 3. **Un tiers des lignes n'a aucun classement** : ce sont les licenciés non
 *    compétiteurs. Ce n'est pas une erreur, et les compter comme telles ferait passer un
 *    import réussi pour un échec.
 */

import { isRanking, normalizeLicence, parseMutation, type Mutation, type Ranking } from './ranking';

export interface ParsedRankingRow {
  licence: string;
  lastName: string;
  firstName: string;
  gender: 'H' | 'F';
  seasonCode: string;
  category: string;
  mutation: Mutation;
  singles: Ranking | null;
  doubles: Ranking | null;
  mixed: Ranking | null;
  singlesRank: number | null;
  doublesRank: number | null;
  mixedRank: number | null;
  cpphSingles: number | null;
  cpphDoubles: number | null;
  cpphMixed: number | null;
  /** Aucun classement dans les trois disciplines : licencié non compétiteur. */
  nonCompetitor: boolean;
}

export interface RankingCsvResult {
  /** Date ELO au format ISO `YYYY-MM-DD`. `null` si le fichier n'en porte pas. */
  eloDate: string | null;
  /** Codes de saison rencontrés — normalement un seul. */
  seasonCodes: string[];
  rows: ParsedRankingRow[];
  errors: Array<{ line: number; message: string }>;
}

export class RankingCsvFormatError extends Error {}

const DATE_PATTERN = /^(\d{2})-(\d{2})-(\d{4})$/;

function cell(raw: string | undefined): string {
  return (raw ?? '').trim().replace(/^"(.*)"$/, '$1').trim();
}

/** « 13-08-2026 » → « 2026-08-13 ». Les dates se trient en ISO, pas en français. */
export function toIsoDate(raw: string): string | null {
  const match = DATE_PATTERN.exec(raw.trim());
  if (!match) return null;
  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
}

function toRanking(raw: string): Ranking | null {
  const value = raw.toUpperCase();
  return value && isRanking(value) ? value : null;
}

function toNumber(raw: string): number | null {
  if (!raw) return null;
  const value = Number(raw.replace(',', '.'));
  return Number.isFinite(value) ? value : null;
}

/**
 * Index de la colonne portant la date ELO.
 *
 * Priorité à l'en-tête vide, qui est la signature observée du format ; à défaut, la
 * première cellule de données au format `JJ-MM-AAAA`. Poona peut nommer la colonne un
 * jour sans que l'import se casse.
 */
function findDateColumn(headers: string[], firstRow: string[]): number {
  const empty = headers.findIndex((h) => h === '');
  if (empty !== -1 && toIsoDate(cell(firstRow[empty]))) return empty;
  return firstRow.findIndex((value) => toIsoDate(cell(value)) !== null);
}

export function parseRankingCsv(content: string): RankingCsvResult {
  const lines = content.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length === 0) throw new RankingCsvFormatError('Le fichier est vide.');

  const separator = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(separator).map(cell);
  const index = (name: string) => headers.findIndex((h) => h === name);

  const cols = {
    gender: index('Sexe'),
    lastName: index('Nom'),
    firstName: index('Prénom'),
    licence: index('Licence'),
    season: index('Saison'),
    category: index('Catégorie'),
    muted: index('Muté'),
    singles: index('ELO simple Classement'),
    singlesRank: index('ELO simple rang'),
    cpphSingles: index('ELO simple CPPH'),
    doubles: index('ELO double Classement'),
    doublesRank: index('ELO double rang'),
    cpphDoubles: index('ELO double CPPH'),
    mixed: index('ELO mixte Classement'),
    mixedRank: index('ELO mixte rang'),
    cpphMixed: index('ELO mixte CPPH')
  };

  const required: Array<[keyof typeof cols, string]> = [
    ['licence', 'Licence'], ['lastName', 'Nom'], ['firstName', 'Prénom'], ['gender', 'Sexe'],
    ['singles', 'ELO simple Classement'], ['doubles', 'ELO double Classement'], ['mixed', 'ELO mixte Classement']
  ];
  const missing = required.filter(([key]) => cols[key] === -1).map(([, label]) => label);
  if (missing.length > 0) {
    throw new RankingCsvFormatError(
      `Ce fichier ne ressemble pas à un export ELO Poona : colonnes manquantes — ${missing.join(', ')}.`
    );
  }

  const dataLines = lines.slice(1);
  const dateColumn = findDateColumn(headers, dataLines[0]?.split(separator) ?? []);

  const rows: ParsedRankingRow[] = [];
  const errors: RankingCsvResult['errors'] = [];
  const seasons = new Set<string>();
  const dates = new Set<string>();

  dataLines.forEach((line, i) => {
    const c = line.split(separator);
    const licence = cell(c[cols.licence]);
    const rawGender = cell(c[cols.gender]).toUpperCase();

    if (!licence) {
      errors.push({ line: i + 2, message: 'Licence absente.' });
      return;
    }
    if (rawGender !== 'H' && rawGender !== 'F') {
      errors.push({ line: i + 2, message: `Sexe illisible (« ${rawGender} »).` });
      return;
    }

    if (dateColumn !== -1) {
      const iso = toIsoDate(cell(c[dateColumn]));
      if (iso) dates.add(iso);
    }

    const seasonCode = cell(c[cols.season]);
    if (seasonCode) seasons.add(seasonCode);

    const singles = toRanking(cell(c[cols.singles]));
    const doubles = toRanking(cell(c[cols.doubles]));
    const mixed = toRanking(cell(c[cols.mixed]));

    rows.push({
      licence: normalizeLicence(licence),
      lastName: cell(c[cols.lastName]),
      firstName: cell(c[cols.firstName]),
      gender: rawGender,
      seasonCode,
      category: cell(c[cols.category]),
      mutation: parseMutation(cell(c[cols.muted])),
      singles, doubles, mixed,
      singlesRank: toNumber(cell(c[cols.singlesRank])),
      doublesRank: toNumber(cell(c[cols.doublesRank])),
      mixedRank: toNumber(cell(c[cols.mixedRank])),
      cpphSingles: toNumber(cell(c[cols.cpphSingles])),
      cpphDoubles: toNumber(cell(c[cols.cpphDoubles])),
      cpphMixed: toNumber(cell(c[cols.cpphMixed])),
      nonCompetitor: singles === null && doubles === null && mixed === null
    });
  });

  // Plusieurs dates dans un même fichier n'a pas de sens : on retient la plus récente et
  // l'écran la fait confirmer, plutôt que d'échouer sur un export inhabituel.
  const eloDate = [...dates].sort().pop() ?? null;

  return { eloDate, seasonCodes: [...seasons], rows, errors };
}
