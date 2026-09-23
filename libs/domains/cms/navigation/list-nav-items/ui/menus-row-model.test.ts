import { describe, it, expect, vi } from 'vitest';
import {
  estConteneur,
  gestesDEntree,
  ligneDEntree,
  rangeesDeMenu,
  type EntreeLike
} from './menus-row-model';

function entree(s: Partial<EntreeLike> = {}): EntreeLike {
  return {
    id: 1,
    location: 'header',
    parentId: null,
    label: 'Le club',
    pageId: 4,
    externalUrl: null,
    position: 0,
    href: '/le-club/',
    children: [],
    ...s
  };
}

const gestes = () => ({
  onEdit: vi.fn(),
  onAddChild: vi.fn(),
  onMove: vi.fn(),
  onRemove: vi.fn()
});

const rangee = (e: EntreeLike, fratrie: EntreeLike[], rang: number, enfant = false) => ({
  entree: e,
  fratrie,
  rang,
  enfant
});

describe('menus-row-model', () => {
  describe('projection', () => {
    it('identifie par l’intitulé et situe par la cible', () => {
      const l = ligneDEntree(entree());
      expect(l.titre).toBe('Le club');
      expect(l.sousTitre).toBe('/le-club/');
      expect(l.ton).toBe('foreground');
    });

    it('préfère l’adresse extérieure quand il y en a une', () => {
      const l = ligneDEntree(
        entree({ pageId: null, externalUrl: 'https://ffbad.org/', href: 'https://ffbad.org/' })
      );
      expect(l.sousTitre).toBe('https://ffbad.org/');
    });

    it('éteint une entrée qui ne mène nulle part', () => {
      const conteneur = entree({ pageId: null, href: null });
      expect(estConteneur(conteneur)).toBe(true);
      expect(ligneDEntree(conteneur).sousTitre).toBe('Regroupe seulement ses sous-entrées');
      expect(ligneDEntree(conteneur).ton).toBe('muted');
    });
  });

  describe('aplatissement', () => {
    const arbre = [
      entree({ id: 1, label: 'Le club', children: [
        entree({ id: 11, label: 'Le bureau', parentId: 1 }),
        entree({ id: 12, label: 'Nos valeurs', parentId: 1 })
      ] }),
      entree({ id: 2, label: 'Boutique', children: [] })
    ];

    it('rend les entrées dans l’ordre où on les lit', () => {
      expect(rangeesDeMenu(arbre).map((r) => r.entree.id)).toEqual([1, 11, 12, 2]);
      expect(rangeesDeMenu(arbre).map((r) => r.enfant)).toEqual([false, true, true, false]);
    });

    it('fait voyager la fratrie et le rang avec chaque rangée', () => {
      /*
        Déplacer une entrée renvoie l'ordre complet de sa fratrie, et non un échange
        deux à deux : le serveur renumérote de 0 à n, ce qui répare au passage les
        trous laissés par une suppression.
      */
      const rangees = rangeesDeMenu(arbre);
      expect(rangees[0].fratrie.map((e) => e.id)).toEqual([1, 2]);
      expect(rangees[0].rang).toBe(0);
      expect(rangees[2].fratrie.map((e) => e.id)).toEqual([11, 12]);
      expect(rangees[2].rang).toBe(1);
    });

    it('ne cale pas sur un arbre vide ni sur une entrée sans enfants déclarés', () => {
      expect(rangeesDeMenu([])).toEqual([]);
      const sansEnfants = { ...entree(), children: undefined } as unknown as EntreeLike;
      expect(rangeesDeMenu([sansEnfants])).toHaveLength(1);
    });
  });

  describe('gestes', () => {
    const fratrie = [entree({ id: 1 }), entree({ id: 2 }), entree({ id: 3 })];

    it('retire le déplacement aux extrémités au lieu de le griser', () => {
      /*
        Un bouton grisé occupe la place sans rien offrir ; au balayage, il n'y a pas
        de place à occuper.
      */
      const premier = gestesDEntree(rangee(fratrie[0], fratrie, 0), { canWrite: true, ...gestes() });
      expect(premier.map((a) => a.id)).not.toContain('monter');
      expect(premier[0].id).toBe('descendre');

      const dernier = gestesDEntree(rangee(fratrie[2], fratrie, 2), { canWrite: true, ...gestes() });
      expect(dernier.map((a) => a.id)).not.toContain('descendre');

      const milieu = gestesDEntree(rangee(fratrie[1], fratrie, 1), { canWrite: true, ...gestes() });
      expect(milieu[0].id).toBe('monter');
      expect(milieu[0].tone).toBe('primary');
    });

    it('n’offre une sous-entrée qu’au premier niveau', () => {
      // Le menu du site ne descend pas plus bas que deux niveaux.
      const parent = gestesDEntree(rangee(fratrie[1], fratrie, 1), { canWrite: true, ...gestes() });
      expect(parent.map((a) => a.id)).toContain('sous-entree');

      const enfant = gestesDEntree(rangee(fratrie[1], fratrie, 1, true), {
        canWrite: true,
        ...gestes()
      });
      expect(enfant.map((a) => a.id)).not.toContain('sous-entree');
    });

    it('déplace la fratrie entière, dans le bon sens', () => {
      const g = gestes();
      const actions = gestesDEntree(rangee(fratrie[1], fratrie, 1), { canWrite: true, ...g });
      actions.find((a) => a.id === 'monter')!.run(fratrie[1]);
      expect(g.onMove).toHaveBeenCalledWith(fratrie, 1, -1);

      actions.find((a) => a.id === 'descendre')!.run(fratrie[1]);
      expect(g.onMove).toHaveBeenCalledWith(fratrie, 1, 1);
    });

    it('ne double pas la question que l’écran pose déjà', () => {
      // La sienne compte les sous-entrées emportées.
      const actions = gestesDEntree(rangee(fratrie[1], fratrie, 1), { canWrite: true, ...gestes() });
      expect(actions.every((a) => a.confirm === undefined)).toBe(true);
    });

    it('n’offre rien sans le droit d’écrire', () => {
      expect(gestesDEntree(rangee(fratrie[0], fratrie, 0), { canWrite: false, ...gestes() })).toEqual(
        []
      );
    });
  });
});
