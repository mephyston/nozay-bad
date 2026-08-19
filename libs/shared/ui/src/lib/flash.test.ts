import { describe, it, expect, vi, beforeEach } from 'vitest';

// `vi.mock` est hissé en haut du module : ses fabriques ne peuvent pas fermer sur des
// variables déclarées ici. `vi.hoisted` place ces doubles avant les mocks.
const { navigate, toast } = vi.hoisted(() => ({
  navigate: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() }
}));

vi.mock('astro:transitions/client', () => ({ navigate }));
vi.mock('../components/ui/sonner', () => ({ toast }));

import { flash, flashAndReload, consumeFlash } from './flash';

const STORAGE_KEY = 'nba:flash';
const HREF = 'http://localhost:4321/admin/members';

/** Pose (ou retire) le marqueur que le ClientRouter d'Astro injecte dans le <head>. */
function setClientRouter(present: boolean): void {
  document.head.innerHTML = present
    ? '<meta name="astro-view-transitions-enabled" content="true">'
    : '';
}

function stored(): { type: string; message: string; at: number } | null {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
}

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  setClientRouter(false);
  // jsdom ne sait pas naviguer : on remplace `location` par un double. `flash.ts` n'en
  // lit que `href`, et `reload()` devient observable.
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...window.location, href: HREF, reload: vi.fn() }
  });
});

describe('flashAndReload — page avec ClientRouter (admin)', () => {
  beforeEach(() => setClientRouter(true));

  it('rafraîchit en navigation douce sans empiler d’historique', () => {
    flashAndReload('Adhérent mis à jour.');

    expect(navigate).toHaveBeenCalledWith(HREF, { history: 'replace' });
    expect(window.location.reload).not.toHaveBeenCalled();
  });

  it('empile une entrée d’historique quand la cible est une autre page', () => {
    flashAndReload('Créé.', 'success', '/admin/shop/orders');

    expect(navigate).toHaveBeenCalledWith('http://localhost:4321/admin/shop/orders', undefined);
  });

  it('n’affiche aucun toast directement : le layout va être reconstruit', () => {
    // L'île du layout se ré-hydrate à chaque navigation (ses props changent), ce qui
    // remonte le <Toaster> ; son onMount appelle toastState.reset(). Un toast émis ici
    // serait effacé — seul sessionStorage traverse.
    flashAndReload('Commande validée.', 'success', '/admin/shop/orders');

    expect(toast.success).not.toHaveBeenCalled();
    expect(stored()).toMatchObject({ type: 'success', message: 'Commande validée.' });
  });
});

describe('flashAndReload — page sans ClientRouter (storefront)', () => {
  it('recharge durement et mémorise le message', () => {
    flashAndReload('Commande envoyée.');

    expect(toast.success).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(window.location.reload).toHaveBeenCalled();
    expect(stored()).toMatchObject({ message: 'Commande envoyée.' });
  });

  it('navigue vers la cible fournie plutôt que de recharger', () => {
    flashAndReload('Créé.', 'success', '/commandes');

    expect(window.location.reload).not.toHaveBeenCalled();
    expect(window.location.href).toBe('/commandes');
  });
});

describe('consumeFlash', () => {
  it('rejoue un message récent, une seule fois', () => {
    flash('Enregistré.');

    consumeFlash();
    expect(toast.success).toHaveBeenCalledExactlyOnceWith('Enregistré.');

    consumeFlash();
    expect(toast.success).toHaveBeenCalledOnce();
  });

  it('ignore un message périmé', () => {
    // Cas nominal en navigation douce : le toast direct est déjà à l'écran et
    // personne ne lit l'entrée. Elle ne doit pas ressurgir à un F5 ultérieur.
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ type: 'success', message: 'Vieux message.', at: Date.now() - 60_000 })
    );

    consumeFlash();

    expect(toast.success).not.toHaveBeenCalled();
  });

  it('rejoue une entrée sans horodatage écrite par une version antérieure', () => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ type: 'info', message: 'Legacy.' }));

    consumeFlash();

    expect(toast.info).toHaveBeenCalledWith('Legacy.');
  });

  it('ne fait rien quand rien n’est mémorisé', () => {
    consumeFlash();

    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
    expect(toast.info).not.toHaveBeenCalled();
  });
});
