import { describe, it, expect } from 'vitest';
import { Member } from './member';

const base = { lastName: 'Martin', firstName: 'Léa', birthDate: '1990-01-01', amountDueCents: 15000 };

describe('Member.canReceiveAttestation', () => {
  it('délivre l’attestation à qui a soldé sa cotisation', () => {
    expect(new Member({ ...base, amountReceivedCents: 15000, paid: true }).canReceiveAttestation()).toBe(true);
  });

  // Un premier règlement suffit : le comité d'entreprise rembourse sur ce qui a été payé.
  it('la délivre aussi à qui a réglé en partie', () => {
    const m = new Member({ ...base, amountReceivedCents: 5000, paid: false });
    expect(m.canReceiveAttestation()).toBe(true);
    expect(m.partiallyPaid).toBe(true);
  });

  it('la refuse tant que rien n’a été réglé', () => {
    const m = new Member({ ...base, amountReceivedCents: 0, paid: false });
    expect(m.canReceiveAttestation()).toBe(false);
    expect(m.partiallyPaid).toBe(false);
  });
});
