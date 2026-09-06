import { describe, it, expect, vi, afterEach } from 'vitest';
import { mount, flushSync, unmount } from 'svelte';

// `toast` seul est doublé : `submitForm` reste le vrai code, c'est lui qui poste.
vi.mock('@nba/ui', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return { ...actual, toast: { success: vi.fn(), error: vi.fn() } };
});

const { default: InitialBalancesConfig } = await import('./InitialBalancesConfig.svelte');

/**
 * L'écran ne connaît aucun compte par son nom : il rend un champ par solde que le relais lui
 * donne. C'est ce qui a fait entrer le porte-monnaie Badnet sans qu'une ligne d'ici ne change.
 */
describe('InitialBalancesConfig Component', () => {
  const seasons = [
    {
      id: '25-26',
      name: 'Saison 2025-2026',
      active: true,
      initialBalances: [
        { accountId: 'current', label: 'Compte Courant', initialBalanceCents: 100000 },
        { accountId: 'savings', label: 'Livret A / Épargne', initialBalanceCents: 200000 },
        { accountId: 'cash', label: 'Caisse Buvette', initialBalanceCents: 30000 },
        { accountId: 'badnet', label: 'Porte-monnaie Badnet', initialBalanceCents: 100000 }
      ]
    }
  ];

  let component: any;
  let target: HTMLDivElement;

  afterEach(() => {
    if (component) unmount(component);
    target?.remove();
    vi.unstubAllGlobals();
  });

  const euros = (input: HTMLInputElement) => input.value.replace(/\s/g, '').replace(',', '.');

  it('rend un champ par compte, le porte-monnaie Badnet compris, avec les valeurs en euros', () => {
    target = document.createElement('div');
    document.body.appendChild(target);

    component = mount(InitialBalancesConfig, { target, props: { seasons, seasonId: '25-26' } });
    flushSync();

    expect(euros(target.querySelector('#current-initial') as HTMLInputElement)).toBe('1000.00');
    expect(euros(target.querySelector('#savings-initial') as HTMLInputElement)).toBe('2000.00');
    expect(euros(target.querySelector('#cash-initial') as HTMLInputElement)).toBe('300.00');
    expect(euros(target.querySelector('#badnet-initial') as HTMLInputElement)).toBe('1000.00');
    expect(target.textContent).toContain('Porte-monnaie Badnet');
  });

  it("envoie un tableau d'un solde par compte au relais de la comptabilité", async () => {
    target = document.createElement('div');
    document.body.appendChild(target);
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"success":true}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('location', { reload: vi.fn(), href: 'http://localhost/admin/settings/seasons' });

    component = mount(InitialBalancesConfig, { target, props: { seasons, seasonId: '25-26' } });
    flushSync();

    const badnet = target.querySelector('#badnet-initial') as HTMLInputElement;
    badnet.value = '1250';
    badnet.dispatchEvent(new Event('input', { bubbles: true }));
    // Le montant n'est retenu qu'à la sortie du champ, comme pour tout `AmountInput`.
    badnet.dispatchEvent(new Event('blur'));
    flushSync();

    target.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/admin/api/accounting/config');
    expect(JSON.parse(init.body)).toEqual({
      action: 'update_balances',
      seasonId: '25-26',
      balances: [
        { accountId: 'current', initialBalanceCents: 100000 },
        { accountId: 'savings', initialBalanceCents: 200000 },
        { accountId: 'cash', initialBalanceCents: 30000 },
        { accountId: 'badnet', initialBalanceCents: 125000 }
      ]
    });
  });

  it('désactive les champs et signale la clôture quand la saison est close', () => {
    target = document.createElement('div');
    document.body.appendChild(target);

    component = mount(InitialBalancesConfig, {
      target,
      props: { seasons: [{ ...seasons[0], closed: true }], seasonId: '25-26' }
    });
    flushSync();

    for (const id of ['current', 'savings', 'cash', 'badnet']) {
      expect((target.querySelector(`#${id}-initial`) as HTMLInputElement).disabled).toBe(true);
    }
    expect(target.textContent).toContain('Cette saison est clôturée');
    expect(target.querySelector('button[type="submit"]')).toBeNull();
  });
});
