/**
 * Les critères du grand livre vivent dans l'URL, et s'y modifient toujours pareil.
 *
 * Six fonctions de l'écran répétaient la même séquence — lire la recherche courante,
 * poser ou retirer un paramètre, remettre `page` à 1, naviguer. Recopiée, elle avait
 * déjà divergé : l'effacement des filtres retirait `month`, la pose d'un mois ne
 * retirait rien. Une seule fonction, pure, et testable sans navigateur.
 */

/** Ce qui identifie un critère de la liste. `null` retire le paramètre. */
export type ChangementDeFiltre = Record<string, string | null | undefined>;

/**
 * La nouvelle chaîne de requête, `page` remise à 1.
 *
 * Toute modification d'un critère ramène à la première page : rester page 4 d'une
 * liste qu'on vient de réduire à deux écritures affiche un écran vide, et rien ne
 * dit pourquoi.
 */
export function chaineAvecFiltres(recherche: string, changements: ChangementDeFiltre): string {
  const params = new URLSearchParams(recherche);
  for (const [cle, valeur] of Object.entries(changements)) {
    if (valeur === null || valeur === undefined || valeur === '') params.delete(cle);
    else params.set(cle, valeur);
  }
  params.set('page', '1');
  return params.toString();
}

/** L'adresse complète du journal pour un jeu de critères. */
export const urlDuJournal = (recherche: string, changements: ChangementDeFiltre): string =>
  `/admin/accounting?${chaineAvecFiltres(recherche, changements)}`;

/** Les critères posés par un lien de rapport, que la barre d'outils ne pose jamais elle-même. */
export const FILTRES_DE_RAPPORT = ['category', 'classCode', 'accrual', 'type'] as const;

/** Tout ce qui réduit la liste, pour l'effacement global. */
export const TOUS_LES_FILTRES = [
  ...FILTRES_DE_RAPPORT,
  'month',
  'unreconciledCheques',
  'search'
] as const;

/** Remet chaque critère à zéro d'un coup. La saison et le compte ne sont pas des critères : ils fixent le périmètre. */
export const effacementTotal = (): ChangementDeFiltre =>
  Object.fromEntries(TOUS_LES_FILTRES.map((cle) => [cle, null]));
