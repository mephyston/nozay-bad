import { accorder } from '@nba/ui';

/**
 * Ce qu'on dit d'un import de classements.
 *
 * Tout était écrit en « classement(s) importé(s) », « compétiteur(s) sans adhérent ».
 * Cette parenthèse est une façon de ne pas choisir : elle se lit mal, et elle est
 * inutile puisque le nombre est juste à côté. `accorder` tranche — et met le singulier
 * à zéro, comme le français le veut.
 */

export type RapportDImport = {
  imported: number;
  eloDate: string;
  nonCompetitors: number;
  unmatched: unknown[];
  errors: unknown[];
};

/**
 * Le verdict d'un import, en une phrase.
 *
 * Les trois réserves ne s'énoncent que lorsqu'elles existent : annoncer « 0 ligne
 * illisible » à chaque import ferait chercher un problème là où il n'y en a pas.
 */
export function resumeDImport(r: RapportDImport): string {
  const morceaux = [
    `${r.imported} ${accorder(r.imported, 'classement')} ${accorder(r.imported, 'importé')} au ${r.eloDate}`
  ];
  if (r.nonCompetitors > 0) {
    morceaux.push(
      `${r.nonCompetitors} ${accorder(r.nonCompetitors, 'non compétiteur')} ${accorder(r.nonCompetitors, 'ignoré')}`
    );
  }
  if (r.unmatched.length > 0) {
    morceaux.push(
      `${r.unmatched.length} ${accorder(r.unmatched.length, 'compétiteur')} sans adhérent`
    );
  }
  if (r.errors.length > 0) {
    morceaux.push(
      `${r.errors.length} ${accorder(r.errors.length, 'ligne')} ${accorder(r.errors.length, 'illisible')}`
    );
  }
  return `${morceaux.join(', ')}.`;
}

/**
 * Ce que le fichier contient, avant de l'envoyer.
 *
 * C'est la seule occasion de s'apercevoir qu'on a pris le mauvais export : le nombre
 * de compétiteurs et la ou les saisons trouvées sont ce qui le révèle.
 */
export function pastillesDeFichier(apercu: {
  competiteurs: number;
  nonCompetiteurs: number;
  saisons: readonly string[];
  erreurs: number;
}): { label: string; variant: 'secondary' | 'outline' | 'destructive' }[] {
  const liste: { label: string; variant: 'secondary' | 'outline' | 'destructive' }[] = [
    {
      label: `${apercu.competiteurs} ${accorder(apercu.competiteurs, 'compétiteur')}`,
      variant: 'secondary'
    }
  ];
  if (apercu.nonCompetiteurs > 0) {
    liste.push({
      label: `${apercu.nonCompetiteurs} ${accorder(apercu.nonCompetiteurs, 'non compétiteur')}`,
      variant: 'outline'
    });
  }
  for (const saison of apercu.saisons) liste.push({ label: `Saison ${saison}`, variant: 'outline' });
  if (apercu.erreurs > 0) {
    liste.push({
      label: `${apercu.erreurs} ${accorder(apercu.erreurs, 'ligne')} ${accorder(apercu.erreurs, 'illisible')}`,
      variant: 'destructive'
    });
  }
  return liste;
}
