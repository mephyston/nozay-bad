import { mount, unmount, flushSync } from 'svelte';
import { describe, it, expect, beforeAll, vi } from 'vitest';
import AdminLayout from './AdminLayout.svelte';
// Le modèle n'a plus de joker : un compte à tous les droits porte le catalogue complet.
import { ALL_PERMISSIONS } from '@nba/iam-ui';

describe('AdminLayout Component', () => {
  let isMobileViewport = false;

  beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => {
        const isMobileQuery = query.includes('max-width');
        return {
          get matches() {
            return isMobileQuery ? isMobileViewport : false;
          },
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        };
      }),
    });
  });

  it('should render the desktop navigation items in desktop mode', () => {
    isMobileViewport = false;
    const target = document.createElement('div');
    document.body.appendChild(target);

    const component = mount(AdminLayout, {
      target,
      props: {
        email: 'test@nozay-bad.fr',
        permissions: ALL_PERMISSIONS
      }
    });
    flushSync();

    // Verify desktop title and navigation items are rendered
    expect(target.textContent).toContain('Nozay Bad Admin');
    expect(target.textContent).toContain("Tableau de bord");
    expect(target.textContent).toContain("Adhérents");
    expect(target.textContent).toContain("Comptabilité");
    expect(target.textContent).toContain("Caisse");
    expect(target.textContent).toContain("Boutique");
    expect(target.textContent).toContain("Notes de frais");

    // Clean up
    unmount(component);
    target.remove();
  });

  it('should render the consolidated settings menu item and highlight it when active', () => {
    isMobileViewport = false;
    const target = document.createElement('div');
    document.body.appendChild(target);

    // Test with breadcrumb "Réglages / Saisons"
    const component = mount(AdminLayout, {
      target,
      props: {
        email: 'test@nozay-bad.fr',
        permissions: ALL_PERMISSIONS,
        breadcrumb: 'Réglages / Saisons'
      }
    });
    flushSync();

    // Verify consolidated menu item is rendered
    expect(target.textContent).toContain('Réglages');
    // Ensure the old sub-items are NOT rendered in the navigation links
    const navLinks = Array.from(target.querySelectorAll('a')).map(a => a.textContent?.trim());
    expect(navLinks).not.toContain('Saisons');
    expect(navLinks).not.toContain('Catégories');
    expect(navLinks).not.toContain('Classes de comptes');

    // Find the settings link
    const settingsLink = target.querySelector('a[href="/admin/settings"]');
    expect(settingsLink).not.toBeNull();
    
    // Check that it is marked as active
    expect(settingsLink?.getAttribute('data-active')).toBe('true');

    unmount(component);
    
    // Test with breadcrumb "settings"
    const component2 = mount(AdminLayout, {
      target,
      props: {
        email: 'test@nozay-bad.fr',
        permissions: ALL_PERMISSIONS,
        breadcrumb: 'settings'
      }
    });
    flushSync();

    const settingsLink2 = target.querySelector('a[href="/admin/settings"]');
    expect(settingsLink2?.getAttribute('data-active')).toBe('true');

    unmount(component2);
    target.remove();
  });

  /*
   * Le bandeau d'usurpation ne se lève que sur deux identités réellement différentes.
   *
   * Il s'est affiché en production à des comptes qui n'avaient emprunté personne : la
   * prop `email` avait une valeur par défaut — l'adresse d'administration du jeu
   * d'essai — et les pages qui oubliaient de la passer comparaient donc `realEmail` à
   * cette valeur. Le bouton « Revenir à … » restait alors sans effet, puisqu'il n'y
   * avait aucun cookie d'usurpation à retirer.
   */
  describe("bandeau d'usurpation", () => {
    function textFor(props: Record<string, unknown>): string {
      isMobileViewport = false;
      const target = document.createElement('div');
      document.body.appendChild(target);
      const component = mount(AdminLayout, { target, props: { permissions: ALL_PERMISSIONS, ...props } });
      flushSync();
      const text = target.textContent ?? '';
      unmount(component);
      target.remove();
      return text;
    }

    it("se lève quand les deux identités diffèrent", () => {
      const text = textFor({ email: 'emprunte@nozay-bad.fr', realEmail: 'moi@nozay-bad.fr' });
      expect(text).toContain("Vous consultez l'application en tant que");
      expect(text).toContain('Revenir à moi@nozay-bad.fr');
    });

    it("reste absent hors usurpation", () => {
      const text = textFor({ email: 'moi@nozay-bad.fr', realEmail: 'moi@nozay-bad.fr' });
      expect(text).not.toContain("Vous consultez l'application en tant que");
    });

    it("reste absent quand la page oublie de passer l'identité affichée", () => {
      const text = textFor({ realEmail: 'moi@nozay-bad.fr' });
      expect(text).not.toContain("Vous consultez l'application en tant que");
    });
  });

  it('should toggle the mobile sidebar on hamburger click in mobile mode', () => {
    vi.useFakeTimers();
    isMobileViewport = true;
    const target = document.createElement('div');
    document.body.appendChild(target);

    const component = mount(AdminLayout, {
      target,
      props: {
        email: 'test@nozay-bad.fr'
      }
    });
    flushSync();

    // The mobile menu close button should not be present initially
    expect(document.querySelector('button[aria-label="Close menu"]')).toBeNull();

    // Find and click the mobile hamburger menu button
    const menuButton = target.querySelector('button[aria-label="Menu"]');
    expect(menuButton).not.toBeNull();

    // Trigger click on the hamburger menu button using native click
    // This will open the mobile drawer Sheet
    (menuButton as HTMLButtonElement).click();
    flushSync();

    // Now the mobile drawer is open, so the close button should be in the DOM
    const closeButton = document.querySelector('button[aria-label="Close menu"]');
    expect(closeButton).not.toBeNull();

    // Clean up directly using unmount (which is safe and bypasses JSDOM click propagation bugs)
    unmount(component);
    // Flush any pending body-scroll-lock cleanups before JSDOM teardown!
    vi.runAllTimers();
    vi.useRealTimers();
    target.remove();
  });
});
