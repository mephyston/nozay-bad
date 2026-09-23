import { Ban, Pencil, RotateCcw, Users } from '@lucide/svelte';
import { jourCourt, moisEnToutesLettres, type SwipeAction, type Tone } from '@nba/ui';

/**
 * Le vocabulaire des séances de jeu libre.
 *
 * Le tableau en montrait six colonnes ; une ligne de téléphone en porte trois. Ce qui
 * tombe n'est pas perdu : le détail des invités vit dans la feuille des inscrits, qui
 * le donne nominativement — c'est-à-dire mieux qu'un « dont 2 invités » en petit.
 *
 * Les libellés vivent ici et non dans le markup : c'est ce qui les empêche de diverger
 * entre la vue tableau et la vue liste, comme cela s'est produit sur les adhérents.
 */

export type SeanceLike = {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  venue: { name: string } | null;
  minPlayers: number;
  status: 'open' | 'confirmed' | 'cancelled';
  openerFirstName: string | null;
  openerLastName: string | null;
  label: string | null;
  playerCount: number;
  needsOpener: boolean;
};

/** L'identité d'une séance : son jour, et son intitulé quand elle en porte un. */
export const titreDeSeance = (s: SeanceLike): string =>
  s.label?.trim() ? `${jourCourt(s.date)} · ${s.label.trim()}` : jourCourt(s.date);

/** Sous le titre : l'horaire et le gymnase, les deux choses qu'on vérifie avant de venir. */
export const detailDeSeance = (s: SeanceLike): string =>
  `${s.startTime}–${s.endTime} · ${s.venue?.name ?? 'Gymnase inconnu'}`;

/** La valeur qui compte à droite : le remplissage. */
export const remplissageDeSeance = (s: SeanceLike): string => `${s.playerCount}/${s.minPlayers}`;

/**
 * Le ton du remplissage.
 *
 * Il dit une seule chose : la séance a-t-elle de quoi ouvrir ? Une séance annulée ne
 * dit plus rien de son remplissage — son sort est déjà écrit dans sa pastille.
 */
export const tonDeRemplissage = (s: SeanceLike): Tone => {
  if (s.status === 'cancelled') return 'muted';
  return s.playerCount >= s.minPlayers ? 'success' : 'muted';
};

/** L'ouvreur en version courte, `null` quand personne ne s'est encore proposé. */
export const ouvreurDeSeance = (s: SeanceLike): string | undefined => {
  if (!s.openerFirstName) return undefined;
  const initiale = (s.openerLastName ?? '').trim().charAt(0);
  return initiale ? `${s.openerFirstName} ${initiale}.` : s.openerFirstName;
};

/**
 * La pastille, et seulement pour une exception.
 *
 * Le tableau badgeait les quatre états, ouvreur nommé compris. Sur une ligne de
 * téléphone, une pastille à chaque rangée ne distingue plus rien et mange le titre :
 * une séance ouverte et pourvue est le cas courant, elle ne se signale pas. L'ouvreur
 * n'a pas disparu pour autant — il passe sous le remplissage, où il se lit.
 */
export const pastilleDeSeance = (
  s: SeanceLike
): { texte: string; variante: 'destructive' | 'outline' } | undefined => {
  if (s.status === 'cancelled') return { texte: 'Annulée', variante: 'destructive' };
  if (s.needsOpener) return { texte: 'À pourvoir', variante: 'destructive' };
  return undefined;
};

/** Clé de regroupement : le mois. Une saison tient sur dix sections, pas trois cents lignes. */
export const moisDeSeance = (s: SeanceLike): string => s.date.slice(0, 7);



export type DroitsSurSeances = { canWrite?: boolean; canReadRegistrations?: boolean };

export type GestesDeSeance = {
  onRegistrations: (s: SeanceLike) => void;
  onEdit: (s: SeanceLike) => void;
  onCancel: (s: SeanceLike) => void;
  onReopen: (s: SeanceLike) => void;
};

/**
 * Ce qu'on peut faire d'une séance.
 *
 * Les inscrits viennent en tête : c'est le geste le plus fréquent — on regarde qui
 * vient avant de décider d'ouvrir —, et c'est le seul qui ne change rien. Or la
 * première action déclarée est celle qu'un balayage long exécute : elle doit être
 * réversible, toujours.
 *
 * Ni l'annulation ni la réouverture ne portent de `confirm` : l'annulation ouvre un
 * formulaire qui réclame un motif, la réouverture pose déjà sa propre question — et
 * celle-ci dit ce que la réouverture fait aux inscriptions, ce qu'une formule
 * générique tairait.
 */
export function gestesDeSeance(
  droits: DroitsSurSeances,
  gestes: GestesDeSeance
): SwipeAction<SeanceLike>[] {
  const liste: SwipeAction<SeanceLike>[] = [];

  if (droits.canReadRegistrations) {
    liste.push({
      id: 'inscrits',
      label: 'Voir les inscrits',
      icon: Users,
      tone: 'primary',
      run: (s) => gestes.onRegistrations(s)
    });
  }

  if (droits.canWrite) {
    liste.push({ id: 'modifier', label: 'Modifier', icon: Pencil, run: (s) => gestes.onEdit(s) });
    liste.push(
      {
        id: 'sort',
        label: 'Annuler la séance',
        icon: Ban,
        tone: 'destructive',
        run: (s) => gestes.onCancel(s)
      }
    );
  }

  return liste;
}

/**
 * Les gestes d'une séance **annulée** : rouvrir remplace annuler.
 *
 * Deux listes plutôt qu'un ternaire dans le markup — c'est la seule différence entre
 * les deux états, et elle se teste.
 */
export function gestesDeSeanceAnnulee(
  droits: DroitsSurSeances,
  gestes: GestesDeSeance
): SwipeAction<SeanceLike>[] {
  return gestesDeSeance(droits, gestes).map((action) =>
    action.id === 'sort'
      ? { id: 'sort', label: 'Rouvrir', icon: RotateCcw, run: (s: SeanceLike) => gestes.onReopen(s) }
      : action
  );
}

/** La liste des gestes qui convient à l'état de la séance. */
export const gestesPourSeance = (
  s: SeanceLike,
  droits: DroitsSurSeances,
  gestes: GestesDeSeance
): SwipeAction<SeanceLike>[] =>
  s.status === 'cancelled' ? gestesDeSeanceAnnulee(droits, gestes) : gestesDeSeance(droits, gestes);

/**
 * Ce que l'appui sur la ligne déclenche — et donc ce que le balayage ne doit pas refaire.
 *
 * Lire qui vient est le geste le plus fréquent, et le chevron d'une ligne promet un
 * détail : c'est celui-là. Sans ce droit, l'appui modifie ; sans droit du tout, la
 * ligne n'est pas tappable et ne porte pas de chevron.
 */
export const gestePrincipal = (droits: DroitsSurSeances): 'inscrits' | 'modifier' | null => {
  if (droits.canReadRegistrations) return 'inscrits';
  if (droits.canWrite) return 'modifier';
  return null;
};

/**
 * Les gestes offerts au balayage, une fois retiré celui que l'appui fait déjà.
 *
 * Une action qui se trouve à la fois sous le doigt et sous le balayage coûte une
 * rangée d'encombrement pour ne rien ajouter — et brouille la promesse du chevron.
 */
export const gestesAuBalayage = (
  s: SeanceLike,
  droits: DroitsSurSeances,
  gestes: GestesDeSeance
): SwipeAction<SeanceLike>[] => {
  const principal = gestePrincipal(droits);
  return gestesPourSeance(s, droits, gestes).filter((action) => action.id !== principal);
};
