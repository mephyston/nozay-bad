import { defineMiddleware } from 'astro:middleware';
import type { APIContext, MiddlewareNext } from 'astro';
import { jwtVerify, createRemoteJWKSet } from 'jose';
import { env as cfEnv } from 'cloudflare:workers';

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
    const impersonateCookie = request.headers.get('cookie')?.match(/impersonate_email=([^;]+)/)?.[1];
    const devEmail = impersonateCookie ? decodeURIComponent(impersonateCookie) : 'admin@nozaybad.fr';

    try {
      let runtimeEnv: Record<string, string> = {};
      try { runtimeEnv = (context.locals as any).runtime?.env || {}; } catch (err) {}
      const resolvedEnv = { ...cfEnv, ...runtimeEnv } as Record<string, string>;
      
      const { createApiClient } = await import('@nba/api-client');
      const apiService = createApiClient(resolvedEnv);
      const res = await apiService.fetch('http://localhost/iam/users');
      
      if (res.ok) {
        const json = await res.json() as any;
        const users = json.data || [];
        const user = users.find((u: any) => u.email === devEmail);
        if (user) {
          context.locals.user = { email: user.email, name: user.name, permissions: user.permissions };
          return next();
        }
      }
      // Default fallback
      context.locals.user = { email: devEmail, name: devEmail.split('@')[0], permissions: ['*'] };
    } catch (e) {
      context.locals.user = { email: devEmail, name: devEmail.split('@')[0], permissions: ['*'] };
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
    
    const { createApiClient } = await import('@nba/api-client');
    const apiService = createApiClient(resolvedEnv);
    const res = await apiService.fetch('http://localhost/iam/users');
    
    if (!res.ok) {
      throw new Error("Erreur lors de la communication avec l'API IAM");
    }

    const json = await res.json() as any;
    const users = json.data || [];
    let user = users.find((u: any) => u.email === email);

    if (!user) {
      // Est-ce le tout premier administrateur du système ?
      if (users.length === 0) {
        // Bootstrap: on donne tous les droits
        const createRes = await apiService.fetch('http://localhost/iam/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, permissions: ['*'] })
        });
        if (createRes.ok) {
          const created = await createRes.json() as any;
          user = created.data;
        } else {
          return new Response('Erreur lors de la création du compte administrateur initial.', { status: 500 });
        }
      } else {
        return new Response('Accès refusé. Compte non configuré.', { status: 403 });
      }
    }

    let finalEmail = user.email;
    let finalPermissions = user.permissions;
    let finalName = user.name || user.email.split('@')[0];

    // Impersonation logic (only for super-admins)
    if (finalPermissions.includes('*')) {
      const impersonateCookie = request.headers.get('cookie')?.match(/impersonate_email=([^;]+)/)?.[1];
      if (impersonateCookie) {
        try {
          const impEmail = decodeURIComponent(impersonateCookie);
          const impUser = users.find((u: any) => u.email === impEmail);
          if (impUser) {
            finalEmail = impUser.email;
            finalPermissions = impUser.permissions;
            finalName = impUser.name || impUser.email.split('@')[0];
          }
        } catch (e) {}
      }
    }

    context.locals.user = { 
      email: finalEmail,
      name: finalName,
      permissions: finalPermissions
    };
    return next();
  } catch (err) {
    console.error("[auth] Error:", err);
    return new Response('Authentification invalide ou expirée.', { status: 403 });
  }
};

export const onRequest = defineMiddleware(handleAuth);

