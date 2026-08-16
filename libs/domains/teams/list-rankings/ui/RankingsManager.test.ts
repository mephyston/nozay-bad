import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mount, flushSync } from 'svelte';
import RankingsManager from './RankingsManager.svelte';
import type { ChampionshipSettingsItem } from '../../list-championship-settings/dto';
import type { ListRankingsOutput } from '../dto';

function settings(over: Partial<ChampionshipSettingsItem> = {}): ChampionshipSettingsItem[] {
  return [
    { championship: 'icr_seniors', label: 'Interclubs Régional Séniors', rankingPolicy: 'per_day', referenceEloDate: null, rulesUrl: null, rulesLabel: null },
    { championship: 'icd_mixte', label: 'Interclubs Départemental Mixte', rankingPolicy: 'season_fixed', referenceEloDate: '2026-10-08', rulesUrl: null, rulesLabel: null, ...over },
    { championship: 'icd_masculin', label: 'Interclubs Départemental Masculin', rankingPolicy: 'season_fixed', referenceEloDate: '2026-10-08', rulesUrl: null, rulesLabel: null },
    { championship: 'icd_veterans', label: 'Interclubs Départemental Vétérans', rankingPolicy: 'season_fixed', referenceEloDate: '2026-10-08', rulesUrl: null, rulesLabel: null }
  ];
}

const row = {
  id: 1,
  licence: '07104079',
  eloDate: '2026-10-08',
  seasonCode: '26-27',
  lastName: 'Durand',
  firstName: 'Alex',
  gender: 'H' as const,
  category: 'Senior',
  mutation: 'none' as const,
  singles: 'D9' as const,
  doubles: 'D9' as const,
  mixed: null,
  singlesRank: null,
  doublesRank: null,
  mixedRank: null,
  cpphSingles: null,
  cpphDoubles: null,
  cpphMixed: null,
  source: 'import' as const,
  updatedAt: new Date(0),
  isMember: true
};

const rankings: ListRankingsOutput = {
  eloDate: '2026-10-08',
  availableDates: [{ eloDate: '2026-10-08', players: 213 }],
  rows: [],
  unmatchedCount: 0
};

describe('RankingsManager', () => {
  let host: HTMLElement;

  beforeEach(() => {
    sessionStorage.clear();
    host = document.createElement('div');
    document.body.appendChild(host);
  });
  afterEach(() => host.remove());

  function render(props: Record<string, unknown> = {}) {
    mount(RankingsManager, {
      target: host,
      props: { rankings, settings: settings(), seasonCode: '26-27', canImport: true, canWrite: true, ...props }
    });
    flushSync();
  }

  /** L'en-tête d'une section repliable est un vrai bouton, porteur de `aria-expanded`. */
  function section(title: string): HTMLButtonElement | undefined {
    return [...host.querySelectorAll('button')].find((b) => b.textContent?.includes(title)) as
      | HTMLButtonElement
      | undefined;
  }

  it('présente les deux zones repliables', () => {
    render();

    expect(section('Dates de référence')).toBeDefined();
    expect(section('Classements')).toBeDefined();
  });

  it('renvoie les règlements vers leur propre page, avec leur décompte', () => {
    render({ settings: settings({ rulesUrl: 'https://x/r.pdf' }) });

    const link = [...host.querySelectorAll('a')].find((a) => a.textContent?.includes('Règlements'));
    expect(link?.getAttribute('href')).toBe('/admin/teams/reglements?season=26-27');
    expect(link?.textContent).toContain('1/4');
  });

  it('laisse les règlements accessibles à qui ne peut pas importer', () => {
    // Consulter les règlements ne demande pas le droit d'importer des classements.
    render({ canImport: false });

    expect([...host.querySelectorAll('a')].some((a) => a.textContent?.includes('Règlements'))).toBe(true);
  });

  it('laisse les classements ouverts : c’est ce que le coach vient consulter', () => {
    render();

    expect(section('Classements')?.getAttribute('aria-expanded')).toBe('true');
  });

  it('replie les réglages quand toutes les dates sont épinglées', () => {
    render();

    expect(section('Dates de référence')?.getAttribute('aria-expanded')).toBe('false');
  });

  it('ouvre les réglages d’office quand une date manque', () => {
    // Sans date de référence, aucune valeur d'équipe n'est calculable : replier ce bloc
    // cacherait précisément ce qu'il faut corriger.
    render({ settings: settings({ referenceEloDate: null }) });

    expect(section('Dates de référence')?.getAttribute('aria-expanded')).toBe('true');
  });

  it('renvoie l’import vers sa propre page', () => {
    render();

    const link = [...host.querySelectorAll('a')].find((a) =>
      a.textContent?.includes('Importer des classements')
    );
    expect(link?.getAttribute('href')).toBe('/admin/teams/classements/import?season=26-27');
  });

  it('n’offre pas l’import à qui n’en a pas le droit', () => {
    render({ canImport: false });

    expect(
      [...host.querySelectorAll('a')].some((a) => a.textContent?.includes('Importer'))
    ).toBe(false);
  });

  describe('correction à la main', () => {
    /** Les trois cellules de classement d'une ligne, dans l'ordre simple/double/mixte. */
    function cells(): HTMLSelectElement[] {
      return [...host.querySelectorAll('select')].filter((s) =>
        s.getAttribute('aria-label')?.startsWith('Classement ')
      ) as HTMLSelectElement[];
    }

    it('rend chaque classement modifiable', () => {
      render({ rankings: { ...rankings, rows: [row] } });

      expect(cells()).toHaveLength(3);
      expect(cells()[0].value).toBe('D9');
    });

    it('offre « non compétiteur » à côté des classements', () => {
      render({ rankings: { ...rankings, rows: [row] } });

      // La valeur vide vaut `null` — non compétiteur — et non `NC`, qui est un classement
      // à part entière : zéro point, mais alignable.
      const options = [...cells()[0].options].map((o) => o.value);
      expect(options).toContain('');
      expect(options).toContain('NC');
      // Un classement absent se présente comme vide, pas comme NC.
      expect(cells()[2].value).toBe('');
    });

    it('laisse en lecture seule qui n’a pas le droit d’écrire', () => {
      render({ rankings: { ...rankings, rows: [row] }, canWrite: false });

      expect(cells()).toHaveLength(0);
      expect(host.textContent).toContain('D9');
    });
  });

  describe('mémoire du pli', () => {
    it('retient une section dépliée d’un rechargement à l’autre', () => {
      // Enregistrer un réglage recharge la page : sans mémoire, la section se refermait
      // sous les doigts à chaque enregistrement.
      sessionStorage.setItem('collapse:rankings.settings', '1');
      render();

      expect(section('Dates de référence')?.getAttribute('aria-expanded')).toBe('true');
    });

    it('retient une section repliée', () => {
      sessionStorage.setItem('collapse:rankings.table', '0');
      render();

      expect(section('Classements')?.getAttribute('aria-expanded')).toBe('false');
    });

    it('rouvre malgré tout les réglages quand une date manque', () => {
      sessionStorage.setItem('collapse:rankings.settings', '0');
      render({ settings: settings({ referenceEloDate: null }) });

      expect(section('Dates de référence')?.getAttribute('aria-expanded')).toBe('true');
    });
  });
});
