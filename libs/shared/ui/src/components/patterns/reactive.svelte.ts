/**
 * Emballe des propriétés dans un état réactif, pour les tests de composants.
 *
 * Un composant à propriété `$bindable` écrit **dans l'objet que le parent lui a
 * passé** : monté avec un littéral, il écrirait dans le vide, et le test ne verrait
 * jamais ce que le formulaire aurait réellement enregistré. Les vraies pages
 * détiennent d'ailleurs ces valeurs dans un `$state`, jamais dans un objet nu.
 *
 * Les runes n'étant utilisables que dans un module `.svelte.ts`, ce fichier existe
 * uniquement pour porter celle-ci.
 */
export function reactiveProps<T extends object>(value: T): T {
  const state = $state(value);
  return state;
}
