import { describe, it, expect } from 'vitest';
import { poidsDataUrl, BUDGET_OCTETS } from './receipt-compression';

/**
 * Le poids d'une adresse `data:`.
 *
 * C'est ce calcul qui décide si un justificatif passe ou non : la photo est stockée en
 * base64 dans D1, et la limite porte donc sur la **chaîne enregistrée**, pas sur le
 * fichier choisi. Se tromper d'un tiers — l'écart exact entre les deux — c'est accepter
 * des lignes que la base refusera, ou refuser des photos qui tenaient.
 */
describe('poids d’une adresse data:', () => {
  const encoder = (octets: number[]) => {
    const base64 = btoa(String.fromCharCode(...octets));
    return `data:image/webp;base64,${base64}`;
  };

  it('rend le nombre d’octets encodés, et non la longueur de la chaîne', () => {
    // 3 octets → 4 caractères de base64, sans bourrage.
    expect(poidsDataUrl(encoder([1, 2, 3]))).toBe(3);
  });

  it('tient compte du bourrage', () => {
    // Le `=` final ne code aucun octet : l'ignorer surestimerait le poids.
    expect(poidsDataUrl(encoder([1]))).toBe(1);
    expect(poidsDataUrl(encoder([1, 2]))).toBe(2);
    expect(poidsDataUrl(encoder([1, 2, 3, 4]))).toBe(4);
  });

  it('reste exact sur une taille réaliste', () => {
    const octets = Array.from({ length: 5000 }, (_, i) => i % 256);
    expect(poidsDataUrl(encoder(octets))).toBe(5000);
  });

  it('mesure bien un tiers de moins que la chaîne', () => {
    /*
      Le rapport qui justifie tout ce module : une photo de 800 Ko produit une chaîne de
      plus d'un mégaoctet. Contrôler le fichier plutôt que la chaîne laissait donc passer
      des lignes trop lourdes pour la base.
    */
    const url = encoder(Array.from({ length: 3000 }, () => 7));
    const chaine = url.slice(url.indexOf(',') + 1).length;
    expect(chaine / poidsDataUrl(url)).toBeCloseTo(4 / 3, 2);
  });

  it('annonce un budget cohérent avec le stockage', () => {
    expect(BUDGET_OCTETS).toBe(800 * 1024);
  });
});
