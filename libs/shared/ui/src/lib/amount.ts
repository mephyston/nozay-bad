/**
 * Mise en forme d'un montant, en une seule règle.
 *
 * Extrait de `<Amount>` pour que les fonctions de projection d'une vue liste
 * puissent produire une valeur textuelle sans recopier les conventions
 * (séparateur de milliers insécable, devise collée par une espace insécable,
 * signe explicite optionnel). Deux formatages pour une même somme, c'est la
 * dérive assurée entre la vue tableau et la vue liste.
 */
export function centsFrom({ cents, euros }: { cents?: number | null; euros?: number | null }): number {
  if (euros !== undefined && euros !== null && !isNaN(euros)) return Math.round(euros * 100);
  if (cents !== undefined && cents !== null && !isNaN(cents)) return cents;
  return 0;
}

export function formatAmount(
  cents: number,
  { showSign = false, currency = '€' }: { showSign?: boolean; currency?: string } = {}
): string {
  const absEuros = Math.abs(cents) / 100;
  const nombre = new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(absEuros)
    .replace(/\s/g, ' ');

  const signe = cents < 0 ? '-' : showSign && cents > 0 ? '+' : '';
  // `currency: ''` rend le nombre seul — c'est ce dont `<Amount>` a besoin, qui
  // pose lui-même la devise dans son markup.
  return currency ? `${signe}${nombre} ${currency}` : `${signe}${nombre}`;
}
