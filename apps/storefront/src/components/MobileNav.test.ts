import { describe, it, expect, afterEach } from 'vitest';
import { mount, flushSync } from 'svelte';
import MobileNav from './MobileNav.svelte';

describe('MobileNav', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('rend les onglets, marque la page courante, et retire ce que le club a éteint', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    mount(MobileNav, { target, props: { currentPath: '/equipes/3', features: { shop: false } } });
    flushSync();
    const labels = Array.from(target.querySelectorAll('nav a')).map((a) => a.textContent?.trim());
    expect(labels).toEqual(['Accueil', 'Actualités', 'Calendrier', 'Mon club']);
    expect(target.querySelector('nav a[aria-current="page"]')?.textContent?.trim()).toBe('Mon club');
    // Pas de loupe ici : la recherche est dans l'en-tête.
    expect(target.querySelector('button[aria-label="Rechercher"]')).toBeNull();
  });
});
