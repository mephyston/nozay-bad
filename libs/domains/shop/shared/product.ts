/**
 * Ce qu'un produit et ses déclinaisons ont en commun, côté lecture.
 *
 * Une déclinaison porte le nom de son parent (recopié à l'écriture) et un libellé qui
 * la distingue. Partout où un humain lit un produit — une commande, une notification,
 * un libellé d'écriture comptable — c'est le nom composé qu'il attend : « Maillot du
 * club — L », jamais « Maillot du club » seul, qui ne dirait pas quelle taille a été
 * commandée.
 */
export interface ProductNaming {
  name: string;
  variantLabel?: string | null;
}

export const VARIANT_SEPARATOR = ' — ';

export function productDisplayName(product: ProductNaming): string {
  const label = product.variantLabel?.trim();
  return label ? `${product.name}${VARIANT_SEPARATOR}${label}` : product.name;
}

/**
 * Ordre naturel des libellés de déclinaison.
 *
 * Les tailles textiles ne se trient pas par l'alphabet (« L, M, S, XL, XS ») ; les
 * âges et pointures, eux, se lisent comme des nombres (« 10 ans » avant « 12 ans »,
 * et « 8 ans » avant les deux). Ce qui n'est ni l'un ni l'autre garde l'ordre
 * alphabétique, insensible à la casse et aux accents.
 */
const SIZE_ORDER = ['XXXS', 'XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '4XL', '5XL'];

function sizeRank(label: string): number {
  const compact = label.trim().toUpperCase().replace(/\s+/g, '');
  const index = SIZE_ORDER.indexOf(compact);
  return index === -1 ? Number.NaN : index;
}

function leadingNumber(label: string): number {
  const match = /^\s*(\d+(?:[.,]\d+)?)/.exec(label);
  return match ? Number(match[1].replace(',', '.')) : Number.NaN;
}

export function compareVariantLabels(a: string, b: string): number {
  const ra = sizeRank(a);
  const rb = sizeRank(b);
  if (!Number.isNaN(ra) && !Number.isNaN(rb)) return ra - rb;
  // Une taille lettrée vient avant un nombre : « M » puis « 10 ans » — c'est l'ordre
  // adulte / junior des catalogues, et le seul qui ne surprenne personne.
  if (!Number.isNaN(ra)) return -1;
  if (!Number.isNaN(rb)) return 1;

  const na = leadingNumber(a);
  const nb = leadingNumber(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb) && na !== nb) return na - nb;
  if (!Number.isNaN(na) && Number.isNaN(nb)) return -1;
  if (Number.isNaN(na) && !Number.isNaN(nb)) return 1;

  return a.localeCompare(b, 'fr', { sensitivity: 'base', numeric: true });
}
