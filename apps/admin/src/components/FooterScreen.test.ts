import { describe, it, expect, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import FooterScreen from './FooterScreen.svelte';

const REGLAGES = {
  footerDescription: "Plus qu'une Tribu !",
  footerAddress: 'Place de la Mairie, 91620 Nozay',
  instagramUrl: 'https://www.instagram.com/nozaybad/',
  facebookUrl: 'https://www.facebook.com/nozaybad/'
};

/** Le relais du domaine, tel que l'écran le reçoit. */
function poserLeRelais(donnees: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true, data: donnees })
    })
  );
}

const valeurs = (target: HTMLElement) =>
  Object.fromEntries(
    [...target.querySelectorAll('input, textarea')].map((e) => [
      (e as HTMLInputElement).id,
      (e as HTMLInputElement).value
    ])
  );

describe('FooterScreen', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.unstubAllGlobals();
  });

  it('remplit le formulaire avec les réglages du site', async () => {
    /*
      L'écran passait `settings={d.settings}` à un formulaire qui déclare ses quatre
      valeurs **à plat**. La prop inconnue était ignorée : les champs s'affichaient
      vides quoi qu'il y ait en base. Et comme l'enregistrement envoie les quatre
      états tels quels, ouvrir la page et cliquer « Enregistrer » effaçait la
      présentation, l'adresse et les réseaux du site public.
    */
    poserLeRelais({ settings: REGLAGES, canWrite: true });

    const target = document.createElement('div');
    document.body.appendChild(target);
    const component = mount(FooterScreen, { target, props: {} });

    // Le chargement est asynchrone : on laisse la promesse du relais se dénouer.
    await vi.waitFor(() => {
      flushSync();
      expect(target.querySelector('#footer-description')).not.toBeNull();
    });

    expect(valeurs(target)).toEqual({
      'footer-description': REGLAGES.footerDescription,
      'footer-address': REGLAGES.footerAddress,
      'footer-instagram': REGLAGES.instagramUrl,
      'footer-facebook': REGLAGES.facebookUrl
    });

    unmount(component);
  });
});
