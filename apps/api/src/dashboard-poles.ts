/**
 * Le bilan des pôles du tableau de bord, assemblé depuis une ligne par pôle, catégorie et sens.
 *
 * Les pôles sont ceux du bureau (`category_groups`, kind `pole`), dans son ordre. Un pôle
 * sans mouvement reste affiché, à zéro : il dit que rien n'a encore été passé, pas qu'il
 * n'existe plus.
 */
export interface PoleRow {
  poleId: number;
  poleLabel: string;
  label: string | null;
  type: 'recette' | 'depense' | null;
  total: number | null;
}

export interface PoleDetail { label: string; recettes: number; depenses: number; solde: number }
export interface PoleBilan { id: number; label: string; recettes: number; depenses: number; solde: number; details: PoleDetail[] }

export function assemblePoles(rows: PoleRow[]): PoleBilan[] {
  const poles = new Map<number, PoleBilan>();
  for (const row of rows) {
    let pole = poles.get(row.poleId);
    if (!pole) {
      pole = { id: row.poleId, label: row.poleLabel, recettes: 0, depenses: 0, solde: 0, details: [] };
      poles.set(row.poleId, pole);
    }
    if (!row.label || !row.type) continue;
    const amount = row.total ?? 0;
    let detail = pole.details.find((d) => d.label === row.label);
    if (!detail) {
      detail = { label: row.label, recettes: 0, depenses: 0, solde: 0 };
      pole.details.push(detail);
    }
    if (row.type === 'recette') { pole.recettes += amount; detail.recettes += amount; }
    else { pole.depenses += amount; detail.depenses += amount; }
  }
  for (const pole of poles.values()) {
    pole.solde = pole.recettes - pole.depenses;
    for (const d of pole.details) d.solde = d.recettes - d.depenses;
    // Les plus actives d'abord.
    pole.details.sort((a, b) => (b.recettes + b.depenses) - (a.recettes + a.depenses));
  }
  return [...poles.values()];
}
