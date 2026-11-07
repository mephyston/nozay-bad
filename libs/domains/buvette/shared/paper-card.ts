/**
 * Le code d'une carte papier : long et aléatoire, il ne se devine pas et vaut de l'argent. Seule
 * son empreinte est gardée : une copie de la base ne donne aucune carte utilisable. Il se lit
 * dans le QR code, ou dans une adresse de l'app buvette, ou se saisit depuis la carte.
 */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const PAPER_CODE = /BVP[-\s]?([A-Z0-9]{5})[-\s]?([A-Z0-9]{5})[-\s]?([A-Z0-9]{5})/;

/** Le jeton de scan d'une carte papier ne désigne aucun appareil : la carte elle-même fait foi. */
export const PAPER_DEVICE = 'paper';

export function newPaperCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(15));
  const chars = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
  return `BVP-${chars.slice(0, 5)}-${chars.slice(5, 10)}-${chars.slice(10, 15)}`;
}

export function readPaperCode(raw: string): string | null {
  const match = PAPER_CODE.exec(raw.trim().toUpperCase());
  return match ? `BVP-${match[1]}-${match[2]}-${match[3]}` : null;
}

export async function hashPaperCode(code: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

export function paperLabel(id: number): string {
  return `Carte papier n° ${id}`;
}

/** Pourquoi une carte papier ne sert plus : le bénévole doit le lire, pas seulement un refus. */
export function closedPaperMessage(reason: string | null): string {
  if (reason === 'refunded') return 'Cette carte papier a déjà été remboursée : ne la remboursez pas une seconde fois.';
  if (reason === 'merged') return 'Cette carte papier a été transférée sur un compte buvette : elle ne vaut plus rien.';
  return 'Cette carte papier n\'est plus valable.';
}
