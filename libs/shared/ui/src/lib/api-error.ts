/**
 * Le message d'une réponse en échec, lisible par un humain.
 *
 * Les relais de l'admin transmettent le corps d'erreur de l'API tel quel : une enveloppe
 * `{ "success": false, "error": "…" }`. Plusieurs écrans levaient ce corps brut comme message
 * (`new Error(await res.text())`), et le toast affichait le JSON entier, accolades comprises.
 * Ici, l'enveloppe rend son `error` ; un corps en texte simple est rendu tel quel ; un corps
 * vide ou illisible retombe sur le message de repli.
 */
export async function readApiError(res: Response, fallback: string): Promise<string> {
  let raw = '';
  try {
    raw = (await res.text()).trim();
  } catch {
    return fallback;
  }
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as { error?: unknown; message?: unknown } | null;
    if (parsed && typeof parsed === 'object') {
      const message = parsed.error ?? parsed.message;
      return typeof message === 'string' && message.trim() ? message : fallback;
    }
  } catch {
    // Pas du JSON : un message en clair.
  }
  return raw;
}
