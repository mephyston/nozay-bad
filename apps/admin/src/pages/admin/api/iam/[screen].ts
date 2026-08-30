import { can } from '../../../../lib/guard';
import { creerRelais, identifiant, type Ecran } from '../../../../lib/relais';

/**
 * Les écrans du domaine « accès et rôles ».
 *
 * La matrice des droits n'y figure pas : elle écrit déjà vers `/admin/api/roles`, une
 * route dédiée qui lui préexistait.
 */
export const ECRANS: Record<string, Ecran> = {
  acces: {
    permission: 'iam:users:read',
    charger: async (lire, locals) => {
      const [comptes, roles] = await Promise.all([
        lire('/iam/users'),
        // La matrice vient de l'API : les rôles sont modifiables, le code n'en porte plus
        // que la définition d'origine.
        lire('/iam/roles')
      ]);
      return {
        users: comptes ?? [],
        roles: roles ?? [],
        canEditRoles: can(locals, 'iam:roles:write'),
        errorMsg: comptes ? null : 'Erreur lors de la récupération des utilisateurs.'
      };
    },
    ecritures: {
      create_user: {
        permission: 'iam:users:write',
        route: (data) => ({
          chemin: '/iam/users',
          method: 'POST',
          body: { email: data.email, name: data.name, roles: data.roles }
        })
      },
      update_user: {
        permission: 'iam:users:write',
        route: (data) => ({
          chemin: `/iam/users/${identifiant(data.id, 'de compte')}`,
          method: 'PUT',
          body: { name: data.name, roles: data.roles }
        })
      },
      delete_user: {
        permission: 'iam:users:delete',
        route: (data) => ({
          chemin: `/iam/users/${identifiant(data.id, 'de compte')}`,
          method: 'DELETE'
        })
      }
    }
  }
};

export const { GET, POST } = creerRelais(ECRANS);
