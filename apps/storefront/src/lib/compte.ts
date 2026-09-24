/**
 * Ce que « Mon compte » sait de l'adhérent connecté, et comment on l'écrit.
 *
 * La page réunissait tout — cotisation, commandes, notes de frais — dans des sections
 * repliées les unes sous les autres. Chaque rubrique ayant désormais sa page, la
 * lecture et le formatage vivent ici plutôt que recopiés quatre fois.
 */
export const eur = (cents: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format((cents ?? 0) / 100);

/** Une date lisible, ou rien : une date invalide affichée « Invalid Date » est pire que vide. */
export const dateFr = (v: unknown) => {
  const d = v ? new Date(v as string) : null;
  return d && !isNaN(d.getTime()) ? d.toLocaleDateString('fr-FR') : '';
};

export const STATUT_LABEL: Record<string, string> = {
  created: 'En attente de validation',
  awaiting_payment: 'À régler',
  paid: 'Payée',
  rejected: 'Refusée',
  cancelled: 'Annulée'
};

export const STATUT_CLASSE: Record<string, string> = {
  created: 'bg-muted text-muted-foreground border-border',
  // Seule ligne qui appelle une action de l'adhérent : elle doit se voir.
  awaiting_payment: 'bg-warning/10 text-warning border-warning/20',
  paid: 'bg-success/10 text-success border-success/20',
  rejected: 'bg-destructive/10 text-destructive border-destructive/20',
  cancelled: 'bg-muted text-muted-foreground border-border'
};

export function libelleDeStatut(statut: string | null | undefined): string {
  return STATUT_LABEL[statut ?? ''] ?? statut ?? '';
}

export function classeDeStatut(statut: string | null | undefined): string {
  return STATUT_CLASSE[statut ?? ''] ?? STATUT_CLASSE.created;
}

export type BesoinsDuCompte = {
  /** Les commandes de la boutique. */
  commandes?: boolean;
  /** Les notes de frais — seulement si l'adhérent y est autorisé. */
  notes?: boolean;
  /** L'état du foyer, pour le rappel de licence manquante. */
  foyer?: boolean;
};

export type DonneesDuCompte = {
  cotisation: any;
  seasonName: string;
  canExpense: boolean;
  orders: any[];
  expenses: any[];
  lapsedMembers: Array<{ firstName: string; lastName: string }>;
};

/**
 * Lit ce dont la page a besoin, et rien d'autre.
 *
 * L'adhérent est toujours demandé : c'est lui qui porte l'autorisation de note de
 * frais, donc la décision de charger les notes — les demander d'abord reviendrait à
 * interroger une API qui refusera.
 */
export async function chargerCompte(
  apiFetch: (url: string, init?: RequestInit) => Promise<Response>,
  params: { licence: string; memberId: number; email?: string; seasonCode?: string; seasonName?: string; canExpense: boolean },
  besoins: BesoinsDuCompte = {}
): Promise<DonneesDuCompte> {
  const donnees: DonneesDuCompte = {
    cotisation: null,
    seasonName: params.seasonName ?? '',
    canExpense: params.canExpense,
    orders: [],
    expenses: [],
    lapsedMembers: []
  };

  try {
    const suffixe = params.seasonCode ? `?season=${encodeURIComponent(params.seasonCode)}` : '';
    const memberRes = await apiFetch(`http://localhost/members/${encodeURIComponent(params.licence)}${suffixe}`);
    if (memberRes.ok) donnees.cotisation = ((await memberRes.json()) as any).data;
    donnees.canExpense = Boolean(donnees.cotisation?.expenseAuthorized ?? params.canExpense);

    const [ordersRes, expensesRes, householdRes] = await Promise.all([
      besoins.commandes ? apiFetch(`http://localhost/shop/orders?memberId=${params.memberId}`) : Promise.resolve(null),
      besoins.notes && donnees.canExpense ? apiFetch(`http://localhost/expenses?memberId=${params.memberId}`) : Promise.resolve(null),
      besoins.foyer
        ? apiFetch('http://localhost/members/lookup-household', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier: params.email })
          })
        : Promise.resolve(null)
    ]);

    if (ordersRes?.ok) donnees.orders = ((await ordersRes.json()) as any).data || [];
    if (expensesRes?.ok) donnees.expenses = ((await expensesRes.json()) as any).data || [];
    if (householdRes?.ok) donnees.lapsedMembers = ((await householdRes.json()) as any)?.data?.lapsedMembers || [];
  } catch {
    /* Une rubrique vide vaut mieux qu'une page en erreur : l'adhérent voit le reste. */
  }

  return donnees;
}

/** Montants de la cotisation, avec le restant recalculé si l'API ne le donne pas. */
export function montantsDeCotisation(cotisation: any) {
  const du = cotisation?.amountDueCents ?? 0;
  const recu = cotisation?.amountReceivedCents ?? 0;
  return {
    du,
    recu,
    restant: cotisation?.amountRemainingCents ?? Math.max(0, du - recu),
    aJour: Boolean(cotisation?.paid)
  };
}
