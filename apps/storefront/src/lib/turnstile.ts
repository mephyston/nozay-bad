import { env as cfEnv } from 'cloudflare:workers';

/**
 * Turnstile verification configuration and rate limiting helpers.
 * Compatible with Cloudflare Workers Free Tier (using Workers KV or process-global store).
 */

export const DEFAULT_TURNSTILE_SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export function getTurnstileSiteverifyUrl(): string {
  return (
    (typeof process !== 'undefined' && process.env?.PUBLIC_TURNSTILE_SITEVERIFY_URL) ||
    (import.meta.env && import.meta.env.PUBLIC_TURNSTILE_SITEVERIFY_URL) ||
    DEFAULT_TURNSTILE_SITEVERIFY_URL
  );
}

export interface RateLimitRecord {
  count: number;
  resetTime: number;
}

export class SharedRateLimiter {
  private memoryStore: Map<string, RateLimitRecord>;
  private seenTokens: Map<string, number>;

  constructor() {
    const g = globalThis as any;
    if (!g.__sharedRateLimitStore) {
      g.__sharedRateLimitStore = new Map<string, RateLimitRecord>();
    }
    if (!g.__sharedSeenTokens) {
      g.__sharedSeenTokens = new Map<string, number>();
    }
    this.memoryStore = g.__sharedRateLimitStore;
    this.seenTokens = g.__sharedSeenTokens;
  }

  async isRateLimited(ip: string, limit = 30, windowMs = 60000, kv?: any): Promise<boolean> {
    const now = Date.now();
    const key = `rl:${ip}`;

    if (kv && typeof kv.get === 'function') {
      try {
        const stored = await kv.get(key, { type: 'json' });
        if (!stored || now > stored.resetTime) {
          const initialTtl = Math.max(60, Math.ceil(windowMs / 1000));
          await kv.put(key, JSON.stringify({ count: 1, resetTime: now + windowMs }), { expirationTtl: initialTtl });
          return false;
        }
        const newCount = stored.count + 1;
        const remainingTtl = Math.max(60, Math.ceil((stored.resetTime - now) / 1000));
        await kv.put(key, JSON.stringify({ count: newCount, resetTime: stored.resetTime }), { expirationTtl: remainingTtl });
        return newCount > limit;
      } catch (err: any) {
        console.error('[RateLimiter] Workers KV is rate limited or unavailable, degrading to in-memory store:', err);
      }
    }

    const record = this.memoryStore.get(key);
    if (!record || now > record.resetTime) {
      this.memoryStore.set(key, { count: 1, resetTime: now + windowMs });
      return false;
    }
    record.count++;
    return record.count > limit;
  }

  async resetRateLimit(ip: string, kv?: any): Promise<void> {
    const key = `rl:${ip}`;
    if (kv && typeof kv.delete === 'function') {
      try {
        await kv.delete(key);
      } catch (err: any) {
        console.error('[RateLimiter] Workers KV reset failed, degrading to in-memory store:', err);
      }
    }
    this.memoryStore.delete(key);
  }

  async hasTokenBeenUsed(token: string, kv?: any): Promise<boolean> {
    const key = `token:${token}`;
    if (kv && typeof kv.get === 'function') {
      try {
        const seen = await kv.get(key);
        if (seen) return true;
      } catch (err: any) {
        console.error('[RateLimiter] Workers KV token check failed, degrading to in-memory store:', err);
      }
    }
    const expiry = this.seenTokens.get(token);
    if (expiry && expiry > Date.now()) {
      return true;
    }
    return false;
  }

  async markTokenUsed(token: string, ttlSeconds = 300, kv?: any): Promise<void> {
    const key = `token:${token}`;
    if (kv && typeof kv.put === 'function') {
      try {
        const tokenTtl = Math.max(60, ttlSeconds);
        await kv.put(key, 'used', { expirationTtl: tokenTtl });
      } catch (err: any) {
        console.error('[RateLimiter] Workers KV markTokenUsed failed, degrading to in-memory store:', err);
      }
    }
    this.seenTokens.set(token, Date.now() + ttlSeconds * 1000);
  }

  clearAll(): void {
    this.memoryStore.clear();
    this.seenTokens.clear();
  }
}

export const rateLimiter = new SharedRateLimiter();

export interface VerifyTurnstileOptions {
  kv?: any;
  secretKey?: string;
  runtimeEnv?: any;
}

export async function verifyTurnstileToken(
  token: string,
  ip: string,
  optionsOrKv?: VerifyTurnstileOptions | any,
  explicitSecretKey?: string
): Promise<{ success: boolean; error?: string; errorCodes?: string[] }> {
  if (!token) {
    return { success: false, error: 'Validation anti-bot manquante.' };
  }

  let kv: any;
  let customRuntimeEnv: any;
  let customSecretKey = explicitSecretKey;

  if (optionsOrKv && typeof optionsOrKv === 'object' && !('get' in optionsOrKv) && !('put' in optionsOrKv)) {
    kv = optionsOrKv.kv;
    customRuntimeEnv = optionsOrKv.runtimeEnv;
    if (optionsOrKv.secretKey) {
      customSecretKey = optionsOrKv.secretKey;
    }
  } else {
    kv = optionsOrKv;
  }

  // Resolve secret key from runtime environment (never inlined import.meta.env)
  let cfEnvObj: Record<string, any> = {};
  try {
    cfEnvObj = (cfEnv as any) || {};
  } catch {
    // Ignore
  }

  const secretKey =
    customSecretKey ||
    customRuntimeEnv?.TURNSTILE_SECRET_KEY ||
    cfEnvObj?.TURNSTILE_SECRET_KEY ||
    (typeof process !== 'undefined' ? process.env?.TURNSTILE_SECRET_KEY : undefined);

  // Fail closed if secret key is missing in environment
  if (!secretKey) {
    console.error('[Turnstile] Missing TURNSTILE_SECRET_KEY in environment');
    return {
      success: false,
      error: 'Erreur de configuration serveur (clé secrète Turnstile manquante).'
    };
  }

  // Bypass the network request entirely if using the official Cloudflare test secret key
  // (dev/offline). On court-circuite AUSSI le contrôle de token à usage unique : le widget
  // de test réémet un token identique, ce qui déclenchait « Token captcha déjà utilisé »
  // au moindre retry en développement.
  if (secretKey === '1x0000000000000000000000000000000AA') {
    return { success: true };
  }

  if (await rateLimiter.hasTokenBeenUsed(token, kv)) {
    return { success: false, error: 'Token captcha déjà utilisé.' };
  }

  await rateLimiter.markTokenUsed(token, 300, kv);

  try {
    const url = getTurnstileSiteverifyUrl();
    const verifyRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: secretKey,
        response: token,
        remoteip: ip
      })
    });

    const verifyJson = (await verifyRes.json()) as any;
    if (verifyRes.ok && verifyJson.success) {
      await rateLimiter.resetRateLimit(ip, kv);
      return { success: true };
    }

    const errorCodes = verifyJson['error-codes'] || [];
    console.error('[Turnstile] Verification failed:', errorCodes, verifyJson);

    return {
      success: false,
      error: errorCodes.length > 0
        ? `Validation anti-bot échouée (${errorCodes.join(', ')}).`
        : 'Validation anti-bot échouée.',
      errorCodes
    };
  } catch (err: any) {
    console.error('[Turnstile] Network error during siteverify fetch:', err);
    return {
      success: false,
      error: 'Erreur réseau lors de la vérification du captcha.'
    };
  }
}
