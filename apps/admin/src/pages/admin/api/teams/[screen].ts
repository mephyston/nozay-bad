import { can } from '../../../../lib/guard';
import { createAdminApiClient } from '../../../../lib/api';
import { fetchSeasons, currentSeasonCode } from '../../../../lib/seasons';
import { CHAMPIONSHIPS, type Championship } from '@nba/teams/championship';
import { creerRelais, identifiant, Refus, type Ecran, type Lecteur } from '../../../../lib/relais';

/**
 * Les écrans du domaine « interclubs ».
 *
 * La mécanique vit dans `lib/relais.ts` ; ce fichier ne déclare que la table, qui est
 * **la** surface d'audit du domaine.
 *
 * Ce que cette rubrique ajoute par rapport aux précédentes : ses écrans **portent sur
 * une saison**, parfois sur un championnat et une journée. Ces valeurs viennent de
 * l'URL, et c'est le relais qui les résout — la saison demandée, ou celle qui court si
 * l'URL n'en fixe aucune. Il rend la valeur retenue avec les données : sans elle, le
 * sélecteur de saison afficherait « aucune » sur une page pourtant remplie.
 */

/** Saison de l'URL, ou celle qui court. Rend aussi la liste, que le sélecteur propose. */
async function saison(locals: App.Locals, params: URLSearchParams) {
  const { seasons, errorMsg } = await fetchSeasons(createAdminApiClient(locals));
  const demandee = params.get('season') ?? '';
  return { seasons, seasonCode: demandee || currentSeasonCode(seasons), errorMsg };
}

/**
 * Championnat de l'URL, validé contre la liste connue.
 *
 * Il partait sinon tel quel dans `/teams/days?championship=…`, et arrivait en `string`
 * là où le reste attend une valeur fermée — le contrôle de types l'a signalé, mais c'est
 * bien une entrée non filtrée qui traversait.
 */
function championnat(params: URLSearchParams): Championship {
  const demande = params.get('championship') ?? '';
  return (CHAMPIONSHIPS as readonly string[]).includes(demande)
    ? (demande as Championship)
    : 'icd_mixte';
}

/**
 * Une écriture sans saison est refusée, jamais rabattue sur une valeur par défaut.
 *
 * Créer une équipe en saison `''` la rend invisible dans la liste, et surtout la place
 * hors de la contrainte d'unicité `(saison, championnat, numéro)` qui porte la hiérarchie
 * du club. Le client connaît sa saison : on exige qu'il la donne.
 */
function exigeSaison(data: any): string {
  const code = data.seasonCode ?? '';
  if (!code) throw new Refus("Saison indéterminée : rechargez la page avant d'enregistrer.");
  return code;
}

/** Champs d'une mise à jour partielle : une clé absente laisse la valeur en place. */
const presents = <T extends string>(data: any, cles: readonly T[]) =>
  Object.fromEntries(cles.filter((cle) => data[cle] !== undefined).map((cle) => [cle, data[cle]]));

export const ECRANS: Record<string, Ecran> = {
  teams: {
    feature: 'teams',
    permission: 'teams:teams:read',
    charger: async (lire, locals, params) => {
      const { seasons, seasonCode, errorMsg } = await saison(locals, params);
      const daysChampionship = championnat(params);
      const commun = {
        seasons,
        seasonCode,
        daysChampionship,
        teamPrefix: locals.club?.settings.teamPrefix ?? '',
        canWrite: can(locals, 'teams:teams:write'),
        canDelete: can(locals, 'teams:teams:delete')
      };
      if (!seasonCode) return { ...commun, teams: [], members: [], days: [], errorMsg };

      const [equipes, adherents, journees] = await Promise.all([
        lire(`/teams?seasonCode=${encodeURIComponent(seasonCode)}`),
        lire(`/members?season=${encodeURIComponent(seasonCode)}&limit=5000`),
        lire(`/teams/days?seasonCode=${encodeURIComponent(seasonCode)}&championship=${daysChampionship}`)
      ]);

      return {
        ...commun,
        teams: equipes?.teams ?? [],
        /*
          `/members` rend des ADHÉSIONS, une ligne par licence ET par saison (ADR-0006) —
          d'où le filtre de saison, non facultatif. L'horodatage de la photo traverse le
          JSON en chaîne ISO ; converti ici en millisecondes, la forme qu'emploient la
          fiche et l'effectif pour la version d'URL du portrait.
        */
        members: (adherents?.data ?? adherents ?? []).map((m: any) => ({
          licence: String(m.licence).padStart(8, '0'),
          firstName: m.firstName,
          lastName: m.lastName,
          photoUpdatedAt: m.photoUpdatedAt ? Date.parse(m.photoUpdatedAt) : null
        })),
        days: journees?.days ?? [],
        errorMsg
      };
    },
    ecritures: {
      'save-team': {
        permission: 'teams:teams:write',
        route: (data) => ({
          chemin: '/teams',
          method: 'POST',
          body: {
            id: data.id,
            seasonCode: exigeSaison(data),
            championship: data.championship,
            division: data.division,
            number: data.number,
            poolLabel: data.poolLabel,
            active: data.active
          }
        })
      },
      'delete-team': {
        permission: 'teams:teams:delete',
        route: (data) => ({
          chemin: `/teams/${identifiant(data.teamId, "d'équipe")}`,
          method: 'DELETE'
        })
      },
      'save-team-staff': {
        permission: 'teams:teams:write',
        route: (data) => ({
          chemin: `/teams/${identifiant(data.teamId, "d'équipe")}/staff`,
          method: 'PUT',
          body: { captainLicence: data.captainLicence, viceCaptainLicence: data.viceCaptainLicence }
        })
      },
      'save-team-roster': {
        permission: 'teams:teams:write',
        route: (data) => ({
          chemin: `/teams/${identifiant(data.teamId, "d'équipe")}/roster`,
          method: 'PUT',
          body: { licences: data.licences }
        })
      },
      'save-championship-days': {
        permission: 'teams:teams:write',
        route: (data) => ({
          chemin: '/teams/days',
          method: 'PUT',
          body: { seasonCode: exigeSaison(data), championship: data.championship, days: data.days }
        })
      },
      /*
        Date, gymnase et adversaire d'une rencontre, côté bureau. Distinct de
        `save-fixture-date`, qu'emploie l'espace adhérent : celui-ci réserve l'écriture au
        capitaine et à son adjoint, alors qu'ici le droit vient de `teams:teams:write`.
      */
      'save-fixture': {
        permission: 'teams:teams:write',
        route: (data) => ({
          chemin: `/teams/${identifiant(data.teamId, "d'équipe")}/fixtures`,
          method: 'PUT',
          body: {
            dayId: data.dayId,
            slot: data.slot,
            playedAt: data.playedAt,
            venue: data.venue,
            opponent: data.opponent,
            home: data.home,
            status: data.status
          }
        })
      },
      'get-team': {
        permission: 'teams:teams:read',
        route: (data) => ({
          chemin: `/teams/${identifiant(data.teamId, "d'équipe")}`,
          method: 'GET'
        })
      },
      // La feuille des journées change de championnat sans navigation : elle recharge ici.
      'list-days': {
        permission: 'teams:teams:read',
        route: (data) => ({
          chemin: `/teams/days?seasonCode=${encodeURIComponent(exigeSaison(data))}&championship=${data.championship}`,
          method: 'GET'
        })
      }
    }
  },

  classements: {
    feature: 'teams',
    permission: 'teams:rankings:read',
    charger: async (lire, locals, params) => {
      const { seasons, seasonCode, errorMsg } = await saison(locals, params);
      const commun = {
        seasons,
        seasonCode,
        canWrite: can(locals, 'teams:rankings:write'),
        canImport: can(locals, 'teams:rankings:import')
      };
      const vide = { eloDate: null, availableDates: [], rows: [], unmatchedCount: 0 };
      if (!seasonCode) return { ...commun, rankings: vide, settings: [], errorMsg };

      const requete = new URLSearchParams({ seasonCode });
      const eloDate = params.get('eloDate') ?? '';
      if (eloDate) requete.set('eloDate', eloDate);

      const [classements, reglages] = await Promise.all([
        lire(`/teams/rankings?${requete}`),
        lire(`/teams/championship-settings?seasonCode=${encodeURIComponent(seasonCode)}`)
      ]);
      return { ...commun, rankings: classements ?? vide, settings: reglages?.items ?? [], errorMsg };
    },
    ecritures: {
      'save-championship-settings': {
        permission: 'teams:rankings:write',
        /*
          Seules les clés réellement envoyées sont relayées : le handler fait des mises à
          jour partielles, une clé absente laissant la valeur en place. Recopier
          `referenceEloDate: undefined` en dur relayait toujours la date et **jamais** le
          lien du règlement — l'écran semblait enregistrer sans que rien ne change.
        */
        route: (data) => ({
          chemin: '/teams/championship-settings',
          method: 'PUT',
          body: {
            seasonCode: exigeSaison(data),
            championship: data.championship,
            ...presents(data, ['referenceEloDate', 'rulesUrl', 'rulesLabel'] as const)
          }
        })
      },
      /*
        Corriger un classement ne dépend d'aucune saison : cela vise un instantané,
        identifié par sa date ELO.

        Seules les disciplines réellement envoyées sont relayées : le handler fait des
        mises à jour partielles, et une clé à `null` y signifie « non compétiteur » — la
        recopier en dur effacerait les deux autres disciplines.
      */
      'save-ranking': {
        permission: 'teams:rankings:write',
        route: (data) => {
          if (typeof data.licence !== 'string' || !data.licence) {
            throw new Refus('Licence manquante.');
          }
          return {
            chemin: `/teams/rankings/${encodeURIComponent(data.licence)}`,
            method: 'PUT',
            body: {
              eloDate: data.eloDate,
              ...presents(data, [
                'singles', 'doubles', 'mixed',
                'cpphSingles', 'cpphDoubles', 'cpphMixed'
              ] as const)
            }
          };
        }
      }
    }
  },

  journees: {
    feature: 'teams',
    permission: 'teams:lineups:read',
    charger: async (lire, locals, params) => {
      const { seasons, seasonCode, errorMsg } = await saison(locals, params);
      const championship = championnat(params);
      const demandee = Number(params.get('day') ?? '');
      let dayNumber = Number.isSafeInteger(demandee) && demandee > 0 ? demandee : 1;
      const commun = { seasons, seasonCode, championship };
      if (!seasonCode) return { ...commun, days: [], board: null, dayNumber, errorMsg };

      const journees = await lire(
        `/teams/days?seasonCode=${encodeURIComponent(seasonCode)}&championship=${championship}`
      );
      const days = journees?.days ?? [];

      // La journée demandée peut ne pas exister dans ce championnat : on retombe sur la
      // première plutôt que d'afficher un tableau vide sans expliquer pourquoi.
      if (days.length > 0 && !days.some((d: any) => d.number === dayNumber)) {
        dayNumber = days[0].number;
      }

      const board = days.length
        ? ((await lire(
            `/teams/day-values?seasonCode=${encodeURIComponent(seasonCode)}&championship=${championship}&day=${dayNumber}`
          )) ?? null)
        : null;

      return { ...commun, days, board, dayNumber, errorMsg };
    },
    ecritures: {
      'notify-captain': {
        permission: 'teams:lineups:write',
        route: (data) => ({
          chemin: `/teams/${identifiant(data.teamId, "d'équipe")}/days/${identifiant(data.dayNumber, 'de journée')}/notify-captain`,
          method: 'POST',
          body: { note: data.note ?? null }
        })
      }
    }
  },

  reglements: {
    feature: 'teams',
    permission: 'teams:rankings:read',
    charger: async (lire, locals, params) => {
      const { seasons, seasonCode, errorMsg } = await saison(locals, params);
      const commun = { seasons, seasonCode, canWrite: can(locals, 'teams:rankings:write') };
      if (!seasonCode) return { ...commun, settings: [], errorMsg };

      const reglages = await lire(
        `/teams/championship-settings?seasonCode=${encodeURIComponent(seasonCode)}`
      );
      return { ...commun, settings: reglages?.items ?? [], errorMsg };
    },
    ecritures: {
      /*
        Le même point d'entrée que sur l'écran des classements, mais **sans**
        `referenceEloDate` : cet écran ne touche pas à la date de référence, et la relayer
        en dur l'écraserait.
      */
      'save-championship-settings': {
        permission: 'teams:rankings:write',
        route: (data) => ({
          chemin: '/teams/championship-settings',
          method: 'PUT',
          body: {
            seasonCode: exigeSaison(data),
            championship: data.championship,
            ...presents(data, ['rulesUrl', 'rulesLabel'] as const)
          }
        })
      }
    }
  },

  import: {
    // L'écran n'existe que pour importer : le droit de lecture est celui de l'import.
    feature: 'teams',
    permission: 'teams:rankings:import',
    charger: async (_lire: Lecteur, locals, params) => {
      const { seasons, seasonCode, errorMsg } = await saison(locals, params);
      return { seasons, seasonCode, errorMsg, canImport: can(locals, 'teams:rankings:import') };
    },
    ecritures: {
      'import-rankings': {
        permission: 'teams:rankings:import',
        route: (data) => ({
          chemin: '/teams/rankings/import',
          method: 'POST',
          body: {
            content: data.content,
            seasonCode: exigeSaison(data),
            eloDate: data.eloDate,
            fileName: data.fileName
          }
        })
      }
    }
  }
};

export const { GET, POST } = creerRelais(ECRANS);
