/**
 * Préparation de l'image de signature, côté navigateur.
 *
 * Une signature s'imprime sur quatre centimètres de large. Au-delà, les pixels
 * supplémentaires ne se voient sur aucune attestation : ils alourdissent seulement le
 * PDF de chaque adhérent. Un scan de téléphone fait couramment un demi-méga ; réduit
 * ici, il tombe à quelques dizaines de kilo-octets sans différence visible.
 */

/** Dimensions au-delà desquelles un pixel de plus ne se voit sur aucune attestation. */
export const LARGEUR_MAX = 900;
export const HAUTEUR_MAX = 300;

/** Les deux seuls formats acceptés — voir `formatAccepte` pour la raison du PNG. */
export const FORMATS = 'image/png,image/jpeg';

/**
 * Le PNG est préférable : il garde la transparence, là où le JPEG pose un rectangle
 * blanc sur le document et bave autour des traits fins.
 */
export const formatAccepte = (type: string): boolean =>
  type === 'image/png' || type === 'image/jpeg';

/**
 * Le format de sortie, à partir de celui d'entrée.
 *
 * Un PNG reste un PNG : c'est lui qui porte la transparence, et le reconvertir en JPEG
 * poserait le rectangle blanc qu'on cherche justement à éviter. Un trait sur fond
 * transparent se compresse d'ailleurs très bien — ce sont les aplats qui coûtent cher
 * en PNG, pas les lignes.
 */
export const formatDeSortie = (typeEntree: string): string =>
  typeEntree === 'image/png' ? 'image/png' : 'image/jpeg';

/** L'échelle qui fait tenir une image dans le cadre, sans jamais l'agrandir. */
export const echelleInitiale = (largeur: number, hauteur: number): number =>
  Math.min(1, LARGEUR_MAX / largeur, HAUTEUR_MAX / hauteur);

/**
 * Le poids réel d'une data URL, déduit de la longueur de son base64.
 *
 * Sans la décoder : une signature réduite fait quelques dizaines de kilo-octets, et la
 * décoder pour en connaître la taille doublerait l'occupation mémoire pour rien.
 */
export const octetsDeDataUrl = (dataUrl: string): number => {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  return Math.floor((base64.length * 3) / 4);
};

/** Ce que l'écran annonce une fois l'image préparée. */
export const messageDeReduction = (avantOctets: number, apresOctets: number): string => {
  const avant = Math.round(avantOctets / 1024);
  const apres = Math.round(apresOctets / 1024);
  return apres < avant
    ? `Prête à enregistrer (${avant} Ko réduits à ${apres} Ko).`
    : 'Prête à enregistrer.';
};

export type ImageReduite = { dataUrl: string; octets: number };

/** Charge un fichier image, via une URL d'objet libérée après coup. */
function chargerImage(fichier: File): Promise<HTMLImageElement> {
  return new Promise((resoudre, rejeter) => {
    const url = URL.createObjectURL(fichier);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resoudre(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      rejeter(new Error('Image illisible.'));
    };
    img.src = url;
  });
}

/**
 * Réduit l'image jusqu'à ce qu'elle tienne sous le plafond, et rend sa data URL.
 *
 * Si le premier passage ne suffit pas — un scan bruité, où chaque pixel diffère de son
 * voisin — on réduit encore par paliers plutôt que d'échouer en renvoyant l'utilisateur
 * à son logiciel de retouche. `null` quand cinq paliers n'y suffisent pas : l'image est
 * alors à recadrer sur la signature seule.
 */
export async function reduireSignature(
  fichier: File,
  plafondOctets: number
): Promise<ImageReduite | null> {
  const img = await chargerImage(fichier);
  const mime = formatDeSortie(fichier.type);
  let echelle = echelleInitiale(img.width, img.height);

  for (let essai = 0; essai < 5; essai += 1) {
    const toile = document.createElement('canvas');
    toile.width = Math.max(1, Math.round(img.width * echelle));
    toile.height = Math.max(1, Math.round(img.height * echelle));
    const ctx = toile.getContext('2d');
    if (!ctx) throw new Error('Image illisible.');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, toile.width, toile.height);

    const dataUrl = toile.toDataURL(mime, 0.9);
    const octets = octetsDeDataUrl(dataUrl);
    if (octets <= plafondOctets) return { dataUrl, octets };

    echelle *= 0.75;
  }
  return null;
}
