import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isStandaloneApp, openDocument } from './document-link';

// jsdom n'implémente pas matchMedia : on le pose, on ne l'espionne pas.
function displayMode(standalone: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({ matches: standalone && query === '(display-mode: standalone)' })
  });
}

describe('document-link', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete (window.navigator as { standalone?: boolean }).standalone;
  });

  it("n'est pas en application installée dans un onglet de navigateur", () => {
    displayMode(false);
    expect(isStandaloneApp()).toBe(false);
  });

  it('reconnaît le mode standalone par la media query (Android, bureau)', () => {
    displayMode(true);
    expect(isStandaloneApp()).toBe(true);
  });

  it('reconnaît le mode standalone par navigator.standalone (iOS)', () => {
    displayMode(false);
    (window.navigator as { standalone?: boolean }).standalone = true;
    expect(isStandaloneApp()).toBe(true);
  });

  it('ouvre le document dans un nouvel onglet depuis un navigateur', () => {
    displayMode(false);
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    openDocument('/doc.pdf');
    expect(open).toHaveBeenCalledWith('/doc.pdf', '_blank', 'noopener');
  });

  /*
    Le point qui compte : une fenêtre neuve en application installée n'a ni onglets ni
    historique, le geste de retour n'y ramène nulle part. Le document remplace l'écran.
  */
  it("remplace l'écran courant en application installée, pour que le retour fonctionne", () => {
    displayMode(true);
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    const assign = vi.fn();
    const original = window.location;
    Object.defineProperty(window, 'location', { configurable: true, value: { assign } });
    openDocument('/doc.pdf');
    expect(assign).toHaveBeenCalledWith('/doc.pdf');
    expect(open).not.toHaveBeenCalled();
    Object.defineProperty(window, 'location', { configurable: true, value: original });
  });
});
