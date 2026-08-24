import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, flushSync } from 'svelte';
import OpenPlayManager from './OpenPlayManager.svelte';

/**
 * L'écran du bureau.
 *
 * Le rendu du tableau est le seul endroit où le piège de `DataTable` se voit : le
 * composant confie la ligne à l'appelant, et l'oublier n'échoue pas — les cellules
 * s'enfilent simplement toutes sur une seule ligne.
 */

function session(over: Record<string, unknown> = {}) {
  return {
    id: 1,
    date: '2026-03-21',
    startTime: '14:00',
    endTime: '17:00',
    venueId: 1,
    venue: { name: 'Pierre Dupuis' },
    minPlayers: 4,
    status: 'open' as const,
    openerFirstName: null,
    openerLastName: null,
    label: null,
    notes: null,
    cancelledReason: null,
    registrationCount: 0,
    guestCount: 0,
    playerCount: 0,
    needsOpener: false,
    ...over
  };
}

describe('OpenPlayManager', () => {
  let host: HTMLElement;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 200 })));
  });

  afterEach(() => {
    host.remove();
    // Les portails du design system sortent du conteneur.
    document.body.innerHTML = '';
    vi.unstubAllGlobals();
  });

  function render(props: Record<string, unknown> = {}) {
    mount(OpenPlayManager, {
      target: host,
      props: {
        sessions: [session()],
        venues: [{ id: 1, name: 'Pierre Dupuis' }],
        seasonCode: '25-26',
        canWrite: true,
        canReadRegistrations: true,
        ...props
      }
    });
    flushSync();
  }

  it('rend une ligne de tableau par séance', () => {
    render({
      sessions: [session(), session({ id: 2, date: '2026-03-28' })]
    });
    // Le piège : sans `<Table.Row>` dans le snippet, tout s'enfilerait sur une seule.
    const rows = host.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(2);
  });

  it('affiche les joueurs attendus rapportés au seuil', () => {
    render({ sessions: [session({ playerCount: 3, minPlayers: 4 })] });
    expect(host.textContent).toContain('3 / 4');
  });

  it('détaille la part des invités', () => {
    render({ sessions: [session({ registrationCount: 2, guestCount: 2, playerCount: 4 })] });
    expect(host.textContent).toContain('dont 2 invités');
  });

  it('signale une séance à pourvoir', () => {
    render({ sessions: [session({ playerCount: 4, needsOpener: true })] });
    expect(host.textContent).toContain('À pourvoir');
  });

  it('nomme l’ouvreur quand il y en a un', () => {
    render({
      sessions: [
        session({ status: 'confirmed', openerFirstName: 'Marie', openerLastName: 'Dupuis' })
      ]
    });
    expect(host.textContent).toContain('Marie D.');
  });

  it('n’offre pas de créer sans gymnase enregistré', () => {
    render({ venues: [] });
    expect(host.textContent).toContain("Enregistrez d'abord un gymnase");
    const create = [...host.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Nouvelle séance')
    );
    expect(create).toBeUndefined();
  });

  it('n’offre aucune écriture en lecture seule', () => {
    render({ canWrite: false });
    const create = [...host.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Nouvelle séance')
    );
    expect(create).toBeUndefined();
  });

  it('n’offre la programmation récurrente que s’il existe un créneau', () => {
    render({ slots: [] });
    expect(
      [...host.querySelectorAll('button')].find((b) => b.textContent?.includes('Programmer'))
    ).toBeUndefined();

    document.body.innerHTML = '';
    host = document.createElement('div');
    document.body.appendChild(host);
    render({
      slots: [
        { id: 1, weekday: 6, startTime: '14:00', endTime: '17:00', venue: { name: 'Pierre Dupuis' } }
      ]
    });
    expect(
      [...host.querySelectorAll('button')].find((b) => b.textContent?.includes('Programmer'))
    ).toBeDefined();
  });

  it('filtre sur les séances à pourvoir', () => {
    render({
      sessions: [
        session({ id: 1, playerCount: 4, needsOpener: true }),
        session({ id: 2, date: '2026-03-28', playerCount: 1 })
      ]
    });
    expect(host.querySelectorAll('tbody tr')).toHaveLength(2);

    const filter = [...host.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('À pourvoir')
    )!;
    filter.click();
    flushSync();

    expect(host.querySelectorAll('tbody tr')).toHaveLength(1);
  });
  /*
    Le bouton ouvre-t-il vraiment quelque chose ?

    Les contrôles ci-dessus ne regardaient que la *présence* du bouton. Un correctif
    d'affichage a supprimé les deux `<FormSheet>` de fin de fichier en même temps qu'il
    déplaçait le panneau des inscrits : les booléens `showGenerateSheet` et
    `showFormSheet` continuaient d'être basculés par le clic, mais plus rien ne les
    lisait. Toute la suite restait verte, et les deux boutons ne faisaient plus rien.

    On vise donc un champ que seul le panneau porte, et non son titre — repris mot pour
    mot du bouton, il serait déjà là sans le panneau.
  */
  function clickButton(label: string) {
    const button = [...host.querySelectorAll('button')].find((b) =>
      b.textContent?.includes(label)
    );
    expect(button, `bouton « ${label} » absent`).toBeDefined();
    button!.click();
    flushSync();
  }

  it('ouvre le panneau de programmation récurrente au clic', () => {
    render({
      slots: [
        { id: 1, weekday: 6, startTime: '14:00', endTime: '17:00', venue: { name: 'Pierre Dupuis' } }
      ]
    });
    clickButton('Programmer les séances récurrentes');
    // Le panneau sort du conteneur : il est porté dans `document.body`.
    expect(document.querySelector('#gen-from')).not.toBeNull();
    expect(document.querySelector('#gen-to')).not.toBeNull();
  });

  it('ouvre le panneau de nouvelle séance au clic', () => {
    render();
    clickButton('Nouvelle séance');
    expect(document.querySelector('#op-date')).not.toBeNull();
    expect(document.querySelector('#op-venue')).not.toBeNull();
  });
});
