/**
 * Les publics d'un créneau, tels que le bloc « Créneaux » les propose.
 *
 * Recopiés du domaine `schedules` pour la même raison que les catégories de l'agenda :
 * le CMS ne dépend d'aucun autre domaine. Le test voisin compare les deux listes et
 * tombe si l'une bouge sans l'autre.
 *
 * Le champ était jusqu'ici une ligne de texte où l'on saisissait « minibad, poussins »
 * à la main : une faute de frappe ne levait rien et le bloc n'affichait simplement
 * aucun créneau, sans dire pourquoi.
 */
export const PUBLICS_DE_CRENEAU: { value: string; label: string }[] = [
  { value: 'minibad', label: 'Minibad (U9)' },
  { value: 'poussins', label: 'Poussins (U11)' },
  { value: 'jeunes', label: 'Jeunes' },
  { value: 'elite_jeunes', label: 'Élite Jeunes' },
  { value: 'adultes_loisir', label: 'Adultes loisirs' },
  { value: 'adultes_competition', label: 'Adultes compétition' },
  { value: 'jeu_libre', label: 'Jeu libre' }
];
