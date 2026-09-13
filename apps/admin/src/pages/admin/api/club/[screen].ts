import { creerRelais, Refus, type Ecran } from '../../../../lib/relais';
import { oublierClub } from '../../../../lib/club';
import { CLUB_ASSETS, SETTINGS_SECTION_NAMES, isClubAsset } from '@nba/club-ui';
import { can } from '../../../../lib/guard';

/**
 * Les écrans de la configuration du club.
 *
 * Un écran de lecture unique, `settings`, que toutes les pages de la rubrique
 * demandent — l'identité tient en une ligne, la découper par section ferait huit
 * lectures pour la même chose. Les écritures, elles, sont une par section : chacune
 * n'accepte que ses champs, comme l'API.
 *
 * Les images ont chacune leur écran de dépôt (`asset-logo`, `asset-letterheadHeader`…) :
 * un dépôt n'a pas de nom d'action, seulement un chemin, et chaque image a le sien.
 *
 * Toute écriture oublie le club gardé en mémoire par le worker (`lib/club.ts`) : celui
 * qui vient de renommer le club voit le nouveau titre à la page suivante.
 */

/*
  L'origine du site public, qui sert les images : inlinée au build, comme dans
  `media-url.ts` (voir la note qui y explique la forme d'accès).
*/
const ORIGINE_MEDIAS = (import.meta.env.PUBLIC_WEBSITE_URL as string | undefined) ?? '';

const ecritures: NonNullable<Ecran['ecritures']> = {
  update_features: {
    permission: 'settings:club:write',
    route: (data) => {
      const features = data.features;
      if (!features || typeof features !== 'object' || Array.isArray(features)) throw new Refus('Fonctionnalités attendues.');
      return { chemin: '/club/features', method: 'PUT', body: features };
    }
  },
  remove_asset: {
    permission: 'settings:club:write',
    route: (data) => {
      if (!isClubAsset(data.asset)) throw new Refus('Image inconnue.');
      return { chemin: `/club/assets/${data.asset}`, method: 'DELETE' };
    }
  },
  set_partners: {
    permission: 'settings:club:write',
    route: (data) => {
      if (!Array.isArray(data.keys)) throw new Refus('Liste de clés attendue.');
      return { chemin: '/club/assets/partners', method: 'PUT', body: { keys: data.keys } };
    }
  }
};

// Une écriture par section : le corps est transmis tel quel, l'API le valide.
for (const section of SETTINGS_SECTION_NAMES) {
  ecritures[`update_${section}`] = {
    permission: 'settings:club:write',
    route: (data) => {
      const { action: _action, ...body } = data;
      return { chemin: `/club/settings/${section}`, method: 'PUT', body };
    }
  };
}

export const ECRANS: Record<string, Ecran> = {
  settings: {
    permission: 'settings:club:read',
    charger: async (lire, locals) => {
      const data = await lire('/club/settings');
      return {
        settings: data?.settings ?? null,
        features: data?.features ?? null,
        mediaOrigin: ORIGINE_MEDIAS,
        canWrite: can(locals, 'settings:club:write')
      };
    },
    ecritures,
    apres: oublierClub
  }
};

for (const asset of [...CLUB_ASSETS, 'partners'] as const) {
  ECRANS[`asset-${asset}`] = {
    permission: 'settings:club:write',
    charger: async () => ({}),
    depot: { permission: 'settings:club:write', chemin: `/club/assets/${asset}` },
    apres: oublierClub
  };
}

export const { GET, POST } = creerRelais(ECRANS);
