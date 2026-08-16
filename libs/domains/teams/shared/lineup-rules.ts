/**
 * Ce qu'une composition doit respecter, et ce qui se signale sans bloquer.
 *
 * Deux niveaux, et la distinction n'est pas cosmétique :
 *
 * - **Erreur** — objectivement vérifiable avec ce qu'on a sous la main : un classement
 *   hors division, un joueur aligné trois fois, un homme en simple dame. Enregistrer une
 *   composition pareille, c'est garantir la pénalité.
 * - **Avertissement** — dépend d'informations encore en mouvement : la valeur de l'équipe
 *   supérieure change tant que son capitaine saisit. Bloquer le premier capitaine parce
 *   que le troisième n'a rien rempli rendrait l'outil inutilisable.
 */

import { DISCIPLINE_GENDER, DISCIPLINE_RANKING, isDouble, type Discipline } from './ranking';
import { isMuted, categoryFamily } from './ranking';
import { rankingOf, fullName, type PlayerRanking } from './player';
import { isEligibleInDiscipline, isEligibleByCategory, describeEligibility } from './eligibility';
import { cd91Points, ffbadPoints } from './scales';
import { computeTeamValue, lineLabel, type LineupEntry, type TeamValue } from './team-value';
import type { ChampionshipRules, DivisionRules, MatchSlot } from './championship';

export type IssueSeverity = 'error' | 'warning';

export interface LineupIssue {
  code: string;
  severity: IssueSeverity;
  message: string;
  /** Référence au règlement, pour que le capitaine puisse vérifier. */
  article: string;
  /** Ligne concernée (« SH2 »), si la règle en vise une. */
  slot?: string;
  licence?: string;
}

/** Une rencontre déjà disputée par un joueur, plus tôt dans la saison. */
export interface PlayerHistoryEntry {
  championship: string;
  teamId: number;
  teamNumber: number;
  weekStart: string;
}

export interface LineupContext {
  rules: ChampionshipRules;
  division: DivisionRules;
  entries: LineupEntry[];
  /** Numéro de l'équipe composée : la titularisation se juge par rapport à lui. */
  teamNumber?: number;
  /** Où chaque joueur a déjà joué cette saison, avant cette journée. */
  history?: Map<string, PlayerHistoryEntry[]>;
  /** Valeur de l'équipe immédiatement supérieure du club sur la **même journée**. */
  upperTeamValue?: number | null;
  upperTeamName?: string | null;
  /** Licences déjà alignées ailleurs dans le club cette **semaine** → nom de l'équipe. */
  busyThisWeek?: Map<string, string>;
}

export interface LineupVerdict {
  value: TeamValue;
  errors: LineupIssue[];
  warnings: LineupIssue[];
  /** Enregistrable : aucune erreur dure. */
  valid: boolean;
}

const err = (code: string, message: string, article: string, extra: Partial<LineupIssue> = {}): LineupIssue =>
  ({ code, severity: 'error', message, article, ...extra });

const warn = (code: string, message: string, article: string, extra: Partial<LineupIssue> = {}): LineupIssue =>
  ({ code, severity: 'warning', message, article, ...extra });

/** Points d'un joueur dans une discipline, au barème du championnat. */
function pointsFor(rules: ChampionshipRules, player: PlayerRanking, discipline: Discipline): number | null {
  const ranked = DISCIPLINE_RANKING[discipline];
  const ranking = rankingOf(player, ranked);
  if (ranking === null) return null;

  return rules.scale === 'ffbad'
    ? ffbadPoints(ranking, { cpph: null, gender: player.gender, discipline: ranked })
    : cd91Points(ranking);
}

/** Force d'une ligne : le joueur, ou la moyenne de la paire. Sert à vérifier l'ordre. */
function lineStrength(rules: ChampionshipRules, entry: LineupEntry): number | null {
  const points = entry.players.map((p) => pointsFor(rules, p, entry.discipline));
  if (points.some((p) => p === null)) return null;
  return (points as number[]).reduce((a, b) => a + b, 0) / points.length;
}

function checkPlayers(ctx: LineupContext, format: MatchSlot[]): LineupIssue[] {
  const issues: LineupIssue[] = [];
  const { rules, division } = ctx;

  /** Matchs par licence, et disciplines déjà occupées : E2 et E3. */
  const matches = new Map<string, { count: number; disciplines: Set<Discipline>; player: PlayerRanking }>();

  for (const entry of ctx.entries) {
    const slot = lineLabel(format, entry.discipline, entry.position);
    const expected = isDouble(entry.discipline) ? 2 : 1;

    if (entry.players.length !== expected) {
      issues.push(
        err('E0', `${slot} : il manque un joueur.`, 'format', { slot })
      );
    }

    const genderRequired = DISCIPLINE_GENDER[entry.discipline];
    for (const player of entry.players) {
      const who = fullName(player);

      // E5 — genre.
      if (genderRequired && player.gender !== genderRequired) {
        issues.push(
          err('E5', `${slot} : ${who} ne peut pas y jouer.`, 'format', { slot, licence: player.licence })
        );
      }

      // E1 — classement admis dans la division, pour la discipline jouée.
      if (!isEligibleInDiscipline(division.eligibility, player, DISCIPLINE_RANKING[entry.discipline])) {
        issues.push(
          err(
            'E1',
            `${slot} : ${who} n'a pas le classement requis. ${describeEligibility(division.eligibility)}`,
            '6.1.3',
            { slot, licence: player.licence }
          )
        );
      }

      // E6 — catégorie d'âge.
      if (!isEligibleByCategory(rules.categories, player)) {
        issues.push(
          err(
            'E6',
            `${who} est en catégorie ${player.category ?? 'inconnue'}, non admise dans ce championnat.`,
            '6.1.2',
            { slot, licence: player.licence }
          )
        );
      }

      const seen = matches.get(player.licence) ?? { count: 0, disciplines: new Set(), player };
      // E3 — deux matchs dans la même discipline.
      if (seen.disciplines.has(entry.discipline)) {
        issues.push(
          err('E3', `${who} dispute deux ${entry.discipline} : c'est interdit.`, '6.2.1', {
            slot,
            licence: player.licence
          })
        );
      }
      seen.count += 1;
      seen.disciplines.add(entry.discipline);
      matches.set(player.licence, seen);
    }
  }

  // E2 — plus de deux matchs.
  for (const [licence, seen] of matches) {
    if (seen.count > rules.maxMatchesPerPlayer) {
      issues.push(
        err(
          'E2',
          `${fullName(seen.player)} dispute ${seen.count} matchs : ${rules.maxMatchesPerPlayer} au maximum.`,
          '6.2.1',
          { licence }
        )
      );
    }
  }

  // E4 — déjà aligné dans une autre équipe du club cette semaine.
  for (const [licence, seen] of matches) {
    const other = ctx.busyThisWeek?.get(licence);
    if (other) {
      issues.push(
        err(
          'E4',
          `${fullName(seen.player)} est déjà aligné avec ${other} cette semaine. Un joueur ne tient qu'une équipe du club par semaine.`,
          '6.3.7',
          { licence }
        )
      );
    }
  }

  // E7 — mutés.
  if (rules.maxMuted !== null) {
    const muted = [...matches.values()].filter((s) => isMuted(s.player.mutation));
    if (muted.length > rules.maxMuted) {
      issues.push(
        err(
          'E7',
          `${muted.length} joueurs mutés alignés : ${rules.maxMuted} au maximum par rencontre.`,
          '6.1.4'
        )
      );
    }
  }

  return issues;
}

function checkOrder(ctx: LineupContext, format: MatchSlot[]): LineupIssue[] {
  const issues: LineupIssue[] = [];
  const byDiscipline = new Map<Discipline, LineupEntry[]>();

  for (const entry of ctx.entries) {
    byDiscipline.set(entry.discipline, [...(byDiscipline.get(entry.discipline) ?? []), entry]);
  }

  for (const [discipline, entries] of byDiscipline) {
    const ordered = [...entries].sort((a, b) => a.position - b.position);
    for (let i = 1; i < ordered.length; i += 1) {
      const before = lineStrength(ctx.rules, ordered[i - 1]);
      const after = lineStrength(ctx.rules, ordered[i]);
      if (before === null || after === null) continue;

      if (after > before) {
        const slot = lineLabel(format, discipline, ordered[i].position);
        issues.push(
          warn(
            'W2',
            `${slot} est plus fort que ${lineLabel(format, discipline, ordered[i - 1].position)} : les joueurs doivent être placés dans l'ordre du classement.`,
            '6.2.2',
            { slot }
          )
        );
      }
    }
  }

  return issues;
}

/**
 * Les trois règles qui regardent en arrière.
 *
 * Elles ne se déduisent d'aucune composition du jour : il faut l'historique de la saison.
 * Toutes trois sont des **avertissements**, jamais des refus — l'historique du club ne
 * connaît que les rencontres saisies ici, or une partie de la saison a pu se jouer avant
 * la mise en service de l'outil. Bloquer sur une base incomplète refuserait des
 * compositions parfaitement régulières.
 */
function checkHistory(ctx: LineupContext): LineupIssue[] {
  const issues: LineupIssue[] = [];
  const history = ctx.history;
  if (!history) return issues;

  /** Les joueurs de la composition, une fois chacun. */
  const players = new Map<string, PlayerRanking>();
  for (const entry of ctx.entries) {
    for (const player of entry.players) players.set(player.licence, player);
  }

  // ── W5 — Titularisation (art. 6.3.2 / 4.6) ──
  if (ctx.teamNumber !== undefined) {
    for (const [licence, player] of players) {
      const perTeam = new Map<number, { number: number; count: number }>();
      for (const past of history.get(licence) ?? []) {
        if (past.championship !== ctx.rules.code) continue;
        const seen = perTeam.get(past.teamId) ?? { number: past.teamNumber, count: 0 };
        seen.count += 1;
        perTeam.set(past.teamId, seen);
      }

      // Titulaire d'une équipe **supérieure** : il ne peut plus redescendre.
      const holding = [...perTeam.values()].find(
        (t) => t.count >= 3 && t.number < (ctx.teamNumber as number)
      );
      if (holding) {
        issues.push(
          warn(
            'W5',
            `${fullName(player)} est titulaire de NBA91-${holding.number} (${holding.count} rencontres) : il ne peut plus être aligné dans une équipe inférieure.`,
            '6.3.2',
            { licence }
          )
        );
      }
    }
  }

  // ── W6 — Renforts venus de l'autre championnat départemental (art. 6.3.2) ──
  const CROSS: Record<string, string> = {
    icd_mixte: 'icd_masculin',
    icd_masculin: 'icd_mixte'
  };
  const other = CROSS[ctx.rules.code];
  if (other) {
    const reinforcements = [...players.keys()].filter((licence) => {
      const past = [...(history.get(licence) ?? [])].sort((a, b) =>
        a.weekStart.localeCompare(b.weekStart)
      );
      // « dont le dernier match disputé était en championnat [de l'autre] ».
      return past.length > 0 && past[past.length - 1].championship === other;
    });

    if (reinforcements.length > 2) {
      issues.push(
        warn(
          'W6',
          `${reinforcements.length} joueurs viennent du championnat voisin, où ils ont disputé leur dernière rencontre : deux au maximum.`,
          '6.3.2'
        )
      );
    }
  }

  // ── W7 — Joueurs venus du régional sur une équipe départementale (art. 6.1.7) ──
  if (ctx.rules.code.startsWith('icd_')) {
    const fromRegional = [...players.keys()].filter((licence) =>
      (history.get(licence) ?? []).some((past) => past.championship === 'icr_seniors')
    );

    if (fromRegional.length > 1) {
      issues.push(
        warn(
          'W7',
          `${fromRegional.length} joueurs ont déjà disputé le régional cette saison : une équipe départementale n'en présente qu'un.`,
          '6.1.7'
        )
      );
    }
  }

  return issues;
}

export function checkLineup(ctx: LineupContext): LineupVerdict {
  const format = ctx.division.format;
  const value = computeTeamValue(ctx.rules, format, ctx.entries);

  const errors = checkPlayers(ctx, format);
  const warnings = [...checkOrder(ctx, format), ...checkHistory(ctx)];

  // W3 — équipe incomplète. Pas une faute : le règlement la prévoit et ajuste le diviseur.
  if (value.incomplete) {
    warnings.push(
      warn(
        'W3',
        `Équipe incomplète : ${value.filledLines} lignes sur ${value.expectedLines}. La valeur est divisée par le nombre de matchs joués.`,
        '6.3.5'
      )
    );
  }

  // W4 — classement manquant : on ne devine pas, on le dit.
  for (const licence of value.unrankedLicences) {
    warnings.push(
      warn('W4', `Aucun classement connu pour la licence ${licence} à la date de référence.`, '6.1.3', {
        licence
      })
    );
  }

  // W1 — hiérarchie des valeurs, comparée **à journée égale**.
  const upper = ctx.upperTeamValue;
  if (value.value !== null && upper != null && value.value > upper) {
    warnings.push(
      warn(
        'W1',
        `Valeur ${value.value.toFixed(2).replace('.', ',')} supérieure à celle de ${ctx.upperTeamName ?? "l'équipe supérieure"} (${upper.toFixed(2).replace('.', ',')}). Les deux équipes perdraient la rencontre par pénalité.`,
        '6.3.2'
      )
    );
  }

  return { value, errors, warnings, valid: errors.length === 0 };
}
