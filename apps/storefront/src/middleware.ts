import { defineMiddleware } from 'astro:middleware';
import { createApiClient } from '@nba/api-client';
import {
  verifySession,
  readSessionCookie,
  resolveSessionSecret,
  signSession,
  buildSessionCookie,
  buildLogoutCookie,
  SESSION_TTL_SECONDS,
  SESSION_REFRESH_AFTER_SECONDS,
  type SessionPayload,
  type SessionMember
} from './lib/auth';
import { resolveEnv, IS_DEV, COOKIE_SECURE } from './lib/request-context';
import { loadClubContext, featureOn } from '@nba/club/context';
import type { Feature } from '@nba/club-ui';
import { applySecurityHeaders, withMutableHeaders } from './lib/security-headers';
import { listSeasons, isSeasonOpen, parisToday } from './lib/season';

// Chemins accessibles sans session : page de login, endpoints d'auth, et assets Astro (_astro/_image).
const PUBLIC_PREFIXES = ['/login', '/api/auth/', '/confidentialite', '/mentions-legales', '/manifest.webmanifest'];

/**
 * Pages publiques qui doivent tout de même reconnaître un visiteur connecté.
 *
 * Elles restent lisibles sans session — une politique de confidentialité doit
 * l'être — mais sans résoudre la session, `locals.session` reste vide et la barre
 * de navigation, conditionnée par elle, disparaît : on y arrivait depuis le menu et
 * on s'y retrouvait sans aucun moyen de revenir.
 */
const OPTIONAL_SESSION_PAGES = ['/confidentialite', '/mentions-legales'];
// Fichiers statiques servis depuis public/ (favicon, logo, robots, manifest, polices...).
// Volontairement SANS .pdf : /api/attestation.pdf doit rester protégé (voir exclusion /api/).
const STATIC_FILE = /\.(ico|png|jpe?g|svg|webp|gif|avif|txt|xml|webmanifest|json|woff2?|ttf|otf|eot|css|js|map|mp4|webm)$/i;

/**
 * Les pages qui n'existent que si le club utilise la fonctionnalité.
 *
 * Préfixes de chemin, segment complet. Une page éteinte répond introuvable, avant même la
 * session : elle n'a pas à s'annoncer. L'agenda reste, c'est un calendrier ; ce sont ses
 * encarts qui suivent chacun sa fonctionnalité.
 */
const FEATURE_PAGES: [string, Feature][] = [
  ['/boutique', 'shop'],
  ['/note-de-frais', 'expenses'],
  ['/indiv', 'indiv'],
  ['/jeu-libre', 'open_play'],
  ['/equipes', 'teams'],
  ['/notifications', 'push'],
  ['/attestation', 'attestations'],
  ['/api/attestation', 'attestations']
];

function featureOf(path: string): Feature | undefined {
  return FEATURE_PAGES.find(([prefix]) => path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}.`))?.[1];
}

/**
 * Renseigne `locals.session` si un cookie valide accompagne la requête, sans jamais
 * l'exiger. Une session absente, expirée ou invalide laisse simplement la page en
 * mode déconnecté : c'est une commodité de navigation, pas un contrôle d'accès.
 */
async function attachSessionIfAny(
  context: Parameters<Parameters<typeof defineMiddleware>[0]>[0]
): Promise<void> {
  try {
    const { request, locals } = context;
    const secret = resolveSessionSecret(resolveEnv(locals), IS_DEV);
    if (!secret) return;
    const token = readSessionCookie(request.headers.get('cookie'));
    if (!token) return;
    const session = await verifySession(token, secret);
    if (session) (locals as any).session = session;
  } catch {
    // Une page publique ne doit pas échouer parce que la session est illisible.
  }
}

/**
 * Revalide une session dont la saison est terminée.
 *
 * Sans ce contrôle, la fin d'adhésion ne coupe rien : le JWT reste signé et valable 30
 * jours, et un non-réinscrit continuerait de naviguer bien après le 1er septembre.
 *
 * Retourne la session régénérée si la licence a été renouvelée (l'adhérent à jour ne voit
 * donc rien passer), ou `null` s'il faut le renvoyer au login.
 */
async function revalidateSeason(env: any, session: SessionPayload): Promise<SessionPayload | null> {
  try {
    const res = await createApiClient(env).fetch('http://localhost/members/lookup-household', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: session.email })
    });
    if (!res.ok) return null;

    const data = ((await res.json()) as any)?.data;
    if (data?.status !== 'granted') return null;

    const members = (data.members || []) as SessionMember[];
    if (members.length === 0) return null;

    // Le profil actif peut avoir disparu (un enfant du foyer non réinscrit) : on retombe
    // alors sur le premier dossier valable plutôt que de laisser une session pointer dans
    // le vide.
    const activeMemberId = members.some((m) => m.id === session.activeMemberId)
      ? session.activeMemberId
      : members[0].id;

    return { email: session.email, members, activeMemberId, seasonCode: data.seasonCode || '' };
  } catch (err) {
    console.error('[auth] revalidation de saison impossible:', err);
    return null;
  }
}

const handleRequest = async (
  context: Parameters<Parameters<typeof defineMiddleware>[0]>[0],
  next: Parameters<Parameters<typeof defineMiddleware>[0]>[1]
): Promise<Response> => {
  const { request, locals } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  // Le manifeste PWA n'est pas un fichier : il se compose d'après le club.
  const isStatic = path.startsWith('/_') || (path !== '/manifest.webmanifest' && !path.startsWith('/api/') && STATIC_FILE.test(path));

  // Le club, pour toute page et tout point d'entrée : titre, pied de page, expéditeur
  // des mails, fonctionnalités éteintes. Pas pour les fichiers statiques.
  if (!isStatic) locals.club = await loadClubContext(resolveEnv(locals) as never, 'storefront');

  const feature = featureOf(path);
  if (feature && !featureOn(locals.club, feature)) {
    return new Response('Page introuvable', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }

  if (isStatic || PUBLIC_PREFIXES.some((p) => path === p || path.startsWith(p))) {
    if (OPTIONAL_SESSION_PAGES.some((p) => path === p || path.startsWith(p))) {
      await attachSessionIfAny(context);
    }
    return next();
  }

  const env = resolveEnv(locals);
  const secret = resolveSessionSecret(env, IS_DEV);

  // Fail-closed : un secret manquant en production est une erreur de configuration.
  if (!secret) {
    console.error('[auth] SESSION_SECRET non configuré');
    return new Response('Erreur de configuration serveur.', { status: 500 });
  }

  const token = readSessionCookie(request.headers.get('cookie'));
  let session = token ? await verifySession(token, secret) : null;

  // Cookie à reposer si la session a été régénérée pour la nouvelle saison.
  let refreshedCookie: string | null = null;
  // Session valide mais révoquée faute de licence : son cookie doit être purgé.
  let revoked = false;

  /*
   * Session glissante : prolongée dès qu'elle a dix jours.
   *
   * Une session fixe déconnecte le même jour tous ceux qui se sont connectés le même
   * jour — et fait redemander un code à tout le club en même temps, ce qu'un plafond
   * d'envoi quotidien ne laisse pas passer. Ici, seul un adhérent resté trente jours
   * sans venir doit se reconnecter, et ces retours-là se répartissent d'eux-mêmes.
   *
   * Il n'y a volontairement pas de durée de vie absolue au-delà de laquelle une
   * reconnexion serait imposée : elle recréerait exactement le pic qu'on évite, six mois
   * plus tard et pour tout le monde à la fois. Le contrôle qui compte reste celui de la
   * saison, juste en dessous — une licence non renouvelée révoque la session, quelle que
   * soit son ancienneté.
   */
  if (session?.expiresAt !== undefined) {
    const remaining = session.expiresAt - Math.floor(Date.now() / 1000);
    if (remaining < SESSION_TTL_SECONDS - SESSION_REFRESH_AFTER_SECONDS) {
      refreshedCookie = buildSessionCookie(await signSession(session, secret), COOKIE_SECURE);
    }
  }

  if (session) {
    const today = parisToday(new Date(), locals.club?.settings.timezone);
    const seasons = await listSeasons(env, today);
    // Liste vide = API injoignable. On ne coupe personne sur une panne : la licence sera
    // revérifiée à la requête suivante.
    if (seasons.length > 0 && !isSeasonOpen(seasons, session.seasonCode, today)) {
      const renewed = await revalidateSeason(env, session);
      if (renewed) {
        session = renewed;
        refreshedCookie = buildSessionCookie(await signSession(renewed, secret), COOKIE_SECURE);
      } else {
        session = null;
        revoked = true;
      }
    }
  }

  if (!session) {
    const response = path.startsWith('/api/')
      ? new Response(JSON.stringify({ ok: false, error: 'Non authentifié.' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        })
      : context.redirect(`/login?redirect=${encodeURIComponent(path + url.search)}`, 302);

    if (revoked) {
      const mutable = withMutableHeaders(response);
      mutable.headers.append('Set-Cookie', buildLogoutCookie(COOKIE_SECURE));
      return mutable;
    }
    return response;
  }

  (locals as any).session = session;

  const response = await next();
  if (refreshedCookie) {
    const mutable = withMutableHeaders(response);
    mutable.headers.append('Set-Cookie', refreshedCookie);
    return mutable;
  }
  return response;
};

// M-03 : toutes les réponses (pages, API, redirections, 401) reçoivent les en-têtes
// de sécurité.
export const onRequest = defineMiddleware(async (context, next) => {
  return applySecurityHeaders(await handleRequest(context, next));
});
