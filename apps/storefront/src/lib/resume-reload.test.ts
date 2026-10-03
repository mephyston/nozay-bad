import { describe, it, expect, vi, afterEach } from 'vitest';
import { RESUME_RELOAD_AFTER_MS, installResumeReload, isUserBusy, shouldReloadOnResume } from './resume-reload';

describe('shouldReloadOnResume', () => {
  const now = 10 * RESUME_RELOAD_AFTER_MS;

  it('recharge une page rouverte après une longue absence', () => {
    expect(shouldReloadOnResume({ hiddenAt: now - RESUME_RELOAD_AFTER_MS, now, busy: false })).toBe(true);
  });

  it("ne recharge pas au simple passage d'une application à l'autre", () => {
    expect(shouldReloadOnResume({ hiddenAt: now - 60_000, now, busy: false })).toBe(false);
  });

  it("n'efface jamais une saisie en cours", () => {
    expect(shouldReloadOnResume({ hiddenAt: now - 2 * RESUME_RELOAD_AFTER_MS, now, busy: true })).toBe(false);
  });

  it('ne recharge pas une page qui n’a jamais été cachée', () => {
    expect(shouldReloadOnResume({ hiddenAt: null, now, busy: false })).toBe(false);
  });
});

describe('isUserBusy', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('voit un tiroir ouvert', () => {
    document.body.innerHTML = '<div role="dialog">Commande</div>';
    expect(isUserBusy(document)).toBe(true);
  });

  it('voit un champ en cours de saisie', () => {
    document.body.innerHTML = '<input id="q" />';
    (document.getElementById('q') as HTMLInputElement).focus();
    expect(isUserBusy(document)).toBe(true);
  });

  it('laisse recharger une page au repos', () => {
    document.body.innerHTML = '<main>Boutique</main>';
    expect(isUserBusy(document)).toBe(false);
  });
});

describe('installResumeReload', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  function setVisibility(state: 'hidden' | 'visible') {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
    document.dispatchEvent(new Event('visibilitychange'));
  }

  it('recharge au retour après 30 min, pas après 1 min', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-03T10:00:00Z'));
    const reload = vi.fn();
    const win = { document, location: { reload } } as unknown as Window;
    installResumeReload(win);

    setVisibility('hidden');
    vi.setSystemTime(new Date('2026-10-03T10:01:00Z'));
    setVisibility('visible');
    expect(reload).not.toHaveBeenCalled();

    setVisibility('hidden');
    vi.setSystemTime(new Date('2026-10-03T10:31:00Z'));
    setVisibility('visible');
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
