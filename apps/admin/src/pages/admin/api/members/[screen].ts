import { can } from '../../../../lib/guard';
import { createAdminApiClient } from '../../../../lib/api';
import { fetchSeasons, currentSeasonCode, sortSeasons } from '../../../../lib/seasons';
import { isClubFunction } from '@nba/members/club-functions';
import { creerRelais, Refus, type Ecran } from '../../../../lib/relais';

/**
 * Les écrans du domaine « adhérents ».
 *
 * Cette rubrique écrivait **déjà** vers des routes dédiées — `/admin/api/members` et
 * `/admin/api/member-functions` — et non vers ses pages. Il n'y avait donc que les
 * lectures à déplacer, et ce relais ne déclare aucune écriture : elles restent là où
 * elles étaient, déjà gardées.
 *
 * L'import Poona n'y figure pas non plus. C'est un envoi de formulaire natif, qui
 * recharge la page pour afficher son compte rendu, et la page ne porte aucune donnée
 * d'écran. La convertir demanderait de réécrire un composant qui fonctionne, pour un
 * gain nul : elle reste telle quelle, et figure à ce titre dans `PAGES_AVEC_ECRITURE`.
 */

export const ECRANS: Record<string, Ecran> = {
  /**
   * La configuration de l'attestation CSE.
   *
   * Rangée sous « Configuration » dans le menu, gardée par `members:attestations:*` :
   * c'est la permission qui décide du domaine.
   *
   * Seules ses **écritures** passent par ici. La page continue de rendre son formulaire
   * côté serveur : elle ne fait qu'une lecture, et deux cents lignes de balisage n'y
   * gagneraient qu'à changer de fichier. Ce qu'on gagne, c'est que ses deux gardes se
   * lisent au même endroit que les autres.
   */
  attestation: {
    permission: 'members:attestations:read',
    charger: async (lire) => ({
      config: (await lire('/members/attestation/config')) ?? null
    }),
    ecritures: {
      update_info: {
        permission: 'members:attestations:write',
        route: (data) => ({
          chemin: '/members/attestation/config',
          method: 'PUT',
          body: {
            signatoryName: data.signatoryName,
            signatoryEmail: data.signatoryEmail,
            websiteUrl: data.websiteUrl
          }
        })
      },
      /*
        La signature est une image, transmise en base64 dans le corps JSON — et non en
        multipart : elle est stockée telle quelle, comme les justificatifs de notes de
        frais. Elle n'a donc pas sa place sur une route de dépôt.
      */
      upload_signature: {
        permission: 'members:attestations:write',
        route: (data) => ({
          chemin: '/members/attestation/signature',
          method: 'POST',
          body: { signature: data.signature }
        })
      }
    }
  },

  list: {
    permission: 'members:members:read',
    charger: async (lire, locals, params) => {
      /*
        Les filtres voyagent tels quels. `season` n'est pas facultatif : `/members` rend
        des ADHÉSIONS, une ligne par licence ET par saison (ADR-0006) — sans lui, un
        adhérent de trois ans reviendrait trois fois.

        Le référentiel part donc le premier : la liste s'ouvrait sur « 25-26 » codé en
        dur, et non sur l'active de la configuration. `/members` en dépend, il attend.
      */
      const seasons: any[] = sortSeasons((await lire('/accounting/seasons')) ?? []);
      const season = params.get('season') || currentSeasonCode(seasons) || '25-26';

      const requete = new URLSearchParams({
        page: params.get('page') || '1',
        limit: '20',
        search: params.get('search') || '',
        gender: params.get('gender') || '',
        type: params.get('type') || '',
        status: params.get('status') || '',
        season
      });

      const adherents = await lire.detail(`/members?${requete}`);

      const courante = seasons.find((s: any) => s.code === season || String(s.id) === season);

      return {
        members: adherents.data ?? [],
        // La pagination vit à côté de `data` dans l'enveloppe.
        pagination: adherents.enveloppe?.pagination ?? {
          total: 0,
          page: 1,
          limit: 20,
          totalPages: 1
        },
        seasons,
        season,
        seasonName: courante?.name ? String(courante.name).replace('Saison ', '') : season,
        // Le bouton d'export ne s'affiche qu'à qui peut s'en servir : la route, elle, garde.
        canExport: can(locals, 'members:members:export'),
        filters: {
          search: requete.get('search'),
          gender: requete.get('gender'),
          type: requete.get('type'),
          status: requete.get('status'),
          season
        },
        errorMsg: adherents.ok ? null : 'Impossible de récupérer la liste des adhérents.'
      };
    }
  },

  dirigeants: {
    permission: 'members:members:read',
    charger: async (lire, locals, params) => {
      // La saison par défaut est l'active de la configuration, comme partout ailleurs.
      const { seasons, errorMsg } = await fetchSeasons(createAdminApiClient(locals));
      const season = params.get('season') || currentSeasonCode(seasons) || '25-26';
      const s = encodeURIComponent(season);

      const [fonctions, adherents] = await Promise.all([
        lire.detail(`/members/club-functions?season=${s}`),
        lire(`/members?season=${s}&limit=5000`)
      ]);

      return {
        assignments: fonctions.data ?? [],
        // L'annuaire n'est là que pour nommer les licences : trois champs suffisent.
        members: ((adherents as any)?.data ?? adherents ?? []).map((m: any) => ({
          licence: String(m.licence),
          firstName: m.firstName,
          lastName: m.lastName
        })),
        seasons,
        season,
        canWrite: can(locals, 'members:members:write'),
        errorMsg: fonctions.ok ? errorMsg : 'Impossible de récupérer les fonctions au club.'
      };
    }
  },

  fiche: {
    permission: 'members:members:read',
    charger: async (lire, locals, params) => {
      /*
        La licence rejoint un chemin d'API : elle est contrôlée avant, comme tout
        identifiant. Huit chiffres, éventuellement complétés à gauche — c'est la forme que
        la fédération émet, et celle que la base stocke.
      */
      const licence = params.get('licence') ?? '';
      if (!/^\d{1,8}$/.test(licence)) throw new Refus('Numéro de licence invalide.');

      const season = params.get('season') || '25-26';
      const s = encodeURIComponent(season);

      const fiche = await lire.detail(`/members/${licence}?season=${s}`);
      if (!fiche.ok) {
        return {
          member: null,
          transactions: [],
          clubFunctions: [],
          season,
          canWrite: can(locals, 'members:members:write'),
          errorMsg:
            fiche.status === 404
              ? `Adhérent avec la licence ${licence} introuvable.`
              : 'Erreur de communication avec le service API.'
        };
      }

      const member = fiche.data;
      // Transactions et fonctions au club en parallèle ; leurs échecs n'empêchent pas la
      // fiche de s'afficher.
      const [mouvements, fonctions] = await Promise.all([
        lire(`/accounting/transactions?season=${s}&memberId=${member.id}&limit=100`),
        lire(`/members/club-functions?season=${s}`)
      ]);

      return {
        member,
        transactions: mouvements ?? [],
        /*
          La colonne est contrainte en base ; la garde du domaine le redit ici, pour que le
          composant reçoive bien la liste fermée qu'il attend.
        */
        clubFunctions: (fonctions ?? [])
          .filter((row: any) => row.licence === member.licence)
          .map((row: any) => row.function)
          .filter(isClubFunction),
        season,
        canWrite: can(locals, 'members:members:write'),
        errorMsg: null
      };
    }
  }
};

export const { GET, POST } = creerRelais(ECRANS);
