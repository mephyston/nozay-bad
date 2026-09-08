import { describe, it, expect, beforeEach } from 'vitest';
import { mount, flushSync, unmount } from 'svelte';
import UserMenu from './UserMenu.svelte';

const members = [
  { id: 1, firstName: 'Léa', lastName: 'Martin', licence: '1000001', expenseAuthorized: false },
  { id: 2, firstName: 'Tom', lastName: 'Martin', licence: '1000002', expenseAuthorized: true }
];

function render(props: Partial<{ members: typeof members; activeMemberId: number; currentPath: string }> = {}) {
  const target = document.createElement('div');
  document.body.appendChild(target);
  const app = mount(UserMenu, {
    target,
    props: { members, activeMemberId: 1, currentPath: '/', ...props }
  });
  flushSync();
  return { target, app };
}

const labels = (target: HTMLElement) =>
  Array.from(target.querySelectorAll('[data-testid="account-menu"] a')).map((a) => a.textContent?.trim());

describe('UserMenu', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
  });

  it('montre le portrait avec les initiales en repli, et le prénom', () => {
    const { target } = render();
    const button = target.querySelector('[data-testid="account-button"]')!;
    expect(button.textContent).toContain('LM');
    expect(button.textContent).toContain('Léa');
    expect(button.querySelector('img')?.getAttribute('src')).toBe('/api/adherents/photo/01000001?size=128');
  });

  it("liste les écrans personnels sous l'identité, notes de frais comprises si autorisées", () => {
    const { target } = render({ activeMemberId: 2 });
    (target.querySelector('[data-testid="account-button"]') as HTMLButtonElement).click();
    flushSync();
    expect(labels(target)).toEqual([
      'Mon compte',
      'Ma fiche',
      'Ma cotisation',
      'Mon attestation CSE',
      'Notifications',
      'Notes de frais'
    ]);
    expect(target.querySelector('[data-testid="account-menu"]')?.textContent).toContain('Tom Martin');
    expect(target.querySelector('a[href="/adherents/01000002"]')).not.toBeNull();
  });

  it("tait les notes de frais à qui n'y est pas autorisé", () => {
    const { target } = render({ activeMemberId: 1 });
    (target.querySelector('[data-testid="account-button"]') as HTMLButtonElement).click();
    flushSync();
    expect(labels(target)).not.toContain('Notes de frais');
  });

  it("signale l'écran courant, ancre comprise", () => {
    const { target } = render({ currentPath: '/mon-compte' });
    (target.querySelector('[data-testid="account-button"]') as HTMLButtonElement).click();
    flushSync();
    expect(target.querySelector('a[href="/mon-compte"]')?.getAttribute('aria-current')).toBe('page');
    expect(target.querySelector('a[href="/mon-compte#cotisation"]')?.getAttribute('aria-current')).toBe('page');
    expect(target.querySelector('a[href="/attestation"]')?.getAttribute('aria-current')).toBeNull();
  });

  /*
    La bulle de première visite : une fois par appareil. Ouvrir le menu vaut découverte,
    elle ne revient pas non plus après.
  */
  it('montre la bulle à la première visite et la retient une fois fermée', () => {
    const first = render();
    expect(first.target.querySelector('[data-testid="account-hint"]')).not.toBeNull();
    (first.target.querySelector('[data-testid="account-hint"] button') as HTMLButtonElement).click();
    flushSync();
    expect(first.target.querySelector('[data-testid="account-hint"]')).toBeNull();
    expect(localStorage.getItem('nba:account-hint:v1')).toBe('1');
    unmount(first.app);

    const second = render();
    expect(second.target.querySelector('[data-testid="account-hint"]')).toBeNull();
  });

  it('considère le menu trouvé dès qu\'on l\'ouvre', () => {
    const { target } = render();
    (target.querySelector('[data-testid="account-button"]') as HTMLButtonElement).click();
    flushSync();
    expect(target.querySelector('[data-testid="account-hint"]')).toBeNull();
    expect(localStorage.getItem('nba:account-hint:v1')).toBe('1');
  });
});
