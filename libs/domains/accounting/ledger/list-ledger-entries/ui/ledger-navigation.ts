/**
 * Comment on arrive sur le journal, et où l'on y atterrit.
 *
 * Deux préoccupations que l'écran portait dans son corps : les points d'entrée
 * — raccourcis de la PWA, événements de la barre du bas — et la restauration de la
 * position après un rechargement. Ni l'une ni l'autre ne parle d'écritures ; les
 * sortir rend le composant lisible et laisse ces mécaniques se documenter seules.
 */

export type NatureDeSaisie = 'recette' | 'depense' | 'transfert';

const RACCOURCIS: Record<string, NatureDeSaisie> = {
  'new-recette': 'recette',
  'new-depense': 'depense',
  'new-transfert': 'transfert'
};

const EVENEMENTS: Record<string, NatureDeSaisie> = {
  'open-new-recette': 'recette',
  'open-new-depense': 'depense',
  'open-new-transfert': 'transfert'
};

/**
 * Ouvre le bon formulaire quand on arrive par un raccourci, et écoute ceux que la
 * barre du bas émet ensuite. Rend de quoi se désabonner.
 *
 * Le paramètre `action` est retiré de l'URL dès qu'il a servi : sans cela, un
 * rafraîchissement rouvrirait le formulaire, et un partage du lien l'ouvrirait chez
 * le destinataire.
 */
export function ecouterPointsDEntree(ouvrir: (nature: NatureDeSaisie) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const action = new URLSearchParams(window.location.search).get('action');
  const nature = action ? RACCOURCIS[action] : undefined;
  if (nature) {
    ouvrir(nature);
    const url = new URL(window.location.href);
    url.searchParams.delete('action');
    window.history.replaceState({}, '', url);
  }

  const poses = Object.entries(EVENEMENTS).map(([nom, valeur]) => {
    const ecoute = () => ouvrir(valeur);
    window.addEventListener(nom, ecoute);
    return () => window.removeEventListener(nom, ecoute);
  });
  return () => poses.forEach((retirer) => retirer());
}

/** Les critères posés par un lien de rapport, lus dans l'URL au montage. */
export function criteresDeRapport(recherche: string): {
  category: string | null;
  classCode: string | null;
  accrual: string | null;
  type: string | null;
} {
  const params = new URLSearchParams(recherche);
  return {
    category: params.get('category'),
    classCode: params.get('classCode'),
    accrual: params.get('accrual'),
    type: params.get('type')
  };
}

const CLE_ECRITURE = 'scrollToTx';
const CLE_POSITION = 'ledger_scroll_y';

/** Retient où l'on était, pour y revenir après le rechargement qu'une écriture provoque. */
export function retenirPosition(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(CLE_POSITION, String(window.scrollY));
}

/**
 * Remet la page là où on l'avait laissée.
 *
 * Deux cas : on revient du rapprochement sur une écriture précise, ou l'on vient de
 * supprimer une ligne et la page s'est rechargée. Les deux tentatives décalées
 * couvrent les îlots qui s'hydratent après le premier rendu.
 *
 * La mise en évidence vise la couche glissante quand il y en a une : sur une rangée
 * de liste, c'est elle qui porte le fond, et une classe posée sur le `<li>` passerait
 * dessous sans rien changer à l'écran.
 */
export function restaurerPosition(aDesLignes: boolean): void {
  if (typeof window === 'undefined' || !aDesLignes) return;

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  const ecriture = sessionStorage.getItem(CLE_ECRITURE);
  if (ecriture) {
    sessionStorage.removeItem(CLE_ECRITURE);
    const viser = (surligner: boolean) => {
      const auDoigt = window.innerWidth < 640;
      const el = document.getElementById(`tx-${auDoigt ? 'mobile' : 'desktop'}-${ecriture}`);
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (!surligner) return;
      const cible = el.querySelector<HTMLElement>('[data-swipe-layer]') ?? el;
      cible.classList.add('bg-muted', 'transition-colors', 'duration-1000');
      setTimeout(() => cible.classList.remove('bg-muted'), 2000);
    };
    setTimeout(() => viser(true), 100);
    setTimeout(() => viser(false), 600);
  }

  const position = sessionStorage.getItem(CLE_POSITION);
  if (position) {
    sessionStorage.removeItem(CLE_POSITION);
    const y = parseInt(position, 10);
    setTimeout(() => window.scrollTo({ top: y, behavior: 'instant' }), 100);
    setTimeout(() => window.scrollTo({ top: y, behavior: 'instant' }), 600);
  }
}
