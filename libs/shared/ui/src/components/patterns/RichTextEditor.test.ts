import { describe, it, expect } from 'vitest';
import { mount, flushSync } from 'svelte';
import RichTextEditor from './RichTextEditor.svelte';
import { reactiveProps } from './reactive.svelte';

/**
 * Frontière entre l'adresse **affichée** et le chemin **enregistré**.
 *
 * Les octets d'un média sont servis par le site public seul : l'administration, sur un
 * autre domaine, ne répond rien sur `/media/…`, et une image insérée dans un bloc
 * restait invisible dans la zone d'édition. L'éditeur préfixe donc l'origine pour
 * l'affichage — mais le chemin relatif doit rester la seule forme enregistrée, sinon
 * l'assainisseur du serveur, qui n'accepte qu'un `src` de même origine, jetterait
 * l'image à l'enregistrement.
 *
 * D'où ces deux sens, testés séparément : les intervertir donnerait un éditeur qui
 * marche à l'écran et perd les images en base.
 */
const ORIGIN = 'https://nozaybad.fr';

function render(value: string, mediaOrigin?: string) {
  const props = reactiveProps({ value, mediaOrigin });
  const target = document.createElement('div');
  document.body.appendChild(target);
  mount(RichTextEditor, { target, props });
  flushSync();

  const editor = target.querySelector('[contenteditable]') as HTMLElement;
  return {
    editor,
    /** Ce que le formulaire enregistrerait. */
    get value() {
      return props.value;
    },
    /** Frappe de l'auteur : le composant se resynchronise sur `input`. */
    type(html: string) {
      editor.innerHTML = html;
      // `bubbles` explicite : Svelte délègue ses écouteurs à la racine, et un événement
      // qui ne remonte pas n'atteindrait jamais `oninput`.
      editor.dispatchEvent(new Event('input', { bubbles: true }));
      flushSync();
    }
  };
}

describe('RichTextEditor, origine des médias', () => {
  it("affiche l'image sur le domaine du site public", () => {
    const view = render('<p><img src="/media/abc/original.jpg" alt="Équipe"></p>', ORIGIN);
    expect(view.editor.querySelector('img')?.getAttribute('src')).toBe(
      `${ORIGIN}/media/abc/original.jpg`
    );
  });

  it("n'enregistre jamais l'origine, seulement le chemin", () => {
    const view = render('', ORIGIN);
    view.type(`<p><img src="${ORIGIN}/media/abc/original.jpg" alt=""></p>`);
    expect(view.value).toBe('<p><img src="/media/abc/original.jpg" alt=""></p>');
  });

  it('laisse le contenu intact sans origine — Storybook, tests de composants', () => {
    const view = render('<p><img src="/media/abc/original.jpg" alt=""></p>');
    expect(view.editor.querySelector('img')?.getAttribute('src')).toBe('/media/abc/original.jpg');
    view.type('<p>Texte</p>');
    expect(view.value).toBe('<p>Texte</p>');
  });

  it('ne touche pas aux liens de téléchargement, qui restent relatifs', () => {
    const view = render('', ORIGIN);
    view.type('<p><a href="/media/abc/livret.pdf">Livret</a></p>');
    expect(view.value).toBe('<p><a href="/media/abc/livret.pdf">Livret</a></p>');
  });
});
