import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import InterclubsTabHint from './InterclubsTabHint.svelte';

const hint = () => document.body.querySelector('[data-testid="interclubs-tab-hint"]');

function monter(active = false) {
  const target = document.createElement('div');
  document.body.appendChild(target);
  const app = mount(InterclubsTabHint, { target, props: { active } });
  flushSync();
  return app;
}

describe("présentation de l'onglet Interclubs", () => {
  let app: ReturnType<typeof mount> | undefined;
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('nba:account-hint:v1', '1');
  });
  afterEach(() => {
    if (app) unmount(app);
    app = undefined;
    document.body.innerHTML = '';
  });

  it("se montre une fois, mène à l'onglet, et ne revient pas après « Plus tard »", () => {
    app = monter();
    expect(hint()?.querySelector('a')?.getAttribute('href')).toBe('/agenda?vue=interclubs');
    [...hint()!.querySelectorAll('button')].find((b) => b.textContent?.includes('Plus tard'))!.click();
    flushSync();
    expect(hint()).toBeNull();
    unmount(app);
    app = monter();
    expect(hint()).toBeNull();
  });

  it("éclaire l'onglet Interclubs du sélecteur tant que l'encart est là", () => {
    const tab = document.createElement('a');
    tab.setAttribute('href', '/agenda?vue=interclubs');
    document.body.appendChild(tab);
    app = monter();
    expect(tab.classList.contains('ring-primary')).toBe(true);
    [...hint()!.querySelectorAll('button')].find((b) => b.textContent?.includes('Plus tard'))!.click();
    flushSync();
    expect(tab.classList.contains('ring-primary')).toBe(false);
  });

  it("ouvrir l'onglet suffit à l'avoir découvert", () => {
    app = monter(true);
    expect(hint()).toBeNull();
    unmount(app);
    app = monter();
    expect(hint()).toBeNull();
  });
});
