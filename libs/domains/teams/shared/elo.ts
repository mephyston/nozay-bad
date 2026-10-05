/**
 * Moyenne des cotes CPPH connues d'un joueur — sa « valeur ELO », en points.
 *
 * Sur les tableaux classés seulement : diviser par trois quoi qu'il arrive punirait le
 * joueur qui ne dispute que le simple, alors que sa cote y est ce qu'elle est. `null`
 * quand aucun tableau n'a de cote : un licencié non compétiteur.
 */
export function averageElo(values: Array<number | null | undefined>): number | null {
  const known = values.filter((value): value is number => typeof value === 'number');
  if (known.length === 0) return null;
  return Math.round(known.reduce((sum, value) => sum + value, 0) / known.length);
}

type JoueurCote = { eloAverage: number | null; lastName: string; firstName: string };

/**
 * Du plus fort au plus faible en moyenne ELO, les joueurs sans cote à la fin.
 *
 * Ils ne sont pas « à zéro » : ils ne sont pas sur cette échelle du tout. Les ranger
 * avec les cotes les plus basses les ferait lire comme les plus faibles joueurs du
 * club, alors qu'ils n'ont simplement jamais disputé de compétition. Le nom départage
 * à moyenne égale — et c'est le seul tri qui leur reste entre eux.
 */
export function parMoyenneElo(a: JoueurCote, b: JoueurCote): number {
  if (a.eloAverage !== b.eloAverage) {
    if (a.eloAverage === null) return 1;
    if (b.eloAverage === null) return -1;
    return b.eloAverage - a.eloAverage;
  }
  return a.lastName.localeCompare(b.lastName, 'fr') || a.firstName.localeCompare(b.firstName, 'fr');
}
