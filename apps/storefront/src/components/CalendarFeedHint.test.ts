import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import MobileNav from './MobileNav.svelte';

const hint = () => document.body.querySelector<HTMLElement>('[data-testid="calendar-feed-hint"]');

function monter(props: Record<string, unknown> = {}) {
  const target = document.createElement('div');
  document.body.appendChild(target);
  const app = mount(MobileNav, { target, props: { currentPath: '/', features: {}, ...props } });
  flushSync();
  return app;
}

describe("bulle de nouveauté de l'agenda", () => {
  let app: ReturnType<typeof mount> | undefined;

  beforeEach(() => localStorage.clear());
  afterEach(() => {
    if (app) unmount(app);
    app = undefined;
    document.body.innerHTML = '';
  });

  it('attend que la bulle du compte ait été vue, puis paraît dès sa fermeture', () => {
    app = monter();
    expect(hint()).toBeNull();
    localStorage.setItem('nba:account-hint:v1', '1');
    window.dispatchEvent(new Event('nba:hint-dismissed'));
    flushSync();
    expect(hint()?.textContent).toContain("l'agenda du club dans votre téléphone");
    expect(hint()!.querySelector('a')!.getAttribute('href')).toBe('/agenda?abonnement');
  });

  it("éclaire l'onglet Calendrier tant que la bulle est là", () => {
    localStorage.setItem('nba:account-hint:v1', '1');
    app = monter();
    const tab = document.body.querySelector('a[href="/agenda"]')!;
    expect(tab.querySelector('.ring-primary')).not.toBeNull();
    [...hint()!.querySelectorAll('button')].find((b) => b.textContent?.includes('Plus tard'))!.click();
    flushSync();
    expect(tab.querySelector('.ring-primary')).toBeNull();
  });

  it('une fois vue, ne revient plus', () => {
    localStorage.setItem('nba:account-hint:v1', '1');
    app = monter();
    [...hint()!.querySelectorAll('button')].find((b) => b.textContent?.includes('Plus tard'))!.click();
    flushSync();
    expect(hint()).toBeNull();
    unmount(app);
    app = monter();
    expect(hint()).toBeNull();
  });

  it("ni sur le calendrier, ni quand le club a éteint l'abonnement", () => {
    localStorage.setItem('nba:account-hint:v1', '1');
    app = monter({ currentPath: '/agenda' });
    expect(hint()).toBeNull();
    unmount(app);
    app = monter({ features: { calendar_feed: false } });
    expect(hint()).toBeNull();
  });
});
