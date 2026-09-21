import { describe, it, expect, vi, beforeEach } from 'vitest';

// Même contrainte que flash.test.ts : `vi.mock` est hissé, ses fabriques ne peuvent pas
// fermer sur des variables déclarées ici.
const { navigate, toast, uiAlert } = vi.hoisted(() => ({
  navigate: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
  uiAlert: vi.fn(() => Promise.resolve())
}));

vi.mock('astro:transitions/client', () => ({ navigate }));
vi.mock('../components/ui/sonner', () => ({ toast }));
// Un refus s'acquitte : il ne s'efface plus tout seul au bout de quelques secondes.
vi.mock('../components/ui/alert-dialog/confirm', () => ({ uiAlert }));

import { submitForm } from './form-submit';

const STORAGE_KEY = 'nba:flash';
const HREF = 'http://localhost:4321/admin/accounting/invoices';

function stored(): { type: string; message: string } | null {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
}

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  document.head.innerHTML = '<meta name="astro-view-transitions-enabled" content="true">';
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...window.location, href: HREF, reload: vi.fn() }
  });
});

describe('submitForm — succès', () => {
  it('ferme le formulaire, mémorise la confirmation et réaffiche la liste', async () => {
    const close = vi.fn();

    const ok = await submitForm({
      submit: async () => ({ id: 12 }),
      success: 'Facture créée.',
      close
    });

    expect(ok).toBe(true);
    expect(close).toHaveBeenCalledOnce();
    expect(stored()).toMatchObject({ type: 'success', message: 'Facture créée.' });
    expect(navigate).toHaveBeenCalledWith(HREF, { history: 'replace' });
  });

  it('compose la confirmation à partir du résultat de l’écriture', async () => {
    await submitForm({
      submit: async () => ({ invoiceNumber: 'FAC-2526-NBA91-0007' }),
      success: (invoice) => `Facture ${invoice.invoiceNumber} créée.`
    });

    expect(stored()).toMatchObject({ message: 'Facture FAC-2526-NBA91-0007 créée.' });
  });

  it('ferme avant de naviguer, pour que le sheet ne survive pas à l’échange de DOM', async () => {
    const order: string[] = [];
    navigate.mockImplementation(() => { order.push('navigate'); });

    await submitForm({
      submit: async () => undefined,
      success: 'Enregistré.',
      close: () => order.push('close')
    });

    expect(order).toEqual(['close', 'navigate']);
  });

  it('ne confirme rien quand la liste réaffichée porte déjà la trace', async () => {
    // Le cas courant depuis l'adoption de la doctrine iOS : la ligne créée ou
    // modifiée est la confirmation, et un message ne ferait que la recouvrir.
    const ok = await submitForm({ submit: async () => ({ id: 1 }) });

    expect(ok).toBe(true);
    expect(navigate).toHaveBeenCalled();
    expect(stored()?.message ?? '').toBe('');
  });
});

describe('submitForm — échec de l’écriture', () => {
  it('laisse le formulaire ouvert et ne rafraîchit pas', async () => {
    const close = vi.fn();

    const ok = await submitForm({
      submit: async () => { throw new Error('FOREIGN KEY constraint failed'); },
      success: 'Facture créée.',
      close
    });

    expect(ok).toBe(false);
    expect(close).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(stored()).toBeNull();
    expect(uiAlert).toHaveBeenCalledWith('FOREIGN KEY constraint failed');
  });

  it('route l’erreur vers le formulaire quand l’écran l’affiche lui-même', async () => {
    const onError = vi.fn();

    await submitForm({
      submit: async () => { throw new Error('Numéro de facture déjà attribué, réessayez'); },
      success: 'Facture créée.',
      onError
    });

    expect(onError).toHaveBeenCalledWith('Numéro de facture déjà attribué, réessayez');
    expect(uiAlert).not.toHaveBeenCalled();
  });

  it('affiche un message par défaut quand l’échec n’en porte aucun', async () => {
    await submitForm({
      submit: async () => { throw new Error(''); },
      success: 'Créé.'
    });

    expect(uiAlert).toHaveBeenCalledWith('Une erreur est survenue.');
  });
});

describe('submitForm — validation préalable', () => {
  it('n’émet aucune requête tant que la saisie est invalide', async () => {
    const submit = vi.fn();
    const onError = vi.fn();

    const ok = await submitForm({
      validate: () => 'Le nom du client est requis.',
      submit,
      success: 'Facture créée.',
      onError
    });

    expect(ok).toBe(false);
    expect(submit).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith('Le nom du client est requis.');
  });

  it('poursuit quand la validation ne renvoie rien', async () => {
    const submit = vi.fn().mockResolvedValue(undefined);

    await submitForm({ validate: () => null, submit, success: 'Facture créée.' });

    expect(submit).toHaveBeenCalledOnce();
  });
});
