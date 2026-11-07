import { describe, expect, it } from 'vitest';
import { sumUpLink } from './sumup-link';

const base = { affiliateKey: 'cle', amountCents: 450, foreignTxId: 'buv-1', origin: 'https://caisse.test' };

describe('lien vers SumUp', () => {
  it('iOS : amount et deux adresses de retour', () => {
    const url = sumUpLink({ ...base, isIos: true });
    expect(url).toContain('amount=4.50');
    expect(url).toContain('foreign-tx-id=buv-1');
    expect(url).toContain('callbacksuccess=https%3A%2F%2Fcaisse.test%2Fretour');
    expect(url).toContain('callbackfail=');
  });

  it('Android : total et une seule adresse de retour', () => {
    const url = sumUpLink({ ...base, isIos: false });
    expect(url).toContain('total=4.50');
    expect(url).toContain('callback=https%3A%2F%2Fcaisse.test%2Fretour');
    expect(url).not.toContain('callbacksuccess');
  });
});
