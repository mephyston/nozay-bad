import { describe, it, expect, vi } from 'vitest';
import { createQueryCache, memo } from './query-cache';

describe('mémoïsation des lectures partagées', () => {
  it('une clé identique n’exécute la lecture qu’une fois', async () => {
    const cache = createQueryCache();
    const load = vi.fn().mockResolvedValue('résultat');

    const a = await memo(cache, 'directory:2026-2027', load);
    const b = await memo(cache, 'directory:2026-2027', load);

    expect(load).toHaveBeenCalledTimes(1);
    expect(a).toBe('résultat');
    expect(b).toBe('résultat');
  });

  it('des clés différentes restent des lectures distinctes', async () => {
    const cache = createQueryCache();
    const load = vi.fn().mockImplementation((n: number) => Promise.resolve(n));

    await memo(cache, 'rankings:2026-09-01', () => load(1));
    await memo(cache, 'rankings:2026-10-01', () => load(2));

    expect(load).toHaveBeenCalledTimes(2);
  });

  /**
   * Les équipes sont chargées de front : sans mémorisation *avant* l'attente, six appels
   * simultanés partiraient tous avant que le premier ait renseigné le cache, et la
   * déduplication ne servirait à rien là où elle compte le plus.
   */
  it('des appels concurrents sur la même clé partagent un seul vol', async () => {
    const cache = createQueryCache();
    let resolve: (v: string) => void;
    const load = vi.fn().mockImplementation(
      () => new Promise<string>((r) => { resolve = r; })
    );

    const pending = Promise.all([
      memo(cache, 'history:2026-2027:2026-09-07', load),
      memo(cache, 'history:2026-2027:2026-09-07', load),
      memo(cache, 'history:2026-2027:2026-09-07', load)
    ]);

    resolve!('historique');
    await expect(pending).resolves.toEqual(['historique', 'historique', 'historique']);
    expect(load).toHaveBeenCalledTimes(1);
  });

  /**
   * Sans cache, le comportement doit être exactement celui d'avant : c'est ce qui permet
   * à l'écran capitaine, qui ne charge qu'une équipe, de ne pas être touché.
   */
  it('sans cache, chaque appel exécute la lecture', async () => {
    const load = vi.fn().mockResolvedValue('résultat');

    await memo(undefined, 'directory:2026-2027', load);
    await memo(undefined, 'directory:2026-2027', load);

    expect(load).toHaveBeenCalledTimes(2);
  });
});
