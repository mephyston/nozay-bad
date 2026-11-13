/**
 * Côté navigateur de l'encaissement d'espèces : les appels au relais de l'admin et
 * l'attente d'une signature.
 *
 * Les écritures de cet écran ne passent pas par `submitForm` : elles ne ferment pas un
 * formulaire et ne réaffichent pas une liste, elles font avancer un échange en cours
 * (QR code, code, signature). Un refus remonte comme une erreur, que l'écran affiche.
 */
const RELAIS = '/admin/api/accounting';

export async function cashAction<T = unknown>(action: string, data: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(`${RELAIS}/especes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...data })
  });
  const body = (await res.json().catch(() => ({}))) as { data?: T; error?: string };
  if (!res.ok) throw new Error(body.error || 'Une erreur est survenue.');
  return body.data as T;
}

/** Relit un reçu ou une remise ; null si l'appel échoue (l'attente réessaiera). */
export async function cashRead<T>(ecran: 'cash-receipt' | 'cash-handover', id: number): Promise<T | null> {
  const res = await fetch(`${RELAIS}/${ecran}?id=${id}`).catch(() => null);
  if (!res?.ok) return null;
  const body = (await res.json()) as { data?: T };
  return body.data ?? null;
}

/**
 * Interroge toutes les `intervalMs` jusqu'à ce que `done` réponde vrai, seulement quand
 * l'onglet est visible. Renvoie de quoi arrêter.
 */
export function pollUntil(tick: () => Promise<boolean>, intervalMs = 2000): () => void {
  let stopped = false;
  let busy = false;
  const timer = setInterval(async () => {
    if (stopped || busy || document.visibilityState !== 'visible') return;
    busy = true;
    try {
      if (await tick()) stop();
    } finally {
      busy = false;
    }
  }, intervalMs);
  function stop() {
    stopped = true;
    clearInterval(timer);
  }
  return stop;
}

export const euros = (cents: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100).replace(/\s/g, ' ');

/** « 12,50 » ou « 12.5 » → 1250 ; NaN si illisible. */
export function centsFromInput(value: string): number {
  const n = Number(String(value).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? Math.round(n * 100) : NaN;
}
