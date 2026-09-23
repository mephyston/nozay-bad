import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, flushSync } from 'svelte';
import ChampionshipDaysSheet from './ChampionshipDaysSheet.svelte';
import type { ChampionshipDayItem } from '../../list-championship-days/dto';

/** Un calendrier réel : quatorze journées ordinaires, puis deux barrages nommés. */
function days(): ChampionshipDayItem[] {
  return [
    { id: 1, number: 1, weekStart: '2026-11-02', weekEnd: '2026-11-08', matchDate: null, kind: 'regular', label: null, referenceEloDate: null, concurrentChampionships: [] },
    { id: 2, number: 15, weekStart: '2027-03-29', weekEnd: '2027-04-04', matchDate: null, kind: 'playoff', label: 'Barrages aller', referenceEloDate: null, concurrentChampionships: [] },
    { id: 3, number: 16, weekStart: '2027-04-19', weekEnd: '2027-04-25', matchDate: null, kind: 'playoff', label: 'Barrages retour', referenceEloDate: null, concurrentChampionships: [] }
  ];
}

describe('ChampionshipDaysSheet', () => {
  let host: HTMLElement;
  let sent: any;

  /**
   * La feuille se rend dans un portail, à la racine du document et non dans le conteneur
   * de montage : c'est là qu'il faut la chercher.
   */
  const view = () => document.body;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
    sent = null;
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init: any) => {
      sent = JSON.parse(init.body);
      return { ok: true, json: async () => ({ data: { days: days() } }) } as any;
    }));
  });

  afterEach(() => {
    host.remove();
    document.body.innerHTML = '';
    vi.unstubAllGlobals();
  });

  /**
   * Le champ d'un libellé, trouvé par son intitulé.
   *
   * Et non par un `aria-label` : les champs sont passés sous `FormField`, qui les
   * associe à un vrai `<label for>` — une association que les technologies
   * d'assistance suivent mieux qu'un attribut recopié.
   */
  function champDuLibelle(journee: number): HTMLInputElement | null {
    // Dans le document, et non dans l'îlot : une feuille est portée hors de lui.
    const intitule = [...document.querySelectorAll('label')].find(
      (l) => l.textContent?.trim() === `Libellé de la journée ${journee}`
    );
    const id = intitule?.getAttribute('for');
    // `getElementById` et non un sélecteur : jsdom ne fournit pas `CSS.escape`.
    return id ? (document.getElementById(id) as HTMLInputElement | null) : null;
  }

  function render(props: Record<string, unknown> = {}) {
    mount(ChampionshipDaysSheet, {
      target: host,
      props: {
        open: true,
        championship: 'icd_mixte' as const,
        days: days(),
        seasonCode: '26-27',
        canWrite: true,
        onSaved: () => {},
        ...props
      }
    });
    flushSync();
  }

  it('affiche le libellé saisi pour chaque journée', () => {
    render();

    expect(champDuLibelle(15)?.value).toBe('Barrages aller');
  });

  it('propose le numéro en repli quand aucun libellé n’est saisi', () => {
    render();

    const input = champDuLibelle(1);
    expect(input?.value).toBe('');
    expect(input?.placeholder).toContain('J1');
  });

  /**
   * Le brouillon transportait autrefois le seul couple `(numéro, semaine)` : enregistrer
   * le calendrier renvoyait donc les barrages en journées ordinaires, sans libellé. La
   * perte ne se voyait qu'après coup, sur un autre écran.
   */
  it('renvoie le libellé et la nature de chaque journée à l’enregistrement', async () => {
    render();

    const save = [...view().querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Enregistrer le calendrier')
    );
    save?.click();
    await Promise.resolve();

    expect(sent.action).toBe('save-championship-days');
    const barrage = sent.days.find((d: any) => d.number === 15);
    expect(barrage.label).toBe('Barrages aller');
    expect(barrage.kind).toBe('playoff');

    const ordinaire = sent.days.find((d: any) => d.number === 1);
    expect(ordinaire.label).toBeNull();
    expect(ordinaire.kind).toBe('regular');
  });

  it('marque les barrages comme non disputés par toutes les équipes', () => {
    render();

    expect(view().textContent).toContain('Toutes les équipes ne la disputent pas');
  });
});
