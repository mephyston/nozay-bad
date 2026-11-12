/**
 * « Où va votre cotisation » : ce que coûte un adhérent, et qui le paie.
 *
 * Chaque rubrique est ramenée à son **solde** : une rubrique qui dépense plus qu'elle
 * n'encaisse est une charge (les volants, revendus en partie), une rubrique qui encaisse
 * plus qu'elle ne dépense est une ressource (les tournois, la buvette, les stages).
 */
export type FeeBreakdownSource = 'budget' | 'previous' | 'current';

export interface FeeBreakdownLine {
  /** Rubrique ; null pour « Autres », les catégories que le bureau n'a pas rangées. */
  id: number | null;
  label: string;
  cents: number;
  perMemberCents: number;
  /** Part du total de son côté (charges ou ressources), entre 0 et 1. */
  share: number;
  membershipFees: boolean;
  /** Le détail par catégorie, servi à l'administration seulement. */
  categories?: { label: string; cents: number }[];
}

export interface FeeBreakdown {
  season: string;
  /** D'où viennent les chiffres : le budget de la saison, la saison close précédente, ou le réalisé. */
  source: FeeBreakdownSource;
  sourceSeason: string;
  memberCount: number;
  charges: FeeBreakdownLine[];
  totalChargesCents: number;
  costPerMemberCents: number;
  resources: FeeBreakdownLine[];
  totalResourcesCents: number;
  membershipFeesCents: number;
  averageFeeCents: number;
  /** Part des charges que couvrent les cotisations, entre 0 et 1 (peut dépasser 1). */
  feeCoverage: number;
  /** Ce qui manquerait par adhérent avec les seules cotisations ; 0 si elles suffisent. */
  gapPerMemberCents: number;
  resultCents: number;
  /** Avec un budget : les dépenses déjà passées cette saison, face aux dépenses prévues. */
  progress: { realisedChargesCents: number; plannedChargesCents: number } | null;
}

/** Un montant par catégorie et par sens, tiré du budget ou du grand livre. */
export interface AmountRow {
  categoryId: number | null;
  type: 'recette' | 'depense';
  cents: number;
}

export interface CategoryRef {
  id: number;
  adminLabel: string;
  adherentLabel: string;
  rubriqueId: number | null;
}

export interface RubriqueRef {
  id: number;
  label: string;
  position: number;
  membershipFees: boolean;
}

/** Effectif d'une saison, hors dossiers suspendus : injecté, il vit chez les adhérents. */
export type CountMembers = (seasonId: number) => Promise<number>;
