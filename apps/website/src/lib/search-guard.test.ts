import { describe, it, expect } from 'vitest';
import { allowSearch, cleanQuery } from './search-guard';

describe('cleanQuery', () => {
  it('normalise les espaces et borne la longueur', () => {
    expect(cleanQuery('  tournoi   de   noël ')).toBe('tournoi de noël');
    expect(cleanQuery('a'.repeat(200))).toHaveLength(80);
    expect(cleanQuery(null)).toBe('');
  });
});

describe('allowSearch', () => {
  const request = new Request('https://site.test/api/search?q=x', { headers: { 'cf-connecting-ip': '203.0.113.7' } });

  it('laisse passer sans limiteur (développement local)', async () => {
    expect(await allowSearch({}, request)).toBe(true);
  });

  it('demande au limiteur, par adresse, et respecte son refus', async () => {
    const keys: string[] = [];
    const env = { SEARCH_LIMITER: { limit: async ({ key }: { key: string }) => { keys.push(key); return { success: false }; } } };
    expect(await allowSearch(env, request)).toBe(false);
    expect(keys).toEqual(['203.0.113.7']);
  });

  it('laisse passer si le limiteur tombe en panne', async () => {
    const env = { SEARCH_LIMITER: { limit: async () => { throw new Error('boom'); } } };
    expect(await allowSearch(env, request)).toBe(true);
  });
});
