import type { APIRoute } from 'astro';
import type { Permission } from '@nba/iam-ui';
import { can } from './guard';
import { createAdminApiClient } from './api';

/**
 * La mécanique commune aux relais d'écrans.
 *
 * Un relais est le point d'entrée unique d'une **rubrique** vers l'API interne : le
 * navigateur y demande les données d'un écran et y adresse ses écritures, le worker
 * gardant pour lui `INTERNAL_API_KEY` et l'identité tirée du jeton Cloudflare Access.
 *
 * Ce fichier ne connaît aucune rubrique. Chacune déclare sa table d'écrans — ce qu'elle
 * expose, et quelle permission garde chaque lecture, chaque écriture et chaque dépôt —
 * puis appelle `creerRelais`. La table reste ainsi **la** surface d'audit de sa rubrique,
 * lisible d'un coup d'œil, pendant que les refus, la validation et le passe-plat de la
 * réponse ne s'écrivent qu'une fois.
 *
 * Les routes sous `/admin/api/` échappent à `PAGE_PERMISSIONS` (cf. `isPageRoute`) :
 * chaque écran répond donc de sa propre garde, et le test de chaque relais vérifie
 * qu'aucun n'en manque.
 */

export interface Lecteur {
  /** Le contenu de `data`, ou `null` si l'appel a échoué. La forme courante. */
  (chemin: string): Promise<any>;
  /**
   * La même lecture, code de retour compris.
   *
   * Pour les écrans qui en font un message : « impossible de charger » ne distingue pas
   * une API éteinte d'un droit manquant ou d'une fonctionnalité désactivée, et fait
   * perdre un aller-retour de diagnostic à chaque fois.
   */
  detail(chemin: string): Promise<{ ok: boolean; status: number; data: any }>;
}

/** Appel à faire à l'API interne pour honorer une écriture. */
export interface Appel {
  chemin: string;
  method: string;
  body?: unknown;
}

/**
 * Entrée du client jugée irrecevable.
 *
 * Distinct d'un refus de permission : l'utilisateur a le droit d'écrire, c'est la
 * requête qui est mal formée. Répondre 400, et non 403.
 */
export class Refus extends Error {}

/**
 * Identifiant d'objet reçu du client, validé avant de rejoindre un chemin d'API.
 *
 * Interpolé sans contrôle, il ferait de n'importe quelle écriture un chemin arbitraire.
 */
export function identifiant(valeur: unknown, quoi: string): number {
  const n = Number(valeur);
  if (!Number.isSafeInteger(n) || n < 1) throw new Refus(`Identifiant ${quoi} invalide.`);
  return n;
}

export interface Ecriture {
  permission: Permission;
  /** Construit l'appel API ; lève `Refus` pour rejeter une entrée mal formée. */
  route: (data: any) => Appel;
}

export interface Ecran {
  /** Droit exigé pour lire l'écran. */
  permission: Permission;
  /**
   * Écran soumis à un drapeau de fonctionnalité.
   *
   * Répond 404 quand il est baissé, comme la page : une fonctionnalité pas encore livrée
   * ne s'annonce pas. Sans cette garde ici, le relais servirait les données d'un écran
   * que la page refuse d'afficher.
   */
  disponible?: (locals: App.Locals) => boolean;
  charger: (
    lire: Lecteur,
    locals: App.Locals,
    /** Paramètres de la requête, pour les écrans qui portent sur un objet précis. */
    params: URLSearchParams
  ) => Promise<Record<string, unknown>>;
  /** Écritures acceptées, par nom d'action. Une action absente d'ici est refusée. */
  ecritures?: Record<string, Ecriture>;
  /** Dépôt de fichier, qui arrive en multipart et n'a donc pas de nom d'action. */
  depot?: { permission: Permission; chemin: string };
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

/**
 * La réponse de l'API est rendue telle quelle.
 *
 * Les composants lisent `data` en cas de succès et `error` en cas d'échec : c'est
 * l'enveloppe de l'API, et la réécrire ici obligerait à la maintenir en double.
 */
async function relayer(res: Response): Promise<Response> {
  if (!res.ok) {
    return new Response(await res.text(), {
      status: res.status,
      headers: { 'Content-Type': res.headers.get('Content-Type') ?? 'application/json' }
    });
  }
  return new Response(JSON.stringify(await res.json()), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/** Les deux gestionnaires d'une rubrique, à partir de sa table d'écrans. */
export function creerRelais(ECRANS: Record<string, Ecran>): { GET: APIRoute; POST: APIRoute } {
  const GET: APIRoute = async ({ params, request, locals }) => {
    const ecran = ECRANS[params.screen ?? ''];
    // Un écran inconnu n'existe pas : ni indice sur ce que le relais sert, ni chemin
    // détourné vers une lecture non déclarée.
    if (!ecran) return json({ success: false, error: 'Écran inconnu' }, 404);
    // Le drapeau se lit avant la permission : une fonctionnalité éteinte n'existe pas,
    // et répondre « accès refusé » laisserait entendre qu'elle est là.
    if (ecran.disponible && !ecran.disponible(locals)) {
      return json({ success: false, error: 'Écran inconnu' }, 404);
    }
    if (!can(locals, ecran.permission)) return json({ success: false, error: 'Accès refusé' }, 403);

    const api = createAdminApiClient(locals);
    const detail = async (chemin: string) => {
      const res = await api.fetch(`http://localhost${chemin}`);
      if (!res.ok) return { ok: false, status: res.status, data: null };
      return {
        ok: true,
        status: res.status,
        data: ((await res.json()) as { data?: unknown }).data ?? null
      };
    };
    const lire = Object.assign(
      async (chemin: string) => (await detail(chemin)).data,
      { detail }
    ) as Lecteur;

    try {
      const recherche = new URL(request.url).searchParams;
      return json({ success: true, data: await ecran.charger(lire, locals, recherche) });
    } catch (e) {
      // Un paramètre irrecevable est une faute du client, pas une panne de l'API.
      if (e instanceof Refus) return json({ success: false, error: e.message }, 400);
      return json(
        { success: false, error: `Appel API échoué : ${e instanceof Error ? e.message : String(e)}` },
        502
      );
    }
  };

  const POST: APIRoute = async ({ params, request, locals }) => {
    const ecran = ECRANS[params.screen ?? ''];
    if (!ecran) return json({ error: 'Écran inconnu' }, 404);
    if (ecran.disponible && !ecran.disponible(locals)) return json({ error: 'Écran inconnu' }, 404);

    const api = createAdminApiClient(locals);

    // Un dépôt de fichier arrive en multipart, là où toutes les autres écritures parlent
    // JSON — il n'a donc pas de nom d'action à garder, mais son propre droit.
    if ((request.headers.get('content-type') ?? '').includes('multipart/form-data')) {
      if (!ecran.depot) return json({ error: 'Cet écran ne reçoit pas de fichier.' }, 400);
      if (!can(locals, ecran.depot.permission)) return json({ error: 'Accès refusé' }, 403);
      return relayer(
        await api.fetch(`http://localhost${ecran.depot.chemin}`, {
          method: 'POST',
          body: await request.formData()
        })
      );
    }

    const data = (await request.json()) as any;
    const ecritures = ecran.ecritures ?? {};

    /*
     * `Object.hasOwn` et non `in` : `'constructor' in ecritures` est vrai par héritage, et
     * laisserait un nom d'action emprunté au prototype franchir cette vérification.
     */
    if (typeof data?.action !== 'string' || !Object.hasOwn(ecritures, data.action)) {
      return json({ error: 'Action inconnue' }, 403);
    }

    const ecriture = ecritures[data.action];
    if (!can(locals, ecriture.permission)) return json({ error: 'Accès refusé' }, 403);

    let appel: Appel;
    try {
      appel = ecriture.route(data);
    } catch (e) {
      if (e instanceof Refus) return json({ error: e.message }, 400);
      throw e;
    }

    return relayer(
      await api.fetch(`http://localhost${appel.chemin}`, {
        method: appel.method,
        headers: { 'Content-Type': 'application/json' },
        ...(appel.body ? { body: JSON.stringify(appel.body) } : {})
      })
    );
  };

  return { GET, POST };
}
