import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mount, flushSync } from 'svelte';
import ChampionshipRulesPanel from './ChampionshipRulesPanel.svelte';
import type { ChampionshipSettingsItem } from '../dto';

function items(over: Partial<ChampionshipSettingsItem> = {}): ChampionshipSettingsItem[] {
  return [
    { championship: 'icr_seniors', label: 'Interclubs Régional Séniors', rankingPolicy: 'per_day', referenceEloDate: null, rulesUrl: null, rulesLabel: null, ...over },
    { championship: 'icd_mixte', label: 'Interclubs Départemental Mixte', rankingPolicy: 'season_fixed', referenceEloDate: '2026-10-08', rulesUrl: null, rulesLabel: null },
    { championship: 'icd_masculin', label: 'Interclubs Départemental Masculin', rankingPolicy: 'season_fixed', referenceEloDate: null, rulesUrl: null, rulesLabel: null },
    { championship: 'icd_veterans', label: 'Interclubs Départemental Vétérans', rankingPolicy: 'season_fixed', referenceEloDate: null, rulesUrl: null, rulesLabel: null }
  ];
}

describe('ChampionshipRulesPanel', () => {
  let host: HTMLElement;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
  });
  afterEach(() => host.remove());

  function render(props: Record<string, unknown> = {}) {
    mount(ChampionshipRulesPanel, {
      target: host,
      props: { items: items(), seasonCode: '26-27', canWrite: true, onSaved: () => {}, ...props }
    });
    flushSync();
  }

  it('propose un champ pour chacun des quatre championnats', () => {
    render();

    // Le règlement ne dépend d'aucune politique de date : le régional en a un aussi.
    for (const label of [
      'Interclubs Régional Séniors',
      'Interclubs Départemental Mixte',
      'Interclubs Départemental Masculin',
      'Interclubs Départemental Vétérans'
    ]) {
      expect(host.querySelector(`[aria-label="Lien du règlement — ${label}"]`)).not.toBeNull();
    }
  });

  it('affiche le lien déjà enregistré', () => {
    render({ items: items({ rulesUrl: 'https://nozaybad.fr/icrs.pdf', rulesLabel: 'Règlement ICR' }) });

    const input = host.querySelector<HTMLInputElement>(
      '[aria-label="Lien du règlement — Interclubs Régional Séniors"]'
    );
    expect(input?.value).toBe('https://nozaybad.fr/icrs.pdf');
  });

  it('offre d’ouvrir le lien enregistré : une URL fausse ne se voit pas autrement', () => {
    render({ items: items({ rulesUrl: 'https://nozaybad.fr/icrs.pdf' }) });

    const link = [...host.querySelectorAll('a')].find((a) => a.textContent?.includes('Ouvrir'));
    expect(link?.getAttribute('href')).toBe('https://nozaybad.fr/icrs.pdf');
  });

  it('n’offre aucun lien à ouvrir tant que rien n’est enregistré', () => {
    render();

    expect([...host.querySelectorAll('a')].some((a) => a.textContent?.includes('Ouvrir'))).toBe(false);
  });

  it('verrouille les champs en lecture seule', () => {
    render({ canWrite: false });

    const input = host.querySelector<HTMLInputElement>(
      '[aria-label="Lien du règlement — Interclubs Départemental Mixte"]'
    );
    expect(input?.disabled).toBe(true);
    expect([...host.querySelectorAll('button')].some((b) => b.textContent?.includes('Enregistrer'))).toBe(false);
  });
});
