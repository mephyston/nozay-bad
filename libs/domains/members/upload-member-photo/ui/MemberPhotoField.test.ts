import { describe, it, expect } from 'vitest';
import { mount, flushSync } from 'svelte';
import MemberPhotoField from './MemberPhotoField.svelte';

function render(props: Record<string, unknown>) {
  const target = document.createElement('div');
  document.body.appendChild(target);
  mount(MemberPhotoField, { target, props: { baseSrc: '/api/adherents/photo/06123456', initials: 'JD', ...props } });
  flushSync();
  return target;
}

const labels = (target: HTMLElement) =>
  [...target.querySelectorAll('button[aria-label]')].map((b) => b.getAttribute('aria-label'));

describe('MemberPhotoField', () => {
  it("n'offre aucune commande en lecture seule", () => {
    const target = render({ version: 1_700_000_000_000, canEdit: false });

    expect(target.querySelector('input[type="file"]')).toBeNull();
    expect(target.querySelectorAll('button')).toHaveLength(0);
  });

  /**
   * Les deux gestes vivent sur la pastille : plus aucune rangée de commandes sous
   * l'identité, qui coûtait une ligne entière sur chaque fiche.
   */
  it('porte le dépôt et le retrait sur la pastille elle-même', () => {
    const target = render({ version: 1_700_000_000_000, canEdit: true });

    expect(target.querySelector('input[type="file"]')).not.toBeNull();
    expect(labels(target)).toEqual(['Changer la photo de profil', 'Retirer la photo de profil']);
  });

  /** Sans portrait, « Retirer » n'aurait rien à retirer : seul le dépôt est offert. */
  it('invite à ajouter une photo quand il n’y en a pas', () => {
    const target = render({ version: null, canEdit: true });

    expect(labels(target)).toEqual(['Ajouter une photo de profil']);
  });

  /**
   * La version fait office d'adresse : sans elle dans l'URL, un portrait remplacé
   * resterait affiché depuis le cache du navigateur.
   */
  it('fait varier l’adresse de l’image avec la version', () => {
    const target = render({ version: 1_700_000_000_000, canEdit: false });

    expect(target.querySelector('img')?.getAttribute('src')).toBe(
      '/api/adherents/photo/06123456?size=512&v=1700000000000'
    );
  });

  /**
   * Régression : l'administration désigne l'adhérent par un paramètre, pas par le chemin.
   * Un `?` écrit en dur donnait `…?licence=06123456?size=512`, la licence lue à l'autre
   * bout n'existait pas, et la fiche de l'administration n'affichait jamais la photo.
   */
  it('enchaîne ses paramètres quand l’adresse en porte déjà', () => {
    const target = render({
      baseSrc: '/admin/api/member-photo?licence=06123456',
      version: 1_700_000_000_000,
      canEdit: true
    });

    expect(target.querySelector('img')?.getAttribute('src')).toBe(
      '/admin/api/member-photo?licence=06123456&size=512&v=1700000000000'
    );
  });

  it('ne demande aucune image quand l’adhérent n’a pas de portrait', () => {
    const target = render({ version: null, canEdit: false });
    expect(target.querySelector('img')).toBeNull();
    expect(target.innerHTML).toContain('JD');
  });
});
