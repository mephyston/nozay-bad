import { KeyRound } from '@lucide/svelte';
import { accorder, type SwipeAction, type Tone } from '@nba/ui';

/**
 * Le vocabulaire des détenteurs de clé.
 *
 * La table ne stocke que des licences — c'est une liste courante, pas une trace, et y
 * recopier un prénom le laisserait diverger de l'annuaire. Le nom est donc résolu par
 * la page, et peut manquer : une licence non reprise doit se **voir**, c'est justement
 * l'information utile.
 */

export type OuvreurLike = {
  id: number;
  licence: string;
  sessionsOpened: number;
  /** Résolu par la page. `null` quand l'annuaire de la saison ne connaît pas la licence. */
  name: string | null;
};

/** L'identité : le nom, ou la licence quand l'annuaire ne la connaît pas. */
export const nomDOuvreur = (o: OuvreurLike): string =>
  o.name?.trim() ? o.name.trim() : `Licence ${o.licence}`;

/**
 * Sous le nom, la licence — et rien quand elle sert déjà de titre.
 *
 * La répéter donnerait une ligne qui dit deux fois la même chose, ce que la pastille
 * « licence inconnue » explique déjà mieux.
 */
export const detailDOuvreur = (o: OuvreurLike): string | undefined =>
  o.name?.trim() ? o.licence : undefined;

/** Ce qui compte à droite : combien de séances cette personne a ouvertes. */
export const compteurDOuvreur = (o: OuvreurLike): string => String(o.sessionsOpened);

/** « séance ouverte » / « séances ouvertes » — et le singulier à zéro, comme en français. */
export const legendeDOuvreur = (o: OuvreurLike): string =>
  accorder(o.sessionsOpened, 'séance ouverte', 'séances ouvertes');

/** Une personne qui n'a encore rien ouvert n'est pas une alerte : elle est en retrait. */
export const tonDOuvreur = (o: OuvreurLike): Tone =>
  o.sessionsOpened > 0 ? 'foreground' : 'muted';

/** La pastille ne dit que l'exception : une licence absente de l'annuaire. */
export const pastilleDOuvreur = (o: OuvreurLike): string | undefined =>
  o.name?.trim() ? undefined : 'licence inconnue';

export type GestesDOuvreur = { onRemove: (o: OuvreurLike) => void };

/**
 * Ce qu'on peut faire d'un ouvreur : lui reprendre sa clé, et c'est tout.
 *
 * Une seule action, et elle est destructrice — alors que la règle veut la réversible
 * en tête, puisque c'est elle qu'un balayage long exécute. La parade n'est pas de
 * fabriquer une action de confort pour occuper la place, mais que le geste pose sa
 * question : l'écran le fait, et la sienne dit ce que le retrait ne fait **pas** —
 * les séances déjà acceptées ne sont pas annulées. D'où l'absence de `confirm` ici.
 */
export function gestesDOuvreur(
  droits: { canWrite?: boolean },
  gestes: GestesDOuvreur
): SwipeAction<OuvreurLike>[] {
  if (!droits.canWrite) return [];
  return [
    {
      id: 'reprendre',
      label: 'Reprendre la clé',
      icon: KeyRound,
      tone: 'destructive',
      run: (o) => gestes.onRemove(o)
    }
  ];
}

export type AdherentLike = { licence: string; firstName: string; lastName: string };

/**
 * Les adhérents proposés à l'attribution d'une clé.
 *
 * Trois lettres avant de proposer quoi que ce soit : en deçà, l'annuaire entier
 * défilerait sans aider personne.
 *
 * Le dédoublonnage par licence n'est pas de la prudence : une liste keyée sur une clé
 * en double **fait planter l'îlot entier** — le champ reste à l'écran, rendu côté
 * serveur, plus rien ne réagit, et l'erreur ne se voit qu'en console.
 */
export function adherentsProposes(
  membres: readonly AdherentLike[],
  dejaOuvreurs: ReadonlySet<string>,
  recherche: string,
  maximum = 8
): AdherentLike[] {
  const terme = recherche.trim().toLowerCase();
  if (terme.length < 3) return [];

  const vus = new Set<string>();
  return membres
    .filter((m) => !dejaOuvreurs.has(m.licence))
    .filter((m) => `${m.firstName} ${m.lastName} ${m.licence}`.toLowerCase().includes(terme))
    .filter((m) => {
      if (vus.has(m.licence)) return false;
      vus.add(m.licence);
      return true;
    })
    .slice(0, maximum);
}
