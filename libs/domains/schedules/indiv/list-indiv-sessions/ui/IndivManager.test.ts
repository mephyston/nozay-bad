import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, flushSync } from 'svelte';
import IndivManager from './IndivManager.svelte';

function session(over: Record<string, unknown> = {}) {
  return {
    id: 1, date: '2099-03-17', startTime: '19:30', endTime: '20:30',
    venueId: 1, venue: { name: 'Pierre Dupuis' },
    slotCount: 2, slotMinutes: 30, capacityPerSlot: 2,
    status: 'open' as const, label: null, notes: null, cancelledReason: null,
    requestCount: 3, selectedCount: 0,
    ...over
  };
}

describe('IndivManager', () => {
  let host: HTMLElement;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 200 })));
  });

  afterEach(() => {
    host.remove();
    document.body.innerHTML = '';
    vi.unstubAllGlobals();
  });

  function render(props: Record<string, unknown> = {}) {
    mount(IndivManager, {
      target: host,
      props: { sessions: [session()], venues: [{ id: 1, name: 'Pierre Dupuis' }], slots: [], canWrite: true, ...props }
    });
    flushSync();
  }

  it('rend une ligne par soirée, cellules sur leur propre ligne', () => {
    render();
    const rows = host.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(1);
    expect(rows[0].querySelectorAll('td').length).toBeGreaterThanOrEqual(6);
    expect(host.textContent).toContain('2 × 2 places');
    /*
      « À annoncer » et non plus « Candidatures ouvertes » : le tableau et la liste
      disaient deux mots pour le même état. Une seule déclaration les sert désormais —
      la colonne la rend toujours, la pastille du téléphone seulement quand l'état
      réclame un geste.
    */
    expect(host.textContent).toContain('À annoncer');
  });

  it('mène à la sélection de la soirée', () => {
    render();
    const link = host.querySelector<HTMLAnchorElement>('a[href="/admin/entrainement/indiv/selection?id=1"]');
    expect(link).not.toBeNull();
  });

  it('n’offre ni création ni programmation sans le droit d’écrire', () => {
    render({ canWrite: false, slots: [{ id: 1, weekday: 2, startTime: '19:30', endTime: '20:30', label: null }] });
    expect(host.textContent).not.toContain('Nouvelle soirée');
    expect(host.textContent).not.toContain('Programmer les soirées');
  });

  it('propose la programmation quand un créneau compétiteurs existe', () => {
    render({ slots: [{ id: 1, weekday: 2, startTime: '19:30', endTime: '20:30', label: null }] });
    expect(host.textContent).toContain('Programmer les soirées');
  });
});
