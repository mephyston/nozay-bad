import { describe, it, expect, vi } from 'vitest';
import type { Invoice } from './invoices-types';
import { gestesDeFacture, ligneDeFacture, montantCents, statutDeFacture } from './invoices-row-model';

function facture(surcharges: Partial<Invoice> = {}): Invoice {
  return {
    id: 1,
    invoiceNumber: 'F-2026-014',
    clientName: 'Mairie de Nozay',
    date: '2026-09-12',
    totalAmount: 45000,
    status: 'draft',
    ...surcharges
  } as Invoice;
}

const gestes = () => ({
  onPrint: vi.fn(),
  onEdit: vi.fn(),
  onStatusChange: vi.fn(),
  onDelete: vi.fn()
});

describe('invoices-row-model', () => {
  it('projette le client en titre, le numéro et la date en dessous, le montant à droite', () => {
    expect(ligneDeFacture(facture({ status: 'sent' }))).toEqual({
      titre: 'Mairie de Nozay',
      sousTitre: 'F-2026-014 · 2026-09-12',
      valeur: '450,00 €',
      ton: 'foreground'
    });
  });

  it("éteint le montant d'une facture annulée : rien n'a été encaissé", () => {
    expect(ligneDeFacture(facture({ status: 'cancelled' })).ton).toBe('muted');
    expect(ligneDeFacture(facture({ status: 'paid' })).ton).toBe('success');
  });

  it('nomme les quatre statuts', () => {
    expect(statutDeFacture({ status: 'draft' }).label).toBe('Brouillon');
    expect(statutDeFacture({ status: 'sent' }).label).toBe('En attente de règlement');
    expect(statutDeFacture({ status: 'paid' }).label).toBe('Payée');
    expect(statutDeFacture({ status: 'cancelled' }).label).toBe('Annulée');
  });

  it('lit le montant sous ses deux formes de relais', () => {
    expect(montantCents(facture())).toBe(45000);
    expect(montantCents(facture({ totalAmountCents: 999 } as never))).toBe(999);
  });

  describe('les gestes suivent où en est la facture', () => {
    it("met l'avancement en tête d'un brouillon, et sa suppression en dernier", () => {
      const actions = gestesDeFacture(facture(), gestes());
      expect(actions.map((a) => a.id)).toEqual([
        'envoyer',
        'modifier',
        'imprimer',
        'annuler',
        'supprimer'
      ]);
      // Le balayage long exécute la première : elle doit être réversible.
      expect(actions[0].tone).toBe('primary');
    });

    it("n'offre que l'encaissement et l'annulation sur une facture envoyée", () => {
      const actions = gestesDeFacture(facture({ status: 'sent' }), gestes());
      expect(actions.map((a) => a.id)).toEqual(['payee', 'imprimer', 'annuler']);
      // Une facture envoyée ne se supprime pas : elle s'annule.
      expect(actions.map((a) => a.id)).not.toContain('supprimer');
    });

    it("ne laisse qu'imprimer sur une facture payée", () => {
      expect(gestesDeFacture(facture({ status: 'paid' }), gestes()).map((a) => a.id)).toEqual([
        'imprimer'
      ]);
    });

    it('laisse supprimer une facture annulée, et la réimprimer', () => {
      expect(gestesDeFacture(facture({ status: 'cancelled' }), gestes()).map((a) => a.id)).toEqual([
        'imprimer',
        'supprimer'
      ]);
    });

    it("fait porter leur question aux deux gestes sans retour", () => {
      const actions = gestesDeFacture(facture(), gestes());
      expect(actions.find((a) => a.id === 'annuler')?.confirm).toContain('F-2026-014');
      expect(actions.find((a) => a.id === 'supprimer')?.confirm).toContain('sans retour');
      // L'avancement, lui, ne demande rien : il se défait.
      expect(actions.find((a) => a.id === 'envoyer')?.confirm).toBeUndefined();
    });

    it("ne laisse qu'imprimer sur une saison clôturée", () => {
      const actions = gestesDeFacture(facture(), { ...gestes(), isClosed: true });
      expect(actions.map((a) => a.id)).toEqual(['imprimer']);
    });

    it('exécute chaque geste sur la facture qu’on lui passe', () => {
      const g = gestes();
      const actions = gestesDeFacture(facture({ id: 7 }), g);
      actions.find((a) => a.id === 'envoyer')!.run(facture({ id: 7 }));
      expect(g.onStatusChange).toHaveBeenCalledWith(7, 'sent');

      actions.find((a) => a.id === 'supprimer')!.run(facture({ id: 7 }));
      expect(g.onDelete).toHaveBeenCalledWith(7, 'F-2026-014');
    });
  });
});
