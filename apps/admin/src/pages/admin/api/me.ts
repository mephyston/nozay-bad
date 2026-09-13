import type { APIRoute } from 'astro';
import { clubAssetPath } from '@nba/club-ui';

/** L'origine du site public, qui sert les images du club ; inlinée au build comme dans les relais. */
const ORIGINE_MEDIAS = (import.meta.env.PUBLIC_WEBSITE_URL as string | undefined) ?? '';

/**
 * L'identité de la personne connectée, telle que l'habillage en a besoin.
 *
 * `AdminLayout` recevait ces quatre valeurs **du serveur**, en props : c'est ce qui filtre
 * les entrées du menu et lève le bandeau d'usurpation. Une page figée n'a pas de serveur
 * pour les lui donner — cette route est donc le préalable au `prerender`.
 *
 * Aucune permission n'est exigée : elle ne rend que ce que le middleware a déjà résolu
 * pour l'appelant, à partir de son propre jeton Cloudflare Access. Elle ne dit rien de
 * personne d'autre, et exiger un droit pour lire sa propre identité empêcherait un compte
 * sans aucun droit de voir ne serait-ce que son nom.
 */
export const GET: APIRoute = ({ locals }) => {
  const user = locals.user;
  const realUser = locals.realUser;

  return new Response(
    JSON.stringify({
      success: true,
      data: {
        email: user?.email ?? '',
        name: user?.name ?? null,
        permissions: user?.permissions ?? [],
        /*
          Le compte réellement connecté, qui diffère de `email` pendant une usurpation.
          C'est la comparaison des deux qui lève le bandeau — et elle ne doit se faire que
          sur deux identités réellement distinctes, faute de quoi le bandeau s'affiche à
          des comptes qui n'ont emprunté personne.
        */
        realEmail: realUser?.email ?? '',
        /*
          Le club, pour la même raison que l'identité : une page figée n'a pas de
          serveur pour lui dire comment elle s'appelle ni ce que le club a éteint.
          Le strict nécessaire à l'habillage — le reste se lit par le relais de
          configuration, gardé par son droit.
        */
        club: {
          name: locals.club?.settings.name ?? '',
          shortName: locals.club?.settings.shortName ?? '',
          brandColor: locals.club?.settings.brandColor ?? '',
          // Le logo déposé par le club ; à défaut, le menu garde l'image embarquée.
          logoUrl: locals.club?.settings.logoKey ? `${ORIGINE_MEDIAS}${clubAssetPath(locals.club.settings.logoKey)}` : '',
          features: locals.club?.features ?? {},
          menuAccounts: locals.club?.menuAccounts ?? []
        }
      }
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        // Jamais mise en cache par un intermédiaire : c'est une donnée par personne.
        'Cache-Control': 'private, no-store'
      }
    }
  );
};
