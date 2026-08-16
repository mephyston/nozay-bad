import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mount, flushSync } from 'svelte';
import ReferenceDatesPanel from './ReferenceDatesPanel.svelte';
import type { ChampionshipSettingsItem } from '../dto';

/** Les quatre championnats, tels que `listChampionshipSettings` les rend toujours. */
function items(over: Partial<ChampionshipSettingsItem> = {}): ChampionshipSettingsItem[] {
  return [
    { championship: 'icr_seniors', label: 'Interclubs Régional Séniors', rankingPolicy: 'per_day', referenceEloDate: null, rulesUrl: null, rulesLabel: null },
    { championship: 'icd_mixte', label: 'Interclubs Départemental Mixte', rankingPolicy: 'season_fixed', referenceEloDate: '2026-10-08', rulesUrl: null, rulesLabel: null, ...over },
    { championship: 'icd_masculin', label: 'Interclubs Départemental Masculin', rankingPolicy: 'season_fixed', referenceEloDate: null, rulesUrl: null, rulesLabel: null },
    { championship: 'icd_veterans', label: 'Interclubs Départemental Vétérans', rankingPolicy: 'season_fixed', referenceEloDate: null, rulesUrl: null, rulesLabel: null }
  ];
}

describe('ReferenceDatesPanel', () => {
  let host: HTMLElement;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
  });
  afterEach(() => host.remove());

  function render(props: Partial<Record<string, unknown>> = {}) {
    mount(ReferenceDatesPanel, {
      target: host,
      props: {
        items: items(),
        availableDates: [{ eloDate: '2026-10-08', players: 213 }],
        seasonCode: '26-27',
        canWrite: true,
        onSaved: () => {},
        ...props
      }
    });
    flushSync();
  }

  it('n’offre le champ de date qu’aux championnats qui en épinglent une', () => {
    render();

    expect(
      host.querySelector('[aria-label="Date de référence — Interclubs Départemental Mixte"]')
    ).not.toBeNull();
    // Le régional recalcule sa référence par journée : aucun champ à proposer.
    expect(
      host.querySelector('[aria-label="Date de référence — Interclubs Régional Séniors"]')
    ).toBeNull();
  });

  it('verrouille le sélecteur en lecture seule', () => {
    render({ canWrite: false });

    const select = host.querySelector(
      '[aria-label="Date de référence — Interclubs Départemental Mixte"]'
    ) as HTMLSelectElement | null;
    expect(select?.disabled).toBe(true);
  });

  it('avertit tant qu’une date départementale manque', () => {
    render({ items: items().map((i) => ({ ...i, referenceEloDate: null })) });

    expect(host.textContent).toContain("aucune valeur d'équipe");
  });
});
