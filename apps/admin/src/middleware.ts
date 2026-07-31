import { defineMiddleware } from 'astro:middleware';
import type { APIContext, MiddlewareNext } from 'astro';
import { jwtVerify, createRemoteJWKSet } from 'jose';
import { env as cfEnv } from 'cloudflare:workers';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { adminUsersTable } from '@nba/iam/schema';

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function getJWKS(teamDomain: string) {
  let jwks = jwksCache.get(teamDomain);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`${teamDomain}/cdn-cgi/access/certs`));
    jwksCache.set(teamDomain, jwks);
  }
  return jwks;
}

export const handleAuth = async (context: APIContext, next: MiddlewareNext) => {
  const request = context.request;

  if (import.meta.env.DEV) {
    // 💡 Astuce : Changez cet email pour tester vos autres comptes locaux !
    // Si l'email existe dans la base de données locale, le middleware récupérera ses vrais droits.
    const devEmail = 'admin@nozaybad.fr'; // ex: 'coach@nozaybad.fr'

    try {
      let runtimeEnv: Record<string, string> = {};
      try { runtimeEnv = (context.locals as any).runtime?.env || {}; } catch (err) {}
      const resolvedEnv = { ...cfEnv, ...runtimeEnv } as Record<string, string>;
      
      const db = drizzle(resolvedEnv.DB as any);
      const user = await db.select().from(adminUsersTable).where(eq(adminUsersTable.email, devEmail)).get();
      
      if (user) {
        context.locals.user = { email: user.email, permissions: user.permissions };
      } else {
        context.locals.user = { email: devEmail, permissions: ['*'] };
      }
    } catch (e) {
      context.locals.user = { email: devEmail, permissions: ['*'] };
    }
    return next();
  }

  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token) {
    return new Response('Non autorisé. Authentification Cloudflare Access requise.', { status: 401 });
  }

  // Resolve environment variables from cloudflare:workers or Astro runtime context
  let runtimeEnv: Record<string, string> = {};
  try {
    runtimeEnv = (context.locals as any).runtime?.env || {};
  } catch (err) {
    // Ignore. Astro.locals.runtime.env throws in Astro v6 production.
  }
  const resolvedEnv = { ...cfEnv, ...runtimeEnv } as Record<string, string>;

  const CF_TEAM_DOMAIN = resolvedEnv.CF_TEAM_DOMAIN;
  const CF_AUDIENCE = resolvedEnv.CF_AUDIENCE;

  // Fail fast: never use a fallback audience in production — an absent audience would
  // accept any valid Cloudflare Access JWT from any application.
  if (!CF_TEAM_DOMAIN || !CF_AUDIENCE) {
    console.error('[auth] CF_TEAM_DOMAIN or CF_AUDIENCE is not configured');
    return new Response('Erreur de configuration serveur.', { status: 500 });
  }

  try {
    const jwks = getJWKS(CF_TEAM_DOMAIN);
    const { payload } = await jwtVerify(token, jwks, {
      audience: CF_AUDIENCE,
      issuer: CF_TEAM_DOMAIN,
    });

    const email = payload.email as string;
    const db = drizzle(resolvedEnv.DB as any);

    // Bootstrap ou chargement de l'utilisateur
    let user = await db.select().from(adminUsersTable).where(eq(adminUsersTable.email, email)).get();

    if (!user) {
      // Est-ce le tout premier administrateur du système ?
      const allUsersCount = await db.select({ id: adminUsersTable.id }).from(adminUsersTable).limit(1).all();
      if (allUsersCount.length === 0) {
        // Bootstrap: on donne tous les droits
        const result = await db.insert(adminUsersTable).values({
          email,
          name: email.split('@')[0] || 'Admin',
          permissions: ['*'],
          createdAt: new Date()
        }).returning().get();
        user = result;
      } else {
        return new Response('Accès refusé. Compte non configuré.', { status: 403 });
      }
    }

    context.locals.user = { 
      email: user.email,
      permissions: user.permissions
    };
    return next();
  } catch {
    return new Response('Authentification invalide ou expirée.', { status: 403 });
  }
};

export const onRequest = defineMiddleware(handleAuth);

