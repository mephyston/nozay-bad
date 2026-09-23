/**
 * Les catégories d'événements, telles que le bloc agenda les propose.
 *
 * Recopiées du domaine `events` **à dessein** : le CMS ne dépend d'aucun autre
 * domaine, et lui faire importer l'agenda pour six libellés créerait ce couplage
 * pour rien. Le prix de ce choix est qu'elles peuvent diverger — d'où le test voisin,
 * qui compare les deux listes et tombe si l'une bouge sans l'autre. C'est le
 * commentaire « les deux listes doivent coïncider » rendu exécutable.
 */
export const CATEGORIES_DAGENDA: { value: string; label: string }[] = [
  { value: 'competition', label: 'Compétition' },
  { value: 'interclubs', label: 'Interclubs' },
  { value: 'tournoi', label: 'Tournoi' },
  { value: 'stage', label: 'Stage' },
  { value: 'vie_du_club', label: 'Vie du club' },
  { value: 'assemblee', label: 'Assemblée' }
];
