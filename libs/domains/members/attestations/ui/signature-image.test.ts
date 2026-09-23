import { describe, it, expect } from 'vitest';
import {
  HAUTEUR_MAX,
  LARGEUR_MAX,
  echelleInitiale,
  formatAccepte,
  formatDeSortie,
  messageDeReduction,
  octetsDeDataUrl
} from './signature-image';

describe('format accepté', () => {
  it('n’accepte que PNG et JPEG', () => {
    expect(formatAccepte('image/png')).toBe(true);
    expect(formatAccepte('image/jpeg')).toBe(true);
    expect(formatAccepte('image/webp')).toBe(false);
    expect(formatAccepte('application/pdf')).toBe(false);
  });

  it('garde un PNG en PNG', () => {
    /*
      C'est lui qui porte la transparence : le reconvertir en JPEG poserait sur le
      document le rectangle blanc qu'on cherche justement à éviter.
    */
    expect(formatDeSortie('image/png')).toBe('image/png');
    expect(formatDeSortie('image/jpeg')).toBe('image/jpeg');
  });
});

describe('échelle initiale', () => {
  it('fait tenir l’image dans le cadre', () => {
    expect(echelleInitiale(LARGEUR_MAX * 2, HAUTEUR_MAX)).toBe(0.5);
    expect(echelleInitiale(LARGEUR_MAX, HAUTEUR_MAX * 4)).toBe(0.25);
  });

  it('retient la contrainte la plus forte', () => {
    // Une image large ET haute doit satisfaire les deux bornes, pas seulement une.
    expect(echelleInitiale(LARGEUR_MAX * 2, HAUTEUR_MAX * 4)).toBe(0.25);
  });

  it('n’agrandit jamais une petite signature', () => {
    // Agrandir n'ajoute aucun détail et alourdit le PDF pour rien.
    expect(echelleInitiale(100, 50)).toBe(1);
  });
});

describe('poids d’une data URL', () => {
  it('se déduit de la longueur du base64, sans décoder', () => {
    // Décoder pour mesurer doublerait l'occupation mémoire pour rien.
    const base64 = 'A'.repeat(400);
    expect(octetsDeDataUrl(`data:image/png;base64,${base64}`)).toBe(300);
  });

  it('ne compte pas l’en-tête de la data URL', () => {
    const court = octetsDeDataUrl('data:image/png;base64,AAAA');
    const long = octetsDeDataUrl('data:image/jpeg;base64,AAAA');
    expect(court).toBe(long);
  });
});

describe('message de réduction', () => {
  it('dit le gain quand il y en a un', () => {
    expect(messageDeReduction(512 * 1024, 40 * 1024)).toBe(
      'Prête à enregistrer (512 Ko réduits à 40 Ko).'
    );
  });

  it('se tait sur le gain quand il n’y en a pas', () => {
    // Annoncer « 40 Ko réduits à 40 Ko » ferait douter du traitement.
    expect(messageDeReduction(40 * 1024, 40 * 1024)).toBe('Prête à enregistrer.');
    expect(messageDeReduction(10 * 1024, 40 * 1024)).toBe('Prête à enregistrer.');
  });
});
