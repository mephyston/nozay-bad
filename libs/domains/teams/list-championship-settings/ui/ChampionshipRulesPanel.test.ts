import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
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

/**
 * Le panneau est devenu une liste : une ligne par championnat, la saisie dans un
 * tiroir. Les tests empruntent donc le chemin du doigt — appuyer sur la ligne ouvre
 * le formulaire — et cherchent ses champs dans le document, puisqu'une feuille est
 * portée hors de l'îlot.
 */
describe('ChampionshipRulesPanel', () => {
  let host: HTMLElement;
  let monte: Record<string, unknown> | null = null;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
  });

  afterEach(async () => {
    if (monte) unmount(monte);
    monte = null;
    host.remove();
    document.body.innerHTML = '';
    // bits-ui relâche son verrou de défilement en différé ; sans cette attente, le
    // minuteur se déclenche une fois jsdom démonté.
    await new Promise((r) => setTimeout(r, 50));
  });

  function render(props: Record<string, unknown> = {}) {
    monte = mount(ChampionshipRulesPanel, {
      target: host,
      props: { items: items(), seasonCode: '26-27', canWrite: true, onSaved: () => {}, ...props }
    });
    flushSync();
  }

  const ligneDe = (label: string) =>
    [...host.querySelectorAll('li')].find((li) => li.textContent?.includes(label));

  it('porte une ligne pour chacun des quatre championnats', () => {
    render();

    // Le règlement ne dépend d'aucune politique de date : le régional en a un aussi.
    for (const label of [
      'Interclubs Régional Séniors',
      'Interclubs Départemental Mixte',
      'Interclubs Départemental Masculin',
      'Interclubs Départemental Vétérans'
    ]) {
      expect(ligneDe(label), `ligne « ${label} » absente`).toBeDefined();
    }
  });

  it('signale les championnats sans règlement', () => {
    // C'est la question qu'on vient poser à cet écran : lesquels manquent ?
    render();
    expect(host.textContent).toContain('Sans règlement');
  });

  it('montre d’où vient le règlement déposé, sans le badger', () => {
    render({ items: items({ rulesUrl: 'https://nozaybad.fr/icrs.pdf' }) });

    const ligne = ligneDe('Interclubs Régional Séniors');
    expect(ligne?.textContent).toContain('nozaybad.fr');
    expect(ligne?.textContent).not.toContain('Sans règlement');
  });

  it('préfère le libellé déposé au domaine', () => {
    render({ items: items({ rulesUrl: 'https://nozaybad.fr/icrs.pdf', rulesLabel: 'Règlement ICR' }) });
    expect(ligneDe('Interclubs Régional Séniors')?.textContent).toContain('Règlement ICR');
  });

  it('reprend le lien enregistré dans le formulaire', () => {
    render({ items: items({ rulesUrl: 'https://nozaybad.fr/icrs.pdf' }) });

    /*
      La rangée elle-même, et non le premier bouton venu : les gestes de balayage sont
      rendus avant elle dans le DOM, et c'est « Ouvrir le règlement » qu'on aurait
      cliqué.
    */
    const rangee = [...(ligneDe('Interclubs Régional Séniors')?.querySelectorAll('button') ?? [])].find(
      (b) => b.textContent?.includes('Interclubs Régional Séniors')
    );
    expect(rangee, 'la rangée n’est pas actionnable').toBeTruthy();
    rangee!.click();
    flushSync();

    const champ = document.querySelector<HTMLInputElement>('#reglement-url');
    expect(champ?.value).toBe('https://nozaybad.fr/icrs.pdf');
  });

  it('offre d’ouvrir le lien enregistré : une URL fausse ne se voit pas autrement', () => {
    render({ items: items({ rulesUrl: 'https://nozaybad.fr/icrs.pdf' }) });

    const bouton = [...host.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Ouvrir le règlement')
    );
    expect(bouton, 'aucun geste « Ouvrir le règlement »').toBeDefined();

    const open = vi.fn();
    vi.stubGlobal('open', open);
    bouton!.click();
    flushSync();
    expect(open).toHaveBeenCalledWith('https://nozaybad.fr/icrs.pdf', '_blank', 'noopener');
    vi.unstubAllGlobals();
  });

  it('n’offre rien à ouvrir tant que rien n’est enregistré', () => {
    render();
    expect(
      [...host.querySelectorAll('button')].some((b) =>
        b.textContent?.includes('Ouvrir le règlement')
      )
    ).toBe(false);
  });

  it('n’offre aucune écriture en lecture seule', () => {
    render({ canWrite: false });

    expect(
      [...host.querySelectorAll('button')].some((b) => b.textContent?.includes('Modifier le lien'))
    ).toBe(false);
    // Et la ligne n'ouvre rien : sans droit, il n'y a pas de formulaire à atteindre.
    expect(document.querySelector('#reglement-url')).toBeNull();
  });
});
