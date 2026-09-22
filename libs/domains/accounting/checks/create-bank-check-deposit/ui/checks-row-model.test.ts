import { describe, it, expect, vi } from 'vitest';
import type { Check, CheckDeposit } from './check-deposit-types';
import {
  chequeDisponible,
  gestesDeCheque,
  gestesDeRemise,
  ligneDeCheque,
  ligneDeRemise,
  signalementDeCheque,
  statutDeRemise
} from './checks-row-model';

function cheque(surcharges: Partial<Check> = {}): Check {
  return {
    id: 1,
    number: '1234567',
    emitter: 'Jean Dupont',
    bank: 'Crédit Agricole',
    amount: 4500,
    createdAt: '2026-09-12T10:00:00.000Z',
    status: 'received',
    ...surcharges
  } as Check;
}

function remise(surcharges: Partial<CheckDeposit> = {}): CheckDeposit {
  return {
    id: 9,
    reference: 'REMISE-20260912-3',
    date: '2026-09-12',
    amount: 120000,
    status: 'pending',
    ...surcharges
  } as CheckDeposit;
}

describe('les chèques', () => {
  it("met l'émetteur en titre, et le situe par son numéro, sa banque et sa date", () => {
    expect(ligneDeCheque(cheque())).toEqual({
      titre: 'Jean Dupont',
      sousTitre: 'N° 1234567 · Crédit Agricole · 12/09/2026',
      valeur: '45,00 €',
      ton: 'foreground'
    });
  });

  it('se passe de la banque quand elle est inconnue', () => {
    expect(ligneDeCheque(cheque({ bank: '' })).sousTitre).toBe('N° 1234567 · 12/09/2026');
  });

  it('ne signale que ce qui change ce qu’on peut en faire', () => {
    // « Dès que possible » est le cas courant : il ne s'annonce pas.
    expect(signalementDeCheque(cheque())).toBeNull();
    // Le mois est stocké en calendaire (1 à 12), pas en `AAAA-MM`.
    expect(signalementDeCheque(cheque({ plannedDepositMonth: 10 }))).toEqual({
      label: 'Octobre',
      variant: 'secondary'
    });
    // Un mois hors des douze ne produit pas un badge vide.
    expect(signalementDeCheque(cheque({ plannedDepositMonth: 99 as never }))).toBeNull();
    // Inscrit sur un bordereau, il ne peut plus être retenu ailleurs : c'est prioritaire.
    expect(signalementDeCheque(cheque({ checkDepositId: 9, plannedDepositMonth: 10 }))).toEqual({
      label: 'Remise à déposer',
      variant: 'warning'
    });
  });

  it('retire tout geste à un chèque déjà inscrit sur un bordereau', () => {
    const g = { onEdit: vi.fn(), onDelete: vi.fn() };
    expect(chequeDisponible(cheque())).toBe(true);
    expect(chequeDisponible(cheque({ checkDepositId: 9 }))).toBe(false);
    expect(gestesDeCheque(cheque({ checkDepositId: 9 }), g)).toEqual([]);
    expect(gestesDeCheque(cheque(), { ...g, isClosed: true })).toEqual([]);
  });

  it('met la modification en tête, et fait porter sa question à la suppression', () => {
    const actions = gestesDeCheque(cheque(), { onEdit: vi.fn(), onDelete: vi.fn() });
    expect(actions.map((a) => a.id)).toEqual(['modifier', 'supprimer']);
    expect(actions[1].confirm).toContain('1234567');
    expect(actions[1].confirm).toContain('sans retour');
  });
});

describe('les remises', () => {
  it('projette la référence, sa date et son total', () => {
    expect(ligneDeRemise(remise())).toEqual({
      titre: 'REMISE-20260912-3',
      sousTitre: '12/09/2026',
      valeur: '1 200,00 €',
      ton: 'foreground'
    });
  });

  it('nomme les trois états du parcours', () => {
    expect(statutDeRemise({ status: 'pending' }).label).toBe('À déposer');
    expect(statutDeRemise({ status: 'deposited' }).label).toBe('Déposée');
    expect(statutDeRemise({ status: 'cleared' }).label).toBe('Encaissée');
    expect(ligneDeRemise(remise({ status: 'cleared' })).ton).toBe('success');
  });

  const gestes = () => ({
    onConsulter: vi.fn(),
    onConfirmer: vi.fn(),
    onEncaisser: vi.fn(),
    onSupprimer: vi.fn()
  });

  it("met l'étape suivante en tête, et elle change avec l'état", () => {
    expect(gestesDeRemise(remise(), gestes()).map((a) => a.id)).toEqual([
      'confirmer',
      'consulter',
      'supprimer'
    ]);
    expect(gestesDeRemise(remise({ status: 'deposited' }), gestes()).map((a) => a.id)).toEqual([
      'encaisser',
      'consulter',
      'supprimer'
    ]);
    // Encaissée : il n'y a plus d'étape, seulement la consultation et le retrait.
    expect(gestesDeRemise(remise({ status: 'cleared' }), gestes()).map((a) => a.id)).toEqual([
      'consulter',
      'supprimer'
    ]);
  });

  it("ne laisse que la consultation sur une saison clôturée", () => {
    expect(gestesDeRemise(remise(), { ...gestes(), isClosed: true }).map((a) => a.id)).toEqual([
      'consulter'
    ]);
  });

  it('prévient que la suppression rend ses chèques au coffre', () => {
    const suppression = gestesDeRemise(remise(), gestes()).find((a) => a.id === 'supprimer');
    expect(suppression?.confirm).toContain('redeviennent disponibles');
  });
});
