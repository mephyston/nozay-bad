import { toast } from '../components/ui/sonner';

/**
 * Messages de confirmation qui survivent au rechargement de page.
 *
 * Les écrans d'admin sont des pages serveur : après une écriture, on recharge pour
 * réafficher la liste à jour. Un `toast.success()` suivi d'un `window.location.reload()`
 * est donc invisible — il disparaît avec la page qui l'a affiché. On mémorise le
 * message le temps du rechargement, et on le rejoue au montage du layout.
 */

const STORAGE_KEY = 'nba:flash';

export type FlashType = 'success' | 'error' | 'info';

interface Flash {
  type: FlashType;
  message: string;
}

function store(flash: Flash): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(flash));
  } catch {
    // Mode privé / stockage indisponible : on perd le message, jamais l'action.
  }
}

/**
 * Mémorise un message puis recharge la page (ou navigue vers `url`).
 * À utiliser partout où une écriture est suivie d'un rechargement.
 */
export function flashAndReload(message: string, type: FlashType = 'success', url?: string): void {
  store({ type, message });
  if (url) window.location.href = url;
  else window.location.reload();
}

/** Mémorise un message sans recharger (le prochain chargement l'affichera). */
export function flash(message: string, type: FlashType = 'success'): void {
  store({ type, message });
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
    const { type, message } = JSON.parse(raw) as Flash;
    if (!message) return;
    if (type === 'error') toast.error(message);
    else if (type === 'info') toast.info(message);
    else toast.success(message);
  } catch {
    // Contenu illisible (ancien format, écriture concurrente) : on ignore.
  }
}
