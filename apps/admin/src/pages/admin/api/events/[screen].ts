import { can } from '../../../../lib/guard';
import { creerRelais, identifiant, type Ecran } from '../../../../lib/relais';

/**
 * Les écrans du domaine « agenda ».
 *
 * Un seul pour l'instant, et c'est voulu : le relais suit le **domaine**, pas la rubrique
 * de menu. L'agenda est rangé sous « Site web » dans la barre latérale, mais il a ses
 * propres permissions et son propre modèle — le loger dans le relais du CMS aurait fait
 * d'une réorganisation du menu une réécriture de relais.
 *
 * La mécanique vit dans `lib/relais.ts` ; ce fichier ne déclare que la table.
 */

export const ECRANS: Record<string, Ecran> = {
  events: {
    feature: 'events',
    permission: 'events:events:read',
    charger: async (lire, locals) => ({
      // `past=1` : l'administration voit aussi l'historique, contrairement au site.
      events: (await lire('/events?past=1&limit=100')) ?? [],
      canWrite: can(locals, 'events:events:write'),
      canDelete: can(locals, 'events:events:delete'),
      canReadRegistrations: can(locals, 'events:registrations:read')
    }),
    ecritures: {
      create: {
        permission: 'events:events:write',
        route: (data) => ({
          chemin: '/events',
          method: 'POST',
          body: {
            title: data.title,
            startsAt: data.startsAt,
            endsAt: data.endsAt,
            category: data.category,
            venueLabel: data.venueLabel
          }
        })
      },
      // Seules les clés présentes sont transmises : le même point d'entrée sert au
      // changement de statut depuis la liste (`status` seul) et à l'édition complète de
      // la fiche, et le validateur traite un champ absent comme « ne rien changer ».
      update: {
        permission: 'events:events:write',
        route: (data) => ({
          chemin: `/events/${identifiant(data.id, "d'événement")}`,
          method: 'PUT',
          body: Object.fromEntries(
            (['title', 'startsAt', 'endsAt', 'category', 'venueLabel', 'status', 'registration'] as const)
              .filter((cle) => data[cle] !== undefined)
              .map((cle) => [cle, data[cle]])
          )
        })
      },
      delete: {
        permission: 'events:events:delete',
        route: (data) => ({
          chemin: `/events/${identifiant(data.id, "d'événement")}`,
          method: 'DELETE'
        })
      },
      /*
        Lire les inscrits est un droit distinct de la tenue de l'agenda : la fiche est
        publique, la liste de ses inscrits est une donnée personnelle d'adhérents.
        Lecture à la demande — elle ne descend pas avec l'écran, seulement quand le bureau
        ouvre le panneau d'un événement précis.
      */
      registrations: {
        permission: 'events:registrations:read',
        route: (data) => ({
          chemin: `/events/${identifiant(data.id, "d'événement")}/registrations`,
          method: 'GET'
        })
      }
    }
  }
};

export const { GET, POST } = creerRelais(ECRANS);
