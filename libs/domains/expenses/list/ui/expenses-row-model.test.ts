import { describe, it, expect, vi } from 'vitest';
import type { Expense } from './expenses-types';
import { gestesDeNote, libelleDeCategorie, ligneDeNote, statutDeNote } from './expenses-row-model';

function note(surcharges: Partial<Expense> = {}): Expense {
  return {
    id: 1,
    seasonId: '25-26',
    description: 'Volants pour le tournoi',
    category: 'volants',
    amount: 4500,
    photoUrl: null,
    status: 'pending',
    emitterName: 'Dupont Jean',
    memberId: 10,
    ledgerEntryId: null,
    createdAt: '2026-09-12T10:00:00.000Z',
    ...surcharges
  } as Expense;
}

const gestes = () => ({
  onSelectPhoto: vi.fn(),
  onAction: vi.fn(),
  onStartEdit: vi.fn(),
  onCancelValidation: vi.fn()
});

describe('expenses-row-model', () => {
  it('met le bénéficiaire en titre : c’est lui qu’on rembourse', () => {
    expect(ligneDeNote(note())).toEqual({
      titre: 'Dupont Jean',
      sousTitre: '12/09/2026 · Volants pour le tournoi',
      valeur: '45,00 €',
      ton: 'foreground'
    });
  });

  it("éteint le montant d'une note rejetée : rien n'a été remboursé", () => {
    expect(ligneDeNote(note({ status: 'rejected' })).ton).toBe('muted');
    expect(ligneDeNote(note({ status: 'approved' })).ton).toBe('success');
  });

  it('nomme les trois états', () => {
    expect(statutDeNote({ status: 'pending' }).label).toBe('En attente');
    expect(statutDeNote({ status: 'approved' }).label).toBe('Remboursée');
    expect(statutDeNote({ status: 'rejected' }).label).toBe('Rejetée');
  });

  it('retombe sur le code quand la catégorie n’a pas de libellé', () => {
    expect(libelleDeCategorie(note(), { volants: 'Volants' })).toBe('Volants');
    expect(libelleDeCategorie(note())).toBe('volants');
  });

  it('met la validation en tête, et fait porter sa question au rejet', () => {
    const actions = gestesDeNote(note(), gestes());
    expect(actions.map((a) => a.id)).toEqual(['valider', 'modifier', 'rejeter']);
    // Le geste se nomme comme son résultat : le statut dit « Remboursée ».
    expect(actions[0].label).toBe('Rembourser');
    // Valider se défait depuis l'historique : un balayage long peut la porter.
    expect(actions[0].confirm).toBeUndefined();
    // Rejeter s'annonce à quelqu'un.
    expect(actions.find((a) => a.id === 'rejeter')?.confirm).toContain('Dupont Jean');
  });

  it('ouvre le justificatif quand il existe, et seulement alors', () => {
    expect(gestesDeNote(note(), gestes()).map((a) => a.id)).not.toContain('justificatif');
    const avec = gestesDeNote(note({ photoUrl: '/photo.jpg' }), gestes());
    expect(avec.map((a) => a.id)).toContain('justificatif');
  });

  it("n'offre à l'historique que le retour en arrière", () => {
    expect(gestesDeNote(note({ status: 'approved' }), gestes()).map((a) => a.id)).toEqual(['rouvrir']);
    expect(gestesDeNote(note({ status: 'rejected' }), gestes()).map((a) => a.id)).toEqual(['rouvrir']);
  });

  it('ne laisse que le justificatif sur une saison clôturée', () => {
    const g = { ...gestes(), isClosed: true };
    expect(gestesDeNote(note(), g)).toEqual([]);
    expect(gestesDeNote(note({ photoUrl: '/p.jpg' }), g).map((a) => a.id)).toEqual(['justificatif']);
  });
});
