import { can } from '../../../../lib/guard';
import { creerRelais, identifiant, type Ecran, type Lecteur } from '../../../../lib/relais';

/**
 * Les écrans du domaine « notes de frais ».
 *
 * Le formulaire de dépôt de l'espace adhérent n'y figure pas : il vit dans le storefront
 * et écrit vers sa propre page.
 */

/** Saison de l'URL, ou l'active à défaut, puis la dernière. */
async function saison(lire: Lecteur, params: URLSearchParams) {
  const seasons: any[] = (await lire('/accounting/seasons')) ?? [];
  const demandee = params.get('season') ?? '';
  const active = seasons.find((s) => s.active === true || s.active === 1) ?? seasons[seasons.length - 1];
  const season = demandee || (active ? active.code || String(active.id) : '25-26');
  return { seasons, season, isClosed: Boolean(seasons.find((s) => s.id === season)?.closed) };
}

export const ECRANS: Record<string, Ecran> = {
  list: {
    permission: 'expenses:reports:read',
    charger: async (lire, locals, params) => {
      const saisonnier = await saison(lire, params);
      const s = encodeURIComponent(saisonnier.season);

      const [notes, categories, adherents] = await Promise.all([
        lire(`/expenses?season=${s}`),
        lire('/accounting/categories'),
        lire(`/members?limit=1000&season=${s}`)
      ]);

      return {
        ...saisonnier,
        /*
          L'écran parle de `amount` et `category` là où l'API rend `amountCents` et
          `categoryId`. La traduction vivait dans la page ; elle est reprise telle quelle,
          renommer des champs n'étant pas le sujet d'une conversion en coquille.
        */
        expenses: (notes ?? []).map((exp: any) => ({
          ...exp,
          amount: exp.amountCents,
          category: exp.categoryId
        })),
        categories: categories ?? [],
        members: adherents ?? [],
        canApprove: can(locals, 'expenses:reports:approve'),
        canWrite: can(locals, 'expenses:reports:write')
      };
    },
    ecritures: {
      /*
        Le dépôt d'une note. Le corps est celui que le formulaire compose — il porte
        `amount` en centimes, nom qu'exige le validateur depuis qu'il a cessé de tolérer
        `amountCents`.
      */
      expense: {
        permission: 'expenses:reports:write',
        route: (data) => ({ chemin: '/expenses', method: 'POST', body: data.data })
      },
      update: {
        permission: 'expenses:reports:write',
        route: (data) => ({
          chemin: `/expenses/${identifiant(data.id, 'de note de frais')}`,
          method: 'PUT',
          body: data.updates
        })
      },
      /*
        Approuver, refuser et annuler relèvent d'un droit distinct de la rédaction : ce
        n'est pas celui qui dépense qui valide.
      */
      ...Object.fromEntries(
        (['approve', 'reject', 'cancel'] as const).map((action) => [
          action,
          {
            permission: 'expenses:reports:approve' as const,
            route: (data: any) => ({
              chemin: `/expenses/${identifiant(data.id, 'de note de frais')}/${action}`,
              method: 'POST'
            })
          }
        ])
      )
    }
  }
};

export const { GET, POST } = creerRelais(ECRANS);
