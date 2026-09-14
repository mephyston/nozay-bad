import { creerRelais, type Ecran } from '../../../../lib/relais';
import { currentSeasonCode, sortSeasons } from '../../../../lib/seasons';

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
  members: { currentTotal: 0, previousTotal: 0, partiallyPaid: 0, unpaidCount: 0, renewed: 0, newcomers: 0, lapsed: null, ageCategories: [] },
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
    charger: async (lire, locals, params) => {
      const demandee = params.get('season') ?? '';
      const requete = demandee ? `?seasonId=${encodeURIComponent(demandee)}` : '';

      const [recap, saisons] = await Promise.all([
        lire(`/dashboard/overview${requete}`),
        lire('/accounting/seasons')
      ]);

      const data = recap ?? VIDE();
      const seasons: any[] = sortSeasons(saisons ?? []);
      return {
        data,
        seasons,
        /*
          La page est figée : aucune identité n'y est rendue. Les droits qui décident
          quelles lignes sont des liens voyagent donc avec les chiffres.
        */
        permissions: locals.user?.permissions ?? [],
        /*
          La saison affichée est celle demandée, sinon celle que l'agrégat a retenue —
          l'API du tableau de bord choisit déjà l'active. Quand elle a échoué, c'est le
          référentiel qui la nomme : le récapitulatif vide, lui, porte « 25-26 » en dur.
        */
        currentSeason: demandee || (recap ? data.season : currentSeasonCode(seasons)) || data.season
      };
    }
  }
};

export const { GET, POST } = creerRelais(ECRANS);
