import { describe, expect, it } from 'vitest';
import { closedPaperMessage, hashPaperCode, newPaperCode, readPaperCode } from './paper-card';

describe('code des cartes papier', () => {
  it('se lit seul, ou dans une adresse, quelle que soit la casse', () => {
    const code = newPaperCode();
    expect(readPaperCode(code)).toBe(code);
    expect(readPaperCode(`https://buvette.test/carte/${code}`)).toBe(code);
    expect(readPaperCode(code.toLowerCase())).toBe(code);
    expect(readPaperCode('eyJrIjoicXIi.abc')).toBeNull();
  });

  it('ne se répète pas, et son empreinte ne le révèle pas', async () => {
    expect(newPaperCode()).not.toBe(newPaperCode());
    const code = newPaperCode();
    expect(await hashPaperCode(code)).toHaveLength(64);
    expect(await hashPaperCode(code)).not.toContain(code);
  });

  it('dit clairement qu\'une carte est déjà remboursée', () => {
    expect(closedPaperMessage('refunded')).toContain('déjà été remboursée');
  });
});
