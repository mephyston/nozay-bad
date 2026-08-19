/**
 * Emballe une valeur dans un état profond, pour les tests de composants.
 *
 * `PageEditor` détient ses blocs dans un `$state` et les passe par `bind:block` : le
 * composant enfant reçoit donc un **proxy réactif**, jamais un objet nu. Un test qui
 * monterait un composant avec un littéral se mentirait à lui-même — les écritures de
 * l'enfant aboutiraient sans jamais redessiner, et le test échouerait sur une panne
 * que l'application n'a pas (ou, pire, passerait à côté de celle qu'elle a).
 *
 * Les runes n'étant utilisables que dans un module `.svelte.ts`, ce fichier existe
 * uniquement pour porter celle-ci.
 */
export function deepState<T extends object>(value: T): T {
  const state = $state(value);
  return state;
}
