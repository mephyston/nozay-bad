import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import { dockDePage } from '@nba/ui';
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
  /* La barre du bas est un singleton de module : un composant jamais démonté y laisse
     ses actions pour le test suivant. */
  let monte: Record<string, unknown> | null = null;

  beforeEach(() => {
    sessionStorage.clear();
    host = document.createElement('div');
    document.body.appendChild(host);
  });

  afterEach(async () => {
    if (monte) unmount(monte);
    monte = null;
    host.remove();
    document.body.innerHTML = '';
    await new Promise((r) => setTimeout(r, 50));
  });

  function render(props: Record<string, unknown> = {}) {
    monte = mount(RankingsManager, {
      target: host,
      props: { rankings, settings: settings(), seasonCode: '26-27', canImport: true, canWrite: true, ...props }
    });
    flushSync();
  }

  const bouton = (texte: string) =>
    [...host.querySelectorAll('button')].find((b) => b.textContent?.includes(texte));

  it('mène aux dates de référence des deux côtés du seuil', () => {
    /*
      Les dates vivent dans un tiroir. Sur téléphone il s'ouvre depuis la barre du bas,
      qui est `md:hidden` : sans le bouton de bureau, elles n'auraient plus aucune porte
      au-dessus de 768 px.
    */
    render();

    expect(bouton('Dates de référence'), 'aucun bouton hors de la barre du bas').toBeDefined();
    expect(dockDePage.lire().actions.map((a) => a.id)).toContain('dates');
  });

  it('dit combien de dates sont épinglées, et lesquelles manquent', () => {
    render();
    expect(bouton('Dates de référence')?.textContent).toContain('3/4');

    document.body.innerHTML = '';
    if (monte) unmount(monte);
    host = document.createElement('div');
    document.body.appendChild(host);
    render({ settings: settings({ referenceEloDate: null }) });
    expect(bouton('Dates de référence')?.textContent).toContain('à compléter');
  });

  it('ne renvoie plus vers les règlements : ils ont leur propre page', () => {
    /*
      Dupliquer une entrée du menu de l'application dans le menu d'un écran fait de la
      barre du bas un second sommaire, et lui retire ce qui la rend lisible — ne porter
      que les gestes de l'écran où l'on se trouve.
    */
    render({ settings: settings({ rulesUrl: 'https://x/r.pdf' }) });

    expect([...host.querySelectorAll('a')].some((a) => a.textContent?.includes('Règlements'))).toBe(
      false
    );
    expect(dockDePage.lire().actions.map((a) => a.id)).not.toContain('reglements');
  });

  it('n’enferme plus les classements dans un pli', () => {
    // Ils n'ont plus personne avec qui se disputer la colonne : le pli n'a plus d'objet.
    render();
    expect(bouton('Classements')).toBeUndefined();
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

});
