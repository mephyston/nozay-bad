/**
 * La taille d'un champ, écrite une seule fois.
 *
 * Deux présentations, et une seule frontière entre elles :
 *
 * - **au doigt**, sous {@link MOBILE_BREAKPOINT} : 44 px de haut, la cible tactile minimale,
 *   et du texte à 16 px — en deçà, Safari iOS zoome sur le champ à la saisie ;
 * - **à la souris**, au-delà : 32 px, en texte à 14 px.
 *
 * La frontière était écrite deux fois, et pas de la même façon : `sm:` (640 px) dans `Input` et
 * `Button`, 768 px dans `IsMobile`, qui décide des écrans de choix plein cadre. Entre les deux, un
 * champ texte de 32 px voisinait avec un sélecteur de 44 px. Le préfixe `md:` de Tailwind **est**
 * {@link MOBILE_BREAKPOINT} : l'un ne change pas sans l'autre.
 *
 * Chaque classe figure ici en toutes lettres : Tailwind lit les sources, il n'exécute rien. On
 * peut assembler ces constantes entre elles ; on ne fabrique jamais une classe par morceaux.
 *
 * Aucun écran ne pose de hauteur sur un champ : `field-sizing.test.ts` le vérifie.
 */

/** En deçà, l'interface se présente au doigt. Tailwind `md` — les deux vont ensemble. */
export const MOBILE_BREAKPOINT = 768;

/** La hauteur d'un champ — et d'un bouton posé à côté, qui doit tomber pile. */
export const FIELD_HEIGHT = 'h-11 md:h-8';

/** Hauteur, marges et corps d'un champ de saisie ou d'une liste déroulante. */
export const FIELD_SIZE = `${FIELD_HEIGHT} px-3 md:px-2.5 py-2 md:py-1 text-base md:text-sm`;

/** Même chose en variante compacte, pour les barres d'outils denses. */
export const FIELD_SIZE_SM = 'h-9 md:h-7 px-2.5 md:px-2 py-1 md:py-0.5 text-base md:text-xs';

/**
 * La rangée d'un champ de choix au doigt : un bouton pleine largeur, bordé comme un champ de
 * saisie, qui ouvre un écran dédié (ou un menu, pour quelques options sans recherche).
 */
export const FIELD_ROW =
  'border-input dark:bg-input/30 flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border bg-transparent px-3 text-base disabled:pointer-events-none disabled:opacity-50';

/** La rangée nue d'un groupe de champs au doigt (interrupteur, date, média) : sans bordure propre. */
export const FIELD_ROW_BARE = 'flex min-h-11 w-full items-center gap-3 px-3';
