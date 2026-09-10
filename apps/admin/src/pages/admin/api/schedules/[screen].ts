import { can } from '../../../../lib/guard';
import { fetchSeasons, currentSeasonCode } from '../../../../lib/seasons';
import { createAdminApiClient } from '../../../../lib/api';
import { creerRelais, identifiant, type Ecran } from '../../../../lib/relais';

/**
 * Les écrans du domaine « séances », et ce que chacun expose.
 *
 * Groupé par **domaine** et non par rubrique de menu : les créneaux, le jeu libre et les
 * ouvreurs vivent sous « Site web » dans la barre latérale, mais ils ne relèvent pas du
 * CMS — tenir des séances et publier des pages sont deux métiers, avec deux jeux de
 * permissions. Les mêler aurait fait d'une réorganisation du menu une réécriture de
 * relais.
 *
 * La mécanique vit dans `lib/relais.ts` ; ce fichier ne déclare que la table, qui est
 * **la** surface d'audit du domaine.
 */

/*
  Le drapeau `OPEN_PLAY_ENABLED` ne vit plus côté administration.

  C'est l'API qui le porte, et c'est le bon endroit : elle répond 404 quand il est baissé,
  et le relais traduit ce code en message — « désactivées sur cet environnement ». Le
  redoubler ici donnait deux verrous à tenir en accord pour une seule décision, et le
  second se serait périmé au premier oubli.

  L'espace adhérent, lui, garde le sien : il annonce une fonctionnalité à des adhérents,
  là où l'administration ne fait que la tenir.
*/

/** Champs qu'une mise à jour partielle peut porter ; les absents ne changent rien. */
const presents = <T extends string>(data: any, cles: readonly T[]) =>
  Object.fromEntries(cles.filter((cle) => data[cle] !== undefined).map((cle) => [cle, data[cle]]));

export const ECRANS: Record<string, Ecran> = {
  schedules: {
    permission: 'schedules:slots:read',
    charger: async (lire, locals) => {
      const [slots, venues] = await Promise.all([lire('/schedules'), lire('/schedules/venues')]);
      return {
        slots: slots ?? [],
        venues: venues ?? [],
        canWrite: can(locals, 'schedules:slots:write')
      };
    },
    ecritures: {
      create: {
        permission: 'schedules:slots:write',
        route: (data) => ({ chemin: '/schedules', method: 'POST', body: data })
      },
      // Seules les clés présentes sont transmises : le même point d'entrée sert au
      // masquage depuis la liste (`active` seul) et à l'édition complète du créneau,
      // et le validateur traite un champ absent comme « ne rien changer ».
      update: {
        permission: 'schedules:slots:write',
        route: (data) => ({
          chemin: `/schedules/${identifiant(data.id, 'de créneau')}`,
          method: 'PUT',
          body: presents(data, [
            'venueId', 'audience', 'weekday', 'startTime', 'endTime', 'label', 'active', 'indiv'
          ] as const)
        })
      },
      delete: {
        permission: 'schedules:slots:write',
        route: (data) => ({
          chemin: `/schedules/${identifiant(data.id, 'de créneau')}`,
          method: 'DELETE'
        })
      }
    }
  },

  'jeu-libre': {
    permission: 'schedules:open-play:read',
    charger: async (lire, locals) => {
      /*
        `from` très bas : l'administration voit aussi l'historique, contrairement à
        l'espace adhérent, qui ne lit que ce qui vient.
      */
      const [seances, venues, slots] = await Promise.all([
        lire.detail('/schedules/open-play?from=2000-01-01&limit=300'),
        lire('/schedules/venues'),
        lire('/schedules')
      ]);

      /*
        Le code de retour devient un message : « impossible de charger » ne distingue pas
        une API éteinte d'un droit manquant ou d'une fonctionnalité désactivée, et fait
        perdre un aller-retour de diagnostic à chaque fois.
      */
      const errorMsg = seances.ok
        ? null
        : seances.status === 404
          ? 'Les séances de jeu libre sont désactivées sur cet environnement (OPEN_PLAY_ENABLED).'
          : seances.status === 403
            ? "Votre compte n'a pas le droit de consulter les séances de jeu libre."
            : `Impossible de charger les séances (erreur ${seances.status}).`;

      return {
        sessions: seances.data?.sessions ?? [],
        venues: venues ?? [],
        // Seuls les créneaux de jeu libre peuvent être déroulés en séances.
        slots: (slots ?? []).filter((slot: any) => slot.audience === 'jeu_libre'),
        errorMsg,
        canWrite: can(locals, 'schedules:open-play:write'),
        canReadRegistrations: can(locals, 'schedules:registrations:read')
      };
    },
    ecritures: {
      create: {
        permission: 'schedules:open-play:write',
        route: (data) => ({
          chemin: '/schedules/open-play',
          method: 'POST',
          body: {
            venueId: data.venueId,
            date: data.date,
            startTime: data.startTime,
            endTime: data.endTime,
            minPlayers: data.minPlayers,
            label: data.label ?? undefined,
            notes: data.notes ?? undefined
          }
        })
      },
      generate: {
        permission: 'schedules:open-play:write',
        route: (data) => ({
          chemin: '/schedules/open-play/generate',
          method: 'POST',
          body: {
            from: data.from,
            to: data.to,
            slotIds: data.slotIds,
            minPlayers: data.minPlayers
          }
        })
      },
      update: {
        permission: 'schedules:open-play:write',
        route: (data) => ({
          chemin: `/schedules/open-play/${identifiant(data.id, 'de séance')}`,
          method: 'PUT',
          body: presents(data, [
            'venueId', 'date', 'startTime', 'endTime', 'minPlayers',
            'label', 'notes', 'status', 'cancelledReason',
            'openerLicence', 'openerFirstName', 'openerLastName'
          ] as const)
        })
      },
      /*
        Lire les inscrits est un droit distinct de la tenue des séances : la séance est
        une information de club, la liste de ses inscrits — et de leurs invités non
        licenciés — une donnée personnelle. Lecture à la demande : elle ne descend pas
        avec l'écran, seulement quand le bureau ouvre le panneau d'une séance précise.
      */
      registrations: {
        permission: 'schedules:registrations:read',
        route: (data) => ({
          chemin: `/schedules/open-play/${identifiant(data.id, 'de séance')}/registrations`,
          method: 'GET'
        })
      }
    }
  },

  /*
    Séances individuelles : les soirées, telles que l'entraîneur les tient. Historique
    compris, comme le jeu libre. Le 404 du drapeau devient un message.
  */
  indiv: {
    permission: 'schedules:indiv:read',
    charger: async (lire, locals) => {
      const [soirees, venues, slots] = await Promise.all([
        lire.detail('/schedules/indiv?from=2000-01-01&limit=300'),
        lire('/schedules/venues'),
        lire('/schedules')
      ]);
      const errorMsg = soirees.ok
        ? null
        : soirees.status === 404
          ? 'Les séances individuelles sont désactivées sur cet environnement (INDIV_ENABLED).'
          : soirees.status === 403
            ? "Votre compte n'a pas le droit de consulter les séances individuelles."
            : `Impossible de charger les soirées (erreur ${soirees.status}).`;
      return {
        sessions: soirees.data?.sessions ?? [],
        venues: venues ?? [],
        // Seuls les créneaux marqués « séances individuelles » dans la grille se déroulent
        // en soirées : le public compétiteurs ne suffit pas, deux de ses quatre créneaux
        // seulement en portent.
        slots: (slots ?? []).filter((slot: any) => slot.indiv === true),
        errorMsg,
        canWrite: can(locals, 'schedules:indiv:write')
      };
    },
    ecritures: {
      create: {
        permission: 'schedules:indiv:write',
        route: (data) => ({
          chemin: '/schedules/indiv',
          method: 'POST',
          body: presents(data, ['venueId', 'date', 'startTime', 'slotCount', 'slotMinutes', 'capacityPerSlot', 'label', 'notes'] as const)
        })
      },
      generate: {
        permission: 'schedules:indiv:write',
        route: (data) => ({
          chemin: '/schedules/indiv/generate',
          method: 'POST',
          body: presents(data, ['from', 'to', 'slotIds', 'startTime', 'slotCount', 'slotMinutes', 'capacityPerSlot'] as const)
        })
      },
      update: {
        permission: 'schedules:indiv:write',
        route: (data) => ({
          chemin: `/schedules/indiv/${identifiant(data.id, 'de soirée')}`,
          method: 'PUT',
          body: presents(data, ['venueId', 'date', 'startTime', 'slotCount', 'slotMinutes', 'capacityPerSlot', 'label', 'notes', 'status', 'cancelledReason'] as const)
        })
      }
    }
  },

  /*
    Les candidats d'une soirée, enrichis de ce que le domaine ne sait pas : l'âge (fichier
    des adhérents) et le classement Poona (interclubs), joints par licence. Chaque
    jointure n'est faite que si le compte porte le droit correspondant — l'écran affiche
    alors « âge inconnu » plutôt que de refuser.
  */
  'indiv-candidats': {
    permission: 'schedules:indiv:read',
    charger: async (lire, locals, params) => {
      const id = Number(params.get('id'));
      const canWrite = can(locals, 'schedules:indiv:write');
      if (!Number.isSafeInteger(id) || id < 1) {
        return { session: null, candidates: [], errorMsg: 'Soirée inconnue.', canWrite };
      }
      const reponse = await lire.detail(`/schedules/indiv/${id}/candidates`);
      if (!reponse.ok) {
        return {
          session: null,
          candidates: [],
          canWrite,
          errorMsg:
            reponse.status === 404
              ? 'Soirée introuvable, ou séances individuelles désactivées sur cet environnement (INDIV_ENABLED).'
              : `Impossible de charger les candidats (erreur ${reponse.status}).`
        };
      }

      const { seasons } = await fetchSeasons(createAdminApiClient(locals));
      const seasonCode = currentSeasonCode(seasons);
      const [members, players] = await Promise.all([
        seasonCode && can(locals, 'members:members:read') ? lire(`/members?season=${encodeURIComponent(seasonCode)}&limit=1000`) : null,
        seasonCode && can(locals, 'teams:teams:read') ? lire(`/teams/players?seasonCode=${encodeURIComponent(seasonCode)}`) : null
      ]);

      const key = (licence: unknown) => String(licence ?? '').replace(/\D/g, '').padStart(8, '0');
      const memberList: any[] = Array.isArray(members) ? members : (members?.data ?? []);
      const birthDates = new Map(memberList.map((m: any) => [key(m.licence), m.birthDate ?? null]));
      const playerList: any[] = Array.isArray(players?.players) ? players.players : [];
      const rankings = new Map(playerList.map((p: any) => [key(p.licence), p]));

      return {
        session: reponse.data.session,
        candidates: (reponse.data.candidates ?? []).map((c: any) => {
          const player = rankings.get(key(c.licence));
          return {
            ...c,
            birthDate: birthDates.get(key(c.licence)) ?? null,
            category: player?.category ?? null,
            singles: player?.singles ?? null,
            doubles: player?.doubles ?? null,
            mixed: player?.mixed ?? null
          };
        }),
        errorMsg: null,
        canWrite
      };
    },
    ecritures: {
      select: {
        permission: 'schedules:indiv:write',
        route: (data) => ({
          chemin: `/schedules/indiv/${identifiant(data.id, 'de soirée')}/selection`,
          method: 'PUT',
          body: { selection: Array.isArray(data.selection) ? data.selection : [] }
        })
      },
      announce: {
        permission: 'schedules:indiv:write',
        route: (data) => ({
          chemin: `/schedules/indiv/${identifiant(data.id, 'de soirée')}/announce`,
          method: 'POST'
        })
      }
    }
  },

  ouvreurs: {
    permission: 'schedules:open-play:read',
    charger: async (lire, locals) => {
      /*
        La saison vient du référentiel, et non d'un créneau : les créneaux n'en portent
        plus depuis la migration `0025`, un créneau valant d'une année sur l'autre. Lire
        les saisons coûte un droit de plus, mais c'est la seule source qui dise vraiment
        quelle saison court — la précédente reposait sur la date de création d'un créneau,
        ce qui donnait « 25-26 » à un club qui jouait sa saison 26-27.
      */
      const { seasons, errorMsg: seasonsError } = await fetchSeasons(createAdminApiClient(locals));
      const seasonCode = currentSeasonCode(seasons);
      const commun = { seasonCode, canWrite: can(locals, 'schedules:open-play:write') };

      if (!seasonCode) {
        return {
          ...commun,
          openers: [],
          members: [],
          errorMsg:
            seasonsError ?? "Aucune saison n'est ouverte : la liste des ouvreurs se tient par saison."
        };
      }

      const reponse = await lire.detail(
        `/schedules/open-play/openers?season=${encodeURIComponent(seasonCode)}`
      );
      const errorMsg = reponse.ok
        ? null
        : reponse.status === 404
          ? 'Les séances de jeu libre sont désactivées sur cet environnement (OPEN_PLAY_ENABLED).'
          : `Impossible de charger les ouvreurs (erreur ${reponse.status}).`;

      /*
        `season` n'est pas facultatif : `/members` rend des ADHÉSIONS, une ligne par
        licence ET par saison (ADR-0006). Sans le filtre, un adhérent de trois ans revient
        trois fois avec la même licence — et une liste keyée dessus meurt à l'hydratation.

        L'annuaire n'est lu que si le compte en a le droit : `communication` tient les
        séances sans porter `members:members:read`, et un champ de recherche muet vaut
        moins qu'une saisie manuelle assumée.
      */
      const members = can(locals, 'members:members:read')
        ? ((await lire(`/members?season=${encodeURIComponent(seasonCode)}&limit=1000`)) ?? []).map(
            (m: any) => ({ licence: m.licence, firstName: m.firstName, lastName: m.lastName })
          )
        : [];

      const parLicence = new Map(members.map((m: any) => [m.licence, `${m.firstName} ${m.lastName}`]));
      return {
        ...commun,
        members,
        openers: (reponse.data ?? []).map((opener: any) => ({
          ...opener,
          name: parLicence.get(opener.licence) ?? null
        })),
        errorMsg
      };
    },
    ecritures: {
      addOpener: {
        permission: 'schedules:open-play:write',
        route: (data) => ({
          chemin: '/schedules/open-play/openers',
          method: 'POST',
          body: { seasonCode: data.seasonCode, licence: data.licence }
        })
      },
      removeOpener: {
        permission: 'schedules:open-play:write',
        route: (data) => ({
          chemin: `/schedules/open-play/openers/${identifiant(data.id, "d'ouvreur")}`,
          method: 'DELETE'
        })
      }
    }
  }
};

export const { GET, POST } = creerRelais(ECRANS);
