/**
 * Domain helper: normalise a category value to its numeric ID.
 * Belongs to the `accounting` domain — proprietary business rule.
 * Supports both numeric IDs and legacy string keys from older imports.
 */
export function normalizeCategory(categoryVal: unknown): number | null {
  if (categoryVal === undefined || categoryVal === null) return null;
  const num = Number(categoryVal);
  if (!isNaN(num)) return num;

  const legacyMap: Record<string, number> = {
    adhesions_inscriptions: 1,
    sponsoring: 2,
    subventions: 3,
    actions_jeunes: 4,
    tournois_senior: 5,
    evenements_buvettes: 6,
    cordage_vente: 7,
    volants: 8,
    salaires_charges: 9,
    materiel_club: 10,
    licences_federation: 11,
    championnats: 12,
    stages_formations: 13,
    fonctionnement_administratif: 14,
  };
  return legacyMap[categoryVal as string] ?? null;
}
