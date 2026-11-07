import { describe, expect, it } from 'vitest';
import { boxesFor } from './paper-layout';

describe('cases d\'une carte papier', () => {
  it('compte les cases à barrer', () => {
    expect(boxesFor(500, 50)).toBe(10);
    expect(boxesFor(1000, 50)).toBe(20);
    expect(boxesFor(1000, 100)).toBe(10);
  });
});
