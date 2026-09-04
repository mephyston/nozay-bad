import { describe, it, expect } from 'vitest';
// @ts-ignore — module fourni par le pool workerd à l'exécution, comme dans
// `libs/shared/db/src/test-utils.ts`.
import { env } from 'cloudflare:test';
import { imagesTranscoder } from '@nba/cms-api';

/**
 * L'adaptateur du binding Images, contre le vrai binding.
 *
 * Les tests du domaine (`upload-media/handler.test.ts`) injectent un faux transcodeur :
 * ils valident l'échelle et l'enregistrement, pas l'appel à Cloudflare. Or c'est
 * précisément là que se logent les erreurs qui ne se voient qu'en production — un flux
 * consommé deux fois, un format que le binding refuse, des octets qu'on ne sait pas
 * relire. D'où ce test, dans le pool workerd, qui exécute réellement la chaîne.
 *
 * Miniflare fournit une version basse fidélité du binding : largeur, hauteur, rotation
 * et format. C'est exactement ce dont l'adaptateur se sert, et la qualité — ignorée en
 * local — n'a d'incidence que sur le poids du fichier.
 */

/**
 * PNG 2×2 valide, le plus petit sur lequel un redimensionnement ait un sens.
 *
 * Généré par `sharp` lui-même (2×2, rouge uni) : depuis libvips 8.18 (sharp 0.35, qui
 * corrige des CVE de lecture), la bibliothèque est plus stricte et refusait l'ancien
 * fixture, écrit à la main, par un « libpng read error » — miniflare s'appuie sur
 * `sharp` pour émuler le binding. Un fixture sorti de l'encodeur reste lisible par
 * les versions suivantes.
 *
 * Valable pour l'émulation locale seulement : le service réel refuse une image aussi
 * petite (`IMAGES_TRANSFORM_ERROR 9516`), bien que le fichier soit correct. Ce n'est
 * pas gênant ici, ce test ne s'adresse qu'à miniflare ; mais pointer ce fichier vers
 * le vrai service demanderait une vraie photo.
 */
const PNG_2X2 = Uint8Array.from(
  atob(
    'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAEElE' +
      'QVQI12M4oaEBRAwQCgAhLgRh1YkDWAAAAABJRU5ErkJggg=='
  ),
  (c) => c.charCodeAt(0)
);

/** Les premiers octets, en ASCII lisible : c'est là que chaque conteneur se nomme. */
const header = (bytes: ArrayBuffer) =>
  [...new Uint8Array(bytes).slice(0, 16)]
    .map((b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : '.'))
    .join('');

describe('imagesTranscoder', () => {
  it('réencode réellement en webp et en avif', async () => {
    // On vérifie la signature du conteneur, et non un simple « non vide » : un
    // adaptateur qui rendrait la source inchangée passerait le second contrôle sans
    // avoir rien transcodé.
    const transcoder = imagesTranscoder(env.IMAGES);

    const webp = await transcoder.resize(PNG_2X2.buffer, { width: 2, format: 'image/webp', quality: 75 });
    expect(header(webp.bytes)).toContain('WEBP');
    expect(webp.contentType).toBe('image/webp');

    const avif = await transcoder.resize(PNG_2X2.buffer, { width: 2, format: 'image/avif', quality: 50 });
    expect(header(avif.bytes)).toContain('ftypavif');
    expect(avif.contentType).toBe('image/avif');
  });

  it('rapporte le format réellement rendu', async () => {
    // Le service retombe sur le WebP quand l'AVIF lui coûte trop cher, sans erreur.
    // `contentType()` est le seul moyen de s'en apercevoir, et l'émulation locale ne
    // reproduit pas ce repli : ce qui est vérifié ici, c'est que l'adaptateur
    // **transmet** la valeur du service au lieu de renvoyer le format demandé.
    const transcoder = imagesTranscoder(env.IMAGES);
    const out = await transcoder.resize(PNG_2X2.buffer, { width: 2, format: 'image/webp', quality: 75 });

    expect(out.contentType).toMatch(/^image\//);
    expect(header(out.bytes)).toContain(out.contentType === 'image/webp' ? 'WEBP' : 'ftyp');
  });

  it('accepte plusieurs largeurs depuis la même source', async () => {
    // Le piège de l'adaptateur : `input()` consomme son flux. Réutiliser le même d'une
    // largeur à l'autre rendrait une image vide à partir de la deuxième — et le dépôt
    // enregistrerait des variantes creuses sans que rien ne le signale.
    const transcoder = imagesTranscoder(env.IMAGES);

    const [a, b] = await Promise.all([
      transcoder.resize(PNG_2X2.buffer, { width: 1, format: 'image/webp', quality: 75 }),
      transcoder.resize(PNG_2X2.buffer, { width: 2, format: 'image/webp', quality: 75 })
    ]);

    expect(a.bytes.byteLength).toBeGreaterThan(0);
    expect(b.bytes.byteLength).toBeGreaterThan(0);
  });
});
