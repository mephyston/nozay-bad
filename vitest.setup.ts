import { vi } from 'vitest';

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = ResizeObserverMock;

/**
 * `Element.animate` n'existe pas dans jsdom.
 *
 * Les transitions Svelte — `slide` d'une section repliable, par exemple — l'appellent dès
 * qu'un élément s'ouvre après le montage. Sans ce bouchon, le composant lève, et l'échec
 * désigne la transition plutôt que le comportement qu'on voulait vérifier.
 *
 * On rend une animation déjà terminée : les tests n'observent jamais l'entre-deux.
 */
if (typeof Element !== 'undefined' && !Element.prototype.animate) {
  Element.prototype.animate = function animate() {
    return {
      cancel() {},
      finish() {},
      pause() {},
      play() {},
      reverse() {},
      currentTime: 0,
      playState: 'finished',
      finished: Promise.resolve(),
      onfinish: null,
      effect: null
    } as unknown as Animation;
  };
}
