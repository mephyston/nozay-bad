import { creerRelais, type Ecran } from '../../../../lib/relais';

/**
 * Le tableau de bord d'accueil.
 *
 * Un seul écran, aucune écriture : il ne fait qu'agréger. Son relais existe pour la même
 * raison que les autres — sortir neuf lectures du rendu de page.
 */

/**
 * Récapitulatif vide, aux chiffres à zéro plutôt qu'absents.
 *
 * Quand l'agrégation échoue, l'écran doit afficher des zéros et non des cases vides : un
 * tableau de bord muet laisse croire qu'il n'y a rien à traiter, ce qui est exactement
 * l'inverse de son rôle.
 */
const VIDE = () => ({
  season: '25-26',
  members: { currentTotal: 0, previousTotal: 0, partiallyPaid: 0 },
  accounting: { pendingChecks: 0, pendingDeposits: 0, pendingInvoices: 0 },
  expenses: { pendingReports: 0 },
  shop: { pendingOrders: 0 },
  poles: {
    events: { recettes: 0, depenses: 0, solde: 0 },
    youth: { recettes: 0, depenses: 0, solde: 0 },
    material: { recettes: 0, depenses: 0, solde: 0 },
    operations: { recettes: 0, depenses: 0, solde: 0 }
  }
});

export const ECRANS: Record<string, Ecran> = {
  overview: {
    permission: 'dashboard:overview:read',
    charger: async (lire, _locals, params) => {
      const demandee = params.get('season') ?? '';
      const requete = demandee ? `?seasonId=${encodeURIComponent(demandee)}` : '';

      const [recap, saisons] = await Promise.all([
        lire(`/dashboard/overview${requete}`),
        lire('/accounting/seasons')
      ]);

      const data = recap ?? VIDE();
      return {
        data,
        seasons: saisons ?? [],
        // La saison affichée est celle demandée, ou celle que l'agrégat a retenue.
        currentSeason: demandee || data.season
      };
    }
  }
};

export const { GET, POST } = creerRelais(ECRANS);
