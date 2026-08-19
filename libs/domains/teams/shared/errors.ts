import { AppError } from '@nba/db';

export class RankingDateMissingError extends AppError {
  constructor(
    message = "Ce fichier ne porte aucune date de classement. Indiquez-la avant d'importer."
  ) {
    super(message, 400);
    this.name = 'RankingDateMissingError';
  }
}

export class InvalidRankingFileError extends AppError {
  constructor(message: string) {
    super(message, 400);
    this.name = 'InvalidRankingFileError';
  }
}

/** 404 : on ne corrige que ce qui existe, et à la date où on le regarde. */
export class RankingNotFoundError extends AppError {
  constructor(message = "Aucun classement à cette date pour ce licencié.") {
    super(message, 404);
    this.name = 'RankingNotFoundError';
  }
}

export class TeamNotFoundError extends AppError {
  constructor(message = 'Équipe introuvable') {
    super(message, 404);
    this.name = 'TeamNotFoundError';
  }
}

export class UnknownChampionshipError extends AppError {
  constructor(message = 'Championnat ou division inconnu.') {
    super(message, 400);
    this.name = 'UnknownChampionshipError';
  }
}

/**
 * 409 : deux équipes ne peuvent pas porter le même numéro dans un championnat.
 *
 * Le numéro n'est pas une étiquette, c'est la hiérarchie que le règlement contrôle. Deux
 * équipes qui le partagent rendraient indéterminée la question « laquelle doit rester en
 * dessous de l'autre ».
 */
export class TeamNumberTakenError extends AppError {
  constructor(championshipLabel: string, number: number) {
    super(`Une équipe porte déjà le numéro ${number} en ${championshipLabel}.`, 409);
    this.name = 'TeamNumberTakenError';
  }
}

/** 400 : une journée doit exister avant qu'on y place une rencontre. */
export class ChampionshipDayNotFoundError extends AppError {
  constructor(message = 'Journée introuvable.') {
    super(message, 404);
    this.name = 'ChampionshipDayNotFoundError';
  }
}

/**
 * 403 : seuls le capitaine et le vice-capitaine engagent leur équipe.
 *
 * Le droit ne vient pas d'un rôle d'administration mais de la désignation dans l'équipe,
 * comme `expenseAuthorized` pour les notes de frais. L'espace adhérent masque le bouton,
 * mais c'est ici que la règle est tenue : masquer n'est pas interdire.
 */
export class NotTeamCaptainError extends AppError {
  constructor(message = "Seuls le capitaine et le vice-capitaine peuvent composer cette équipe.") {
    super(message, 403);
    this.name = 'NotTeamCaptainError';
  }
}

/** 422 : la composition enfreint une règle que le règlement sanctionne. */
export class InvalidLineupError extends AppError {
  constructor(message: string) {
    super(message, 422);
    this.name = 'InvalidLineupError';
  }
}
