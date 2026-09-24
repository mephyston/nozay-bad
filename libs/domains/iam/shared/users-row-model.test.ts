import { describe, it, expect } from 'vitest';
import {
  libelleDeRole,
  tonDeRole,
  resumeDesRoles,
  ligneDAcces,
  accesCorrespond,
  accesFiltres
} from './users-row-model';

const JEAN = { id: 1, name: 'Jean Dupont', email: 'jean@example.com', roles: ['tresorier'] };
const SANS_NOM = { id: 2, name: '', email: 'anonyme@example.com', roles: [] };

describe('libelleDeRole', () => {
  it('traduit un rôle connu', () => {
    expect(libelleDeRole('tresorier')).toBe('Trésorier·ère');
  });

  it("rend le code d'un rôle inconnu plutôt que rien", () => {
    expect(libelleDeRole('archiviste')).toBe('archiviste');
  });
});

describe('tonDeRole', () => {
  it("le super administrateur est le seul rôle en rouge", () => {
    expect(tonDeRole('super_admin')).toBe('destructive');
    expect(tonDeRole('president')).toBe('secondary');
  });

  it("l'accès minimal n'est qu'un contour : il ne donne rien", () => {
    expect(tonDeRole('membre')).toBe('outline');
  });
});

describe('resumeDesRoles', () => {
  it('nomme un rôle', () => {
    expect(resumeDesRoles(['president'])).toBe('Président·e');
  });

  it('en nomme deux', () => {
    expect(resumeDesRoles(['president', 'tresorier'])).toBe('Président·e, Trésorier·ère');
  });

  it('compte au-delà de deux : trois libellés ne tiennent pas sur un téléphone', () => {
    expect(resumeDesRoles(['president', 'tresorier', 'coach'])).toBe('Président·e +2');
  });

  it("dit l'absence de rôle", () => {
    expect(resumeDesRoles([])).toBe('Aucun rôle');
    expect(resumeDesRoles(null)).toBe('Aucun rôle');
    expect(resumeDesRoles(undefined)).toBe('Aucun rôle');
  });
});

describe('ligneDAcces', () => {
  it('porte le nom, puis l’adresse', () => {
    const l = ligneDAcces(JEAN);
    expect(l.titre).toBe('Jean Dupont');
    expect(l.sousTitre).toBe('jean@example.com');
    expect(l.valeur).toBe('Trésorier·ère');
  });

  it("sans nom, l'adresse fait l'identité — et non une ligne vide au-dessus d'elle", () => {
    const l = ligneDAcces(SANS_NOM);
    expect(l.titre).toBe('anonyme@example.com');
    expect(l.sousTitre).toBe('');
  });

  it("ne signale que l'exception : un accès qui n'ouvre rien", () => {
    expect(ligneDAcces(SANS_NOM).exception).toBe(true);
    expect(ligneDAcces(JEAN).exception).toBe(false);
  });
});

describe('accesCorrespond', () => {
  it('cherche dans le nom', () => {
    expect(accesCorrespond(JEAN, 'dupont')).toBe(true);
  });

  it("cherche dans l'adresse", () => {
    expect(accesCorrespond(JEAN, 'example.com')).toBe(true);
  });

  it('cherche dans le libellé du rôle, accents compris', () => {
    // Stocké « tresorier », lu « Trésorier·ère » : c'est le second qu'on tape.
    expect(accesCorrespond(JEAN, 'trésorier')).toBe(true);
    expect(accesCorrespond(JEAN, 'tresoriere')).toBe(false);
  });

  it('exige tous les mots, dans n’importe quel ordre', () => {
    expect(accesCorrespond(JEAN, 'dupont jean')).toBe(true);
    expect(accesCorrespond(JEAN, 'dupont coach')).toBe(false);
  });

  it('un terme vide garde tout', () => {
    expect(accesCorrespond(JEAN, '  ')).toBe(true);
  });
});

describe('accesFiltres', () => {
  it('ne garde que les accès retenus', () => {
    expect(accesFiltres([JEAN, SANS_NOM], 'anonyme').map((u) => u.id)).toEqual([2]);
  });

  it('rend la liste entière sans terme', () => {
    expect(accesFiltres([JEAN, SANS_NOM], '')).toHaveLength(2);
  });
});
