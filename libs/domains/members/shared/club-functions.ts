/**
 * Fonctions au club — le bureau et l'encadrement, par saison.
 *
 * Ce n'est ni un rôle IAM (aucun droit d'accès n'en découle) ni un attribut Poona :
 * la fonction est décidée en assemblée générale et saisie à la main dans l'admin.
 * Son premier usage est le ciblage de notifications « gestion du club » (ex. rappel
 * d'import des classements avant une journée d'interclubs régional).
 */
export const CLUB_FUNCTIONS = [
  'president',
  'vice_president',
  'secretary',
  'treasurer',
  'treasurer_deputy',
  'committee_member',
  'coach'
] as const;

export type ClubFunction = (typeof CLUB_FUNCTIONS)[number];

export const CLUB_FUNCTION_LABELS: Record<ClubFunction, string> = {
  president: 'Président',
  vice_president: 'Vice-président',
  secretary: 'Secrétaire',
  treasurer: 'Trésorier',
  treasurer_deputy: 'Trésorier adjoint',
  committee_member: "Membre du comité d'administration",
  coach: 'Entraîneur'
};

/**
 * Fonctions à titulaire unique sur une saison (statuts du club) : un seul président,
 * un seul secrétaire, un seul trésorier, un seul trésorier adjoint. Les autres
 * fonctions acceptent plusieurs titulaires (vice-présidents, membres du CA, entraîneurs).
 */
export const SINGLE_HOLDER_FUNCTIONS: readonly ClubFunction[] = [
  'president',
  'secretary',
  'treasurer',
  'treasurer_deputy'
];

/**
 * Fonctions sans lesquelles le club ne tourne pas : tant que l'une manque sur la
 * saison en cours, le menu « Dirigeants » signale une action à réaliser.
 */
export const REQUIRED_FUNCTIONS: readonly ClubFunction[] = ['president', 'treasurer'];

export function isClubFunction(value: string): value is ClubFunction {
  return (CLUB_FUNCTIONS as readonly string[]).includes(value);
}
