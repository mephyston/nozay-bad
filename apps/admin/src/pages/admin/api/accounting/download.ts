import type { APIRoute } from 'astro';
import type { Permission } from '@nba/iam-ui';
import { can } from '../../../../lib/guard';
import { createAdminApiClient } from '../../../../lib/api';

/**
 * Les téléchargements de la comptabilité : rapports en PDF, exports en ZIP.
 *
 * Route à part, et non un écran du relais, pour deux raisons.
 *
 * La première est technique : le relais rend du JSON, il reconstruit l'enveloppe qu'il
 * reçoit. Un PDF qui passerait par là en ressortirait corrompu. Ici le corps de la
 * réponse est **relayé tel quel**, sans jamais être lu.
 *
 * La seconde décide de la suite. Ces téléchargements vivaient sur les pages qui les
 * proposent, distingués de l'affichage par un paramètre d'URL — si bien que ces pages
 * devaient rester dynamiques pour porter le flux, et ne pourraient jamais être figées.
 * En les sortant, les écrans redeviennent de simples coquilles.
 *
 * Le navigateur ne peut pas s'adresser à l'API directement : elle exige
 * `INTERNAL_API_KEY`, que seuls les workers détiennent. Le passage par ici n'est donc pas
 * une commodité, c'est la seule voie — et c'est aussi ce qui permet d'y poser une garde.
 */

interface Document {
  permission: Permission;
  /** Chemin d'API, construit à partir de la saison et d'une éventuelle variante. */
  chemin: (saison: string, variante: string) => string;
  type: string;
  /** Nom proposé au téléchargement, si l'API n'en impose pas un. */
  nom: (saison: string, variante: string) => string;
}

export const DOCUMENTS: Record<string, Document> = {
  'income-statement': {
    permission: 'accounting:reports:read',
    chemin: (saison) => `/accounting/seasons/${saison}/reports/pdf?type=income-statement`,
    type: 'application/pdf',
    nom: (saison) => `rapport-compte-de-resultat-${saison}.pdf`
  },
  analytics: {
    permission: 'accounting:reports:read',
    chemin: (saison) => `/accounting/seasons/${saison}/reports/pdf?type=analytics`,
    type: 'application/pdf',
    nom: (saison) => `rapport-analytique-${saison}.pdf`
  },
  'cash-flow': {
    permission: 'accounting:reports:read',
    chemin: (saison) => `/accounting/seasons/${saison}/reports/pdf?type=cash-flow`,
    type: 'application/pdf',
    nom: (saison) => `rapport-tresorerie-${saison}.pdf`
  },
  /*
    L'export de la saison. La variante `all` est le défaut historique : le lien de la page
    des rapports envoyait `export=true`, que la page traduisait en `all`.
  */
  export: {
    permission: 'accounting:reports:read',
    chemin: (saison, variante) =>
      `/accounting/seasons/${saison}/export?type=${encodeURIComponent(variante || 'all')}`,
    type: 'application/zip',
    nom: (saison) => `export-compta-${saison}.zip`
  }
};

/** Saison telle qu'elle rejoindra un chemin d'API : jamais autre chose qu'un code. */
const SAISON_VALIDE = /^[A-Za-z0-9-]{1,16}$/;

export const GET: APIRoute = async ({ request, locals }) => {
  const params = new URL(request.url).searchParams;
  const document = DOCUMENTS[params.get('doc') ?? ''];
  if (!document) return new Response('Document inconnu', { status: 404 });
  if (!can(locals, document.permission)) return new Response('Accès refusé', { status: 403 });

  const saison = params.get('season') ?? '';
  if (!SAISON_VALIDE.test(saison)) return new Response('Saison invalide', { status: 400 });

  const variante = params.get('type') ?? '';
  if (variante && !SAISON_VALIDE.test(variante)) {
    return new Response('Variante invalide', { status: 400 });
  }

  const api = createAdminApiClient(locals);
  const res = await api.fetch(`http://localhost${document.chemin(saison, variante)}`);
  if (!res.ok) {
    return new Response(`Génération impossible (erreur ${res.status}).`, { status: res.status });
  }

  // Le corps passe sans être lu : c'est ce qui distingue cette route du relais.
  return new Response(res.body, {
    headers: {
      'Content-Type': res.headers.get('Content-Type') ?? document.type,
      'Content-Disposition':
        res.headers.get('Content-Disposition') ??
        `attachment; filename="${document.nom(saison, variante)}"`
    }
  });
};
