import { hasClientRouter, softNavigate } from './navigation';
import { toast } from '../components/ui/sonner';

/**
 * Messages de confirmation qui survivent au changement de page.
 *
 * Après une écriture, les écrans d'admin réaffichent la liste à jour. Que la page
 * échange son DOM (`<ClientRouter />`, côté admin) ou se recharge complètement
 * (storefront), le layout qui porte le `<Toaster>` est **reconstruit** dans les deux
 * cas — un `toast()` émis avant la navigation serait donc invisible :
 *
 *  - en rechargement dur, le contexte JS entier disparaît ;
 *  - en navigation douce, l'île du layout se ré-hydrate (les props diffèrent d'une
 *    page à l'autre, et `astro-island` déclare `observedAttributes = ["props"]`), ce
 *    qui remonte le `<Toaster>` ; son `onMount` appelle `toastState.reset()` et vide
 *    la file de toasts.
 *
 * Le message transite donc toujours par `sessionStorage`, et `consumeFlash()` le rejoue
 * au montage du layout.
 *
 * Un `transition:persist` sur le layout ferait bien survivre le `<Toaster>`, mais il
 * est **inapplicable ici** : `<AdminLayout>` enveloppe le contenu de la page, et Astro
 * remplace la nouvelle île par l'ancienne — le contenu ne changerait plus jamais.
 */

const STORAGE_KEY = 'nba:flash';

/**
 * Au-delà de ce délai un message mémorisé est considéré comme périmé.
 *
 * Garde-fou contre un rejeu sans rapport : si l'utilisateur quitte l'application avant
 * que le layout n'ait pu consommer le message, un retour bien plus tard ne doit pas
 * ressortir une confirmation oubliée. Large par rapport au délai réel (le layout est
 * `client:idle`, il s'hydrate en quelques dizaines de ms).
 */
const MAX_AGE_MS = 30_000;

export type FlashType = 'success' | 'error' | 'info';

interface Flash {
  type: FlashType;
  message: string;
  at: number;
}

function store(type: FlashType, message: string): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ type, message, at: Date.now() } satisfies Flash));
  } catch {
    // Mode privé / stockage indisponible : on perd le message, jamais l'action.
  }
}

function show(type: FlashType, message: string): void {
  if (type === 'error') toast.error(message);
  else if (type === 'info') toast.info(message);
  else toast.success(message);
}

/**
 * Affiche un message puis rafraîchit la page (ou navigue vers `url`).
 * À utiliser partout où une écriture doit être suivie d'un réaffichage des données.
 */
export function flashAndReload(message: string, type: FlashType = 'success', url?: string): void {
  store(type, message);

  if (!hasClientRouter()) {
    // `location.href = <même URL>` ne recharge pas si l'URL porte un fragment :
    // on passe explicitement par reload() quand il n'y a pas de cible distincte.
    if (url) window.location.href = url;
    else window.location.reload();
    return;
  }

  softNavigate(url ?? window.location.href);
}

/**
 * Mémorise un message sans rien afficher : le prochain chargement le rejouera, à
 * condition qu'il survienne dans les `MAX_AGE_MS`. À réserver aux écritures suivies
 * immédiatement d'une navigation dure que l'on déclenche soi-même.
 */
export function flash(message: string, type: FlashType = 'success'): void {
  store(type, message);
}

/**
 * Rejoue le message mémorisé, une seule fois. À appeler au montage du layout de
 * chaque application.
 */
export function consumeFlash(): void {
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    return;
  }
  if (!raw) return;

  try {
    const { type, message, at } = JSON.parse(raw) as Flash;
    if (!message) return;
    // `at` absent : entrée écrite par une version antérieure, on la rejoue.
    if (typeof at === 'number' && Date.now() - at > MAX_AGE_MS) return;
    show(type, message);
  } catch {
    // Contenu illisible (ancien format, écriture concurrente) : on ignore.
  }
}
