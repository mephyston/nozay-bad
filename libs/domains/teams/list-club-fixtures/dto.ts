export interface ListClubFixturesInput {
  seasonCode: string;
  /** Premier jour considéré, AAAA-MM-JJ. Aujourd'hui par défaut. */
  from?: string;
  /** Dernier jour considéré, AAAA-MM-JJ, inclus. Toute la saison par défaut. */
  to?: string;
}

/**
 * Une rencontre d'une équipe du club, telle que tout adhérent peut la lire : quand, où,
 * contre qui. Jamais la composition — elle ne regarde que l'équipe.
 */
export interface ClubFixture {
  teamId: number;
  /** Numéro de l'équipe dans le club : il ordonne et colore les équipes. */
  teamNumber: number;
  teamName: string;
  championshipLabel: string;
  /** « ICR », « ICD Mixte » : pour les affichages serrés. */
  championshipShortLabel: string;
  divisionLabel: string;
  dayNumber: number;
  /** Rang de la rencontre dans la journée : 2 pour la seconde (régional, vétérans). */
  slot: number;
  dayLabel: string | null;
  weekStart: string;
  weekEnd: string;
  /** Date, heure comprise si le capitaine l'a saisie ; `null` tant que seule la semaine est sûre. */
  date: string | null;
  dateSource: 'captain' | 'committee' | null;
  opponent: string | null;
  venue: string | null;
}

export interface ClubTeam {
  id: number;
  number: number;
  name: string;
  championshipLabel: string;
}

export interface ListClubFixturesOutput {
  fixtures: ClubFixture[];
  /** Toutes les équipes publiées, même sans rencontre sur la période : c'est la liste du filtre. */
  teams: ClubTeam[];
}
