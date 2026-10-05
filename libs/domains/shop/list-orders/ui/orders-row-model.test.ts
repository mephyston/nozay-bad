import { describe, it, expect } from 'vitest';
import type { OrderItem } from './orders-manager-types';
import {
  articlesCommandes,
  commandesCsv,
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
    // Payée, elle reste ouverte tant que l'article n'est pas remis.
    expect(etapeOuverte(commande({ status: 'paid' }))).toBe('paid');
    expect(estOuverte(commande({ status: 'paid' }))).toBe(true);
    expect(estOuverte(commande({ status: 'delivered' }))).toBe(false);
  });

  it('associe à chaque étape son libellé et son couple d’actions', () => {
    expect(ETAPE_LABELS.created).toBe('Nouvelle');
    expect(ETAPE_LABELS.awaiting_payment).toBe('En attente de paiement');
    expect(ACTION_LABELS.created).toEqual({ primaire: 'Valider', secondaire: 'Refuser' });
    expect(ACTION_LABELS.awaiting_payment).toEqual({ primaire: 'Encaisser', secondaire: 'Annuler' });
    expect(ETAPE_LABELS.paid).toBe('Payée');
    expect(ACTION_LABELS.paid).toEqual({ primaire: 'Livrer', secondaire: "Annuler l'encaissement" });
  });

  it('nomme les trois issues closes, et rien pour une commande ouverte', () => {
    expect(issueCommande(commande({ status: 'delivered' }))).toEqual({ label: 'Livrée', variant: 'success' });
    expect(issueCommande(commande({ status: 'paid' }))).toBeNull();
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
    actionsDeCommande(item, { onPrimary: noop, onSecondary: noop, onUndeliver: noop, onEdit }).map((a) => a.id);

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
    // Payée : livrer ou défaire l'encaissement, mais plus rien à corriger, la recette est écrite.
    expect(ids(commande({ status: 'paid' }), noop)).toEqual(['primaire', 'secondaire']);
    expect(ids(commande({ status: 'delivered' }), noop)).toEqual(['undeliver']);
    expect(ids(commande({ status: 'rejected' }), noop)).toEqual([]);
  });
});

describe('actionsDeCommande — ce que chaque droit permet', () => {
  const noop = () => {};
  const labels = (item: OrderItem, droits: { decider: boolean; encaisser: boolean }) =>
    actionsDeCommande(item, { onPrimary: noop, onSecondary: noop, onUndeliver: noop, droits }).map((a) => a.label);
  const entraineur = { decider: true, encaisser: false };
  const tresorerie = { decider: true, encaisser: true };
  const lecture = { decider: false, encaisser: false };

  it("laisse l'entraîneur valider, refuser, annuler et livrer, jamais encaisser", () => {
    expect(labels(commande({ status: 'created' }), entraineur)).toEqual(['Valider', 'Refuser']);
    expect(labels(commande({ status: 'awaiting_payment', awaitingPaymentSince: '2026-08-20' }), entraineur)).toEqual([
      'Annuler'
    ]);
    expect(labels(commande({ status: 'paid' }), entraineur)).toEqual(['Livrer']);
    expect(labels(commande({ status: 'delivered' }), entraineur)).toEqual(['Annuler la remise']);
  });

  it('réserve encaisser et défaire un encaissement à la trésorerie', () => {
    expect(labels(commande({ status: 'awaiting_payment', awaitingPaymentSince: '2026-08-20' }), tresorerie)).toEqual([
      'Encaisser',
      'Annuler'
    ]);
    expect(labels(commande({ status: 'paid' }), tresorerie)).toEqual(['Livrer', "Annuler l'encaissement"]);
  });

  it("n'offre rien à qui ne fait que consulter", () => {
    for (const status of ['created', 'awaiting_payment', 'paid', 'delivered'] as const) {
      expect(labels(commande({ status }), lecture), status).toEqual([]);
    }
  });
});

describe('articlesCommandes — le filtre par article', () => {
  const commande = (id: number, product: Record<string, unknown>) =>
    ({ order: { id }, product }) as unknown as OrderItem;

  it('range les tailles sous leur article parent, sans le suffixe de taille', () => {
    const items = [
      commande(1, { id: 34, parentId: 33, name: 'Maillot du club — L', variantLabel: 'L' }),
      commande(2, { id: 35, parentId: 33, name: 'Maillot du club — M', variantLabel: 'M' }),
      commande(3, { id: 7, parentId: null, name: 'Boîte de volants', variantLabel: null }),
      commande(4, { id: 7, parentId: null, name: 'Boîte de volants', variantLabel: null })
    ];
    expect(articlesCommandes(items)).toEqual([
      { value: '7', label: 'Boîte de volants' },
      { value: '33', label: 'Maillot du club' }
    ]);
  });
});

describe('commandesCsv — l\'export des commandes affichées', () => {
  it('donne qui a commandé quoi, et comment le joindre, aux conventions du tableur français', () => {
    const item = {
      order: { id: 1, quantity: 2, totalAmountCents: 5000, totalAmount: 5000, status: 'awaiting_payment', createdAt: '2026-09-12T10:00:00.000Z' },
      member: { id: 10, lastName: 'DA COSTA', firstName: 'Dylan', licence: '1', email: ' dylan@example.com ' },
      product: { id: 34, name: 'Maillot du club — L "homme"' }
    } as unknown as OrderItem;

    const [entete, ligne] = commandesCsv([item]).trimEnd().split('\n');
    expect(entete).toBe('Nom;Prénom;Email;Article;Quantité;Montant;Statut;Date');
    expect(ligne).toBe(
      '"DA COSTA";"Dylan";"dylan@example.com";"Maillot du club — L ""homme""";"2";"50,00";"En attente de paiement";"12/09/2026"'
    );
  });
});
