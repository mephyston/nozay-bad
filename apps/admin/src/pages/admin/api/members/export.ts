import type { APIRoute } from 'astro';
import { MEMBERSHIP_STATUSES } from '@nba/members/membership-status';
import { can } from '../../../../lib/guard';
import { createAdminApiClient } from '../../../../lib/api';

/**
 * Le fichier des adresses mail des adhérents, aux filtres de la liste.
 *
 * Route à part, et non un écran du relais, pour la raison qui vaut aux téléchargements
 * comptables la leur (`accounting/download.ts`) : le relais reconstruit du JSON, et
 * le corps doit ici passer tel quel. Elle porte sa propre garde : `/admin/api/**` est
 * hors des permissions de page, c'est ici ou nulle part.
 *
 * Les critères sont contrôlés un à un avant de rejoindre l'API : ils y voyagent en
 * paramètres d'URL, jamais dans le chemin, mais une liste d'adresses ne se demande
 * qu'avec les mots que l'écran connaît.
 */

const SAISON_VALIDE = /^[A-Za-z0-9-]{1,16}$/;
const GENRES = ['', 'M', 'F'];
const TYPES = ['', 'Competiteur', 'Loisir'];
const STATUTS: readonly string[] = ['', ...MEMBERSHIP_STATUSES];
const RECHERCHE_MAX = 100;

export const GET: APIRoute = async ({ request, locals }) => {
  if (!can(locals, 'members:members:export')) return new Response('Accès refusé', { status: 403 });

  const params = new URL(request.url).searchParams;
  const saison = params.get('season') ?? '';
  // Sans saison, `/members` rend une adhésion par saison : un adhérent de trois ans
  // reviendrait trois fois.
  if (!SAISON_VALIDE.test(saison)) return new Response('Saison invalide', { status: 400 });

  const genre = params.get('gender') ?? '';
  const type = params.get('type') ?? '';
  const statut = params.get('status') ?? '';
  if (!GENRES.includes(genre) || !TYPES.includes(type) || !STATUTS.includes(statut)) {
    return new Response('Filtre invalide', { status: 400 });
  }
  const recherche = (params.get('search') ?? '').slice(0, RECHERCHE_MAX);

  const requete = new URLSearchParams({ season: saison, gender: genre, type, status: statut, search: recherche });
  const api = createAdminApiClient(locals);
  const res = await api.fetch(`http://localhost/members/export?${requete}`);
  if (!res.ok) {
    return new Response(`Export impossible (erreur ${res.status}).`, { status: res.status });
  }

  // Le corps passe sans être lu : c'est ce qui distingue cette route du relais.
  return new Response(res.body, {
    headers: {
      'Content-Type': res.headers.get('Content-Type') ?? 'text/csv; charset=utf-8',
      'Content-Disposition':
        res.headers.get('Content-Disposition') ?? `attachment; filename="adherents-emails-${saison}.csv"`
    }
  });
};
