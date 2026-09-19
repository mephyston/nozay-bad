import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { mount, flushSync } from 'svelte';
import HeaderSearch from './HeaderSearch.svelte';

describe('HeaderSearch (storefront)', () => {
  const session = { members: [{ id: 1, firstName: 'Jean', lastName: 'Dupont', licence: '07104079', paid: true, expenseAuthorized: false }], activeMemberId: 1 };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: { members: [{ kind: 'member', id: '07104079', title: 'Jean Dupont', subtitle: 'Licence 07104079', href: '/adherents/07104079' }] } })
    } as any));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('ouvre le panneau avec les liens rapides, répond du menu sans réseau, puis du contenu', async () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    mount(HeaderSearch, { target, props: { features: {}, session } });
    flushSync();

    (target.querySelector('button[aria-label="Rechercher"]') as HTMLButtonElement).click();
    flushSync();
    const panel = document.querySelector('[data-header-search]') as HTMLElement;
    expect(panel).not.toBeNull();
    expect(panel.textContent).toContain('Liens rapides');
    expect(panel.textContent).toContain('Mon attestation CSE');

    const input = panel.querySelector('input') as HTMLInputElement;
    input.value = 'cse';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    flushSync();
    expect(panel.textContent).toContain('Pages');
    expect(panel.textContent).toContain('Mon attestation CSE');
    expect(fetch).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(300);
    flushSync();
    expect(fetch).toHaveBeenCalledWith('/api/search?q=cse');
    expect(panel.textContent).toContain('Jean Dupont');

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    flushSync();
    expect(document.querySelector('[data-header-search]')).toBeNull();
  });
});
