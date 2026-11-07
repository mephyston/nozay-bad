import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import TeamRosterSheet from './TeamRosterSheet.svelte';

const MEMBERS = [
  { licence: '00000001', firstName: 'Camille', lastName: 'Martin' },
  { licence: '00000002', firstName: 'Léa', lastName: 'Durand' }
];

const DETAIL = {
  id: 7,
  name: 'Équipe 1',
  championshipLabel: 'Interclubs régionaux',
  divisionLabel: 'R3',
  matchCount: 8,
  eligibilityRule: '',
  referenceOrigin: 'latest',
  referenceEloDate: '2026-10-29',
  outOfCategoryLicences: [],
  roster: [],
  captain: { licence: '00000001' },
  viceCaptain: { licence: '00000002' }
};

const settle = async () => {
  for (let i = 0; i < 5; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
    flushSync();
  }
};

/** Le tiroir et ses menus se rendent dans des portails : on cherche dans tout le document. */
const parTexte = (selecteur: string, texte: string) =>
  [...document.body.querySelectorAll<HTMLElement>(selecteur)].find((el) => el.textContent?.includes(texte));

describe('TeamRosterSheet — staff', () => {
  let app: ReturnType<typeof mount>;
  let envois: any[];

  beforeEach(async () => {
    envois = [];
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init: RequestInit) => {
      envois.push(JSON.parse(String(init.body)));
      return { ok: true, json: async () => ({ data: {} }) } as Response;
    }));
    const target = document.createElement('div');
    document.body.appendChild(target);
    app = mount(TeamRosterSheet, {
      target,
      props: { open: true, detail: DETAIL as never, members: MEMBERS, canWrite: true, onSaved: () => {} }
    });
    await settle();
  });

  afterEach(() => {
    unmount(app);
    document.body.innerHTML = '';
    vi.unstubAllGlobals();
  });

  it('détache le vice-capitaine et laisse le capitaine en place', async () => {
    parTexte('[role="combobox"]', 'Durand Léa')!.click();
    await settle();

    parTexte('[data-command-item], [role="option"]', 'Aucun vice-capitaine')!.click();
    await settle();

    // Le champ revient à l'invitation : plus personne n'est désigné.
    expect(parTexte('[role="combobox"]', 'Désigner un vice-capitaine')).toBeDefined();

    parTexte('button', 'Enregistrer')!.click();
    await settle();

    expect(envois.find((corps) => corps.action === 'save-team-staff')).toMatchObject({
      teamId: 7,
      captainLicence: '00000001',
      viceCaptainLicence: null
    });
  });
});
