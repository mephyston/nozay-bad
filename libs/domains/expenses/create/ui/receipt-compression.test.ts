import { describe, it, expect } from 'vitest';
import { poidsDataUrl, BUDGET_OCTETS, compresserJustificatif } from './receipt-compression';
import { estJustificatifPdf, justificatifEnBlob } from '../../shared/justificatif';

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

/**
 * Un PDF n'est pas retouché : une facture reçue par courriel part telle quelle, et n'est
 * refusée que si elle dépasse le budget.
 */
describe('justificatif PDF', () => {
  const pdf = (octets: number, type = 'application/pdf', nom = 'facture.pdf') =>
    new File([new Uint8Array(octets).fill(37)], nom, { type });

  it('part tel quel, typé en PDF', async () => {
    const { dataUrl, octets } = await compresserJustificatif(pdf(1000));
    expect(dataUrl.startsWith('data:application/pdf;base64,')).toBe(true);
    expect(octets).toBe(1000);
    expect(estJustificatifPdf(dataUrl)).toBe(true);
  });

  it("est reconnu à l'extension quand le système ne le type pas", async () => {
    const { dataUrl } = await compresserJustificatif(pdf(10, '', 'FACTURE.PDF'));
    expect(estJustificatifPdf(dataUrl)).toBe(true);
  });

  it('est refusé au-delà du budget, avec son poids', async () => {
    await expect(compresserJustificatif(pdf(2048), 1024)).rejects.toThrow(/PDF est trop lourd \(2 Ko, limite 1 Ko\)/);
  });

  it('se reconstitue en PDF pour être ouvert', async () => {
    const { dataUrl } = await compresserJustificatif(pdf(300));
    const blob = justificatifEnBlob(dataUrl);
    expect(blob.type).toBe('application/pdf');
    // jsdom n'a pas `Blob.arrayBuffer` : la taille suffit à voir le base64 décodé.
    expect(blob.size).toBe(300);
  });

  it("n'est pas pris pour une photo", () => {
    expect(estJustificatifPdf('data:image/webp;base64,AAAA')).toBe(false);
    expect(estJustificatifPdf(null)).toBe(false);
  });

  it('refuse un autre type de fichier en le nommant', async () => {
    await expect(compresserJustificatif(pdf(10, 'text/plain', 'a.txt'))).rejects.toThrow(/ni une image ni un PDF \(text\/plain\)/);
  });
});
