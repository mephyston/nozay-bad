import { describe, it, expect } from 'vitest';
import type { OrderItem } from './orders-manager-types';
import {
  ACTION_LABELS,
  actionsDeCommande,
  ETAPE_LABELS,
  articleCommande,
  dateFr,
  enRetard,
  estOuverte,
  etapeOuverte,
  issueCommande,
  joursDAttente,
  codeDeSaison,
  ligneCommande,
  montantCents,
  nomAdherent
} from './orders-row-model';

/*
  L'horloge de la suite est figée au 30/08/2026 (voir vitest.setup.clock.ts) : les
  durées d'attente se calculent donc à partir de cette date, et non du jour réel.
*/

function commande(surcharges: Partial<OrderItem['order']> = {}, item: Partial<OrderItem> = {}): OrderItem {
  return {
    order: {
      id: 1,
      seasonId: '25-26',
      memberId: 10,
      productId: 100,
      quantity: 2,
      totalAmount: 5000,
      paymentMethod: 'virement',
      status: 'created',
      awaitingPaymentSince: null,
      ledgerEntryId: null,
      createdAt: '2026-08-12T10:00:00.000Z',
      ...surcharges
    },
    member: { id: 10, firstName: 'Jean', lastName: 'Dupont', licence: '123456' },
    product: { id: 100, name: 'Volants Mavis 350', price: 2500, stock: 12, active: true, category: 'Volants' },
    ...item
  } as OrderItem;
}

describe('orders-row-model', () => {
  it("projette l'adhérent en titre, l'article en sous-titre et le montant à droite", () => {
    expect(ligneCommande(commande())).toEqual({
      titre: 'Dupont Jean',
      sousTitre: '2 × Volants Mavis 350',
      // L'espace avant la devise est insécable : c'est la convention de `formatAmount`.
      valeur: '50,00\u00A0€',
      ton: 'foreground',
      legende: '12/08/2026'
    });
  });

  it("éteint le montant d'une commande refusée ou annulée : l'argent n'a pas bougé", () => {
    expect(ligneCommande(commande({ status: 'rejected' })).ton).toBe('muted');
    expect(ligneCommande(commande({ status: 'cancelled' })).ton).toBe('muted');
    expect(ligneCommande(commande({ status: 'paid' })).ton).toBe('foreground');
  });

  it('nomme une commande sans adhérent plutôt que de laisser un blanc', () => {
    expect(nomAdherent(commande({}, { member: undefined }))).toBe('Adhérent inconnu');
    expect(articleCommande(commande({}, { product: undefined }))).toBe('2 × Produit supprimé');
  });

  it('lit le montant sous ses deux formes de relais', () => {
    expect(montantCents(commande())).toBe(5000);
    expect(montantCents(commande({ totalAmountCents: 7350 } as never))).toBe(7350);
  });

  it("déduit l'étape du statut, et sait ce qui est encore ouvert", () => {
    expect(etapeOuverte(commande())).toBe('created');
    expect(etapeOuverte(commande({ status: 'awaiting_payment' }))).toBe('awaiting_payment');
    expect(estOuverte(commande({ status: 'awaiting_payment' }))).toBe(true);
    expect(estOuverte(commande({ status: 'paid' }))).toBe(false);
  });

  it('associe à chaque étape son libellé et son couple d’actions', () => {
    expect(ETAPE_LABELS.created).toBe('À valider');
    expect(ETAPE_LABELS.awaiting_payment).toBe('En attente de paiement');
    expect(ACTION_LABELS.created).toEqual({ primaire: 'Valider', secondaire: 'Refuser' });
    expect(ACTION_LABELS.awaiting_payment).toEqual({ primaire: 'Encaisser', secondaire: 'Annuler' });
  });

  it('nomme les trois issues closes, et rien pour une commande ouverte', () => {
    expect(issueCommande(commande({ status: 'paid' }))).toEqual({ label: 'Payée', variant: 'success' });
    expect(issueCommande(commande({ status: 'rejected' }))).toEqual({ label: 'Refusée', variant: 'destructive' });
    expect(issueCommande(commande({ status: 'cancelled' }))).toEqual({ label: 'Annulée', variant: 'outline' });
    expect(issueCommande(commande())).toBeNull();
  });

  it("compte les jours d'attente et ne signale qu'au-delà d'une semaine", () => {
    expect(joursDAttente('2026-08-20T12:00:00.000Z')).toBe(10);
    expect(joursDAttente(null)).toBeNull();
    expect(joursDAttente('pas une date')).toBeNull();

    const relancable = commande({ status: 'awaiting_payment', awaitingPaymentSince: '2026-08-20T12:00:00.000Z' });
    expect(enRetard(relancable)).toBe(10);

    const recente = commande({ status: 'awaiting_payment', awaitingPaymentSince: '2026-08-28T12:00:00.000Z' });
    expect(enRetard(recente)).toBeNull();

    // Une commande qui n'attend pas de règlement n'est jamais en retard de règlement.
    expect(enRetard(commande({ awaitingPaymentSince: '2026-01-01T12:00:00.000Z' }))).toBeNull();
  });

  it('rend une date illisible par un tiret, jamais par « Invalid Date »', () => {
    expect(dateFr('2026-08-12T10:00:00.000Z')).toBe('12/08/2026');
    expect(dateFr(null)).toBe('—');
    expect(dateFr('n’importe quoi')).toBe('—');
  });
  it("identifie une saison par son code, et retombe sur l'id des jeux d'essai anciens", () => {
    // Forme servie par le relais : une clé primaire numérique et un code.
    expect(codeDeSaison({ id: 2, code: '26-27', name: 'Saison 2026-2027', active: true })).toBe('26-27');
    // Forme ancienne, où l'id portait déjà le code.
    expect(codeDeSaison({ id: '25-26', name: 'Saison 2025-2026', active: true })).toBe('25-26');
  });
});

describe('actionsDeCommande — corriger une commande', () => {
  const noop = () => {};
  const ids = (item: OrderItem, onEdit?: (i: OrderItem) => void) =>
    actionsDeCommande(item, { onPrimary: noop, onSecondary: noop, onUnpay: noop, onEdit }).map((a) => a.id);

  it('offre « Modifier » en dernier sur une commande ouverte : le balayage long reste réversible', () => {
    expect(ids(commande({ status: 'created' }), noop)).toEqual(['primaire', 'secondaire', 'modifier']);
    expect(ids(commande({ status: 'awaiting_payment', awaitingPaymentSince: '2026-08-20' }), noop)).toEqual([
      'primaire',
      'secondaire',
      'modifier'
    ]);
  });

  it("ne l'offre ni sans le droit, ni sur une commande réglée ou close", () => {
    expect(ids(commande({ status: 'created' }))).toEqual(['primaire', 'secondaire']);
    expect(ids(commande({ status: 'paid' }), noop)).toEqual(['unpay']);
    expect(ids(commande({ status: 'rejected' }), noop)).toEqual([]);
  });
});
