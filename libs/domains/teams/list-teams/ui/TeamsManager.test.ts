import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mount, flushSync } from 'svelte';
import TeamsManager from './TeamsManager.svelte';
import type { TeamListItem } from '../dto';

/**
 * `DataTable` rend le snippet `row` tel quel dans le corps du tableau : c'est à
 * l'appelant de fournir le `<tr>`. L'oublier n'échoue nulle part — les cellules
 * s'enfilent simplement toutes sur une seule ligne, ce qu'aucun test d'API ne voit.
 * D'où ce test de structure.
 */
function team(over: Partial<TeamListItem> = {}): TeamListItem {
  return {
    id: 1,
    seasonCode: '26-27',
    championship: 'icd_mixte',
    championshipLabel: 'Interclubs Départemental Mixte',
    division: 'D2',
    divisionLabel: 'Division 2',
    number: 1,
    name: 'NBA91-1',
    poolLabel: 'A',
    active: true,
    captain: null,
    viceCaptain: null,
    rosterCount: 0,
    matchCount: 7,
    viewerRole: null,
    ...over
  };
}

describe('TeamsManager', () => {
  let host: HTMLElement;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
  });

  afterEach(() => {
    host.remove();
  });

  function render(teams: TeamListItem[]) {
    mount(TeamsManager, {
      target: host,
      props: {
        teams,
        members: [],
        days: [],
        daysChampionship: 'icd_mixte' as const,
        seasonCode: '26-27',
        canWrite: true,
        canDelete: true
      }
    });
    flushSync();
  }

  it('rend une ligne de tableau par équipe, et non toutes les cellules à la suite', () => {
    render([
      team({ id: 1, number: 1, name: 'NBA91-1' }),
      team({ id: 2, number: 2, name: 'NBA91-2' }),
      team({ id: 3, number: 3, name: 'NBA91-3' })
    ]);

    const body = host.querySelector('tbody');
    expect(body).not.toBeNull();
    expect(body!.querySelectorAll('tr')).toHaveLength(3);
  });

  it('place chaque équipe dans sa propre ligne', () => {
    render([team({ id: 1, name: 'NBA91-1' }), team({ id: 2, number: 2, name: 'NBA91-2' })]);

    const rows = [...host.querySelectorAll('tbody tr')];
    expect(rows[0].textContent).toContain('NBA91-1');
    expect(rows[0].textContent).not.toContain('NBA91-2');
    expect(rows[1].textContent).toContain('NBA91-2');
  });

  it('affiche le championnat, la division et le format de la rencontre', () => {
    render([team({ divisionLabel: 'Division 1', matchCount: 8 })]);

    const row = host.querySelector('tbody tr')!;
    expect(row.textContent).toContain('Interclubs Départemental Mixte');
    expect(row.textContent).toContain('Division 1');
    expect(row.textContent).toContain('8 matchs');
  });

  it('signale une équipe sans capitaine : personne ne peut alors la composer', () => {
    render([team({ captain: null })]);

    expect(host.querySelector('tbody tr')!.textContent).toContain('Non désigné');
  });
});
