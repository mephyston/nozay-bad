import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { mount, flushSync } from 'svelte';
import MobileNav from './MobileNav.svelte';

describe('MobileNav', () => {
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

  const mountNav = (props: Record<string, unknown> = {}) => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    mount(MobileNav, { target, props: { currentPath: '/actualites', features: {}, session, ...props } });
    flushSync();
    return target;
  };

  it('rend les onglets, la loupe à part, et retire ce que le club a éteint', () => {
    const target = mountNav({ features: { shop: false } });
    const labels = Array.from(target.querySelectorAll('nav a')).map((a) => a.textContent?.trim());
    expect(labels).toEqual(['Accueil', 'Actualités', 'Calendrier', 'Mon club']);
    expect(target.querySelector('nav a[aria-current="page"]')?.textContent?.trim()).toBe('Actualités');
    expect(target.querySelector('button[aria-label="Rechercher"]')).not.toBeNull();
  });

  it('répond du menu sans réseau, puis du contenu après la latence', async () => {
    const target = mountNav();
    (target.querySelector('button[aria-label="Rechercher"]') as HTMLButtonElement).click();
    flushSync();
    const input = target.querySelector('input[aria-label="Chercher dans le menu"]') as HTMLInputElement;
    expect(input).not.toBeNull();

    input.value = 'cse';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    flushSync();
    expect(target.querySelector('[data-testid="search-results"]')?.textContent).toContain('Mon attestation CSE');
    expect(fetch).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(300);
    flushSync();
    expect(fetch).toHaveBeenCalledWith('/api/search?q=cse');
    expect(target.querySelector('[data-testid="search-results"]')?.textContent).toContain('Jean Dupont');
  });

  it('ne demande pas le contenu sous deux lettres', async () => {
    const target = mountNav();
    (target.querySelector('button[aria-label="Rechercher"]') as HTMLButtonElement).click();
    flushSync();
    const input = target.querySelector('input') as HTMLInputElement;
    input.value = 'c';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    flushSync();
    await vi.advanceTimersByTimeAsync(300);
    expect(fetch).not.toHaveBeenCalled();
  });
});
