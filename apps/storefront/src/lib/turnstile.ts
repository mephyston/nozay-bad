/**
 * Turnstile verification configuration and rate limiting helpers.
 * Compatible with Cloudflare Workers Free Tier (using Workers KV or process-global store).
 */

export const DEFAULT_TURNSTILE_SITEVERIFY_URL = 'https://turnstile.cloudflare.com/turnstile/v0/siteverify';

export function getTurnstileSiteverifyUrl(): string {
  return (
    import.meta.env.PUBLIC_TURNSTILE_SITEVERIFY_URL ||
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
          await kv.put(key, JSON.stringify({ count: 1, resetTime: now + windowMs }), { expirationTtl: Math.ceil(windowMs / 1000) });
          return false;
        }
        const newCount = stored.count + 1;
        await kv.put(key, JSON.stringify({ count: newCount, resetTime: stored.resetTime }), { expirationTtl: Math.ceil((stored.resetTime - now) / 1000) });
        return newCount > limit;
      } catch {
        // Fallback to memory store if KV call fails
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
      } catch {
        // Ignore
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
      } catch {
        // Fallback to memory store
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
        await kv.put(key, 'used', { expirationTtl: ttlSeconds });
      } catch {
        // Ignore
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

export async function verifyTurnstileToken(
  token: string,
  ip: string,
  kv?: any
): Promise<{ success: boolean; error?: string }> {
  if (!token) {
    return { success: false, error: 'Validation anti-bot manquante.' };
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
      body: JSON.stringify({ token })
    });

    const verifyJson = (await verifyRes.json()) as any;
    if (verifyRes.ok && verifyJson.success) {
      await rateLimiter.resetRateLimit(ip, kv);
      return { success: true };
    }

    return {
      success: false,
      error: verifyJson['error-codes']?.join(', ') || 'Validation anti-bot échouée.'
    };
  } catch (err: any) {
    return {
      success: false,
      error: 'Erreur réseau lors de la vérification du captcha.'
    };
  }
}
