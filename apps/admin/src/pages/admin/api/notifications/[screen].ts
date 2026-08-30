import { can } from '../../../../lib/guard';
import { creerRelais, type Ecran } from '../../../../lib/relais';

/**
 * L'écran des notifications.
 *
 * Aucune écriture déclarée : l'envoi passe déjà par `/admin/api/notifications`, une route
 * dédiée qui préexistait à ce relais.
 */
export const ECRANS: Record<string, Ecran> = {
  overview: {
    permission: 'notifications:messages:read',
    charger: async (lire, locals) => {
      const [etat, audiences, programmes] = await Promise.all([
        lire.detail('/notifications/overview'),
        // Les groupes ne sont qu'un confort de ciblage : leur absence ne doit pas empêcher
        // d'envoyer une annonce à tous.
        lire('/notifications/audiences'),
        // Le registre est un confort de consultation : son absence n'empêche rien.
        lire('/notifications/scheduled')
      ]);

      return {
        // Des compteurs à zéro plutôt qu'absents : un écran muet laisse croire qu'il n'y
        // a rien à voir, alors que la lecture a simplement échoué.
        stats: etat.data?.stats ?? { devices: 0, accounts: 0, pending: 0 },
        messages: etat.data?.messages ?? [],
        groups: audiences?.groups ?? [],
        scheduled: programmes ?? [],
        canSend: can(locals, 'notifications:messages:send'),
        errorMsg: etat.ok ? null : "Impossible de charger l'état des notifications."
      };
    }
  }
};

export const { GET, POST } = creerRelais(ECRANS);
