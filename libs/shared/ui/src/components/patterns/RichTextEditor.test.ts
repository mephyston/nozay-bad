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
    target,
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

/**
 * Redimensionner une image insérée dans le texte.
 *
 * La taille s'écrit en `width`/`height` — les deux seuls attributs de dimension que
 * l'assainisseur du site accepte sur une image. Un `style` serait retiré à
 * l'enregistrement et l'auteur verrait sa mise en forme disparaître entre l'aperçu et
 * la page publiée.
 */
describe("taille d'une image", () => {
  function selectImage(view: ReturnType<typeof render>, natural?: { width: number; height: number }) {
    const image = view.editor.querySelector('img') as HTMLImageElement;
    if (natural) {
      // jsdom ne charge aucune image : on simule le fichier derrière le `src`, seule
      // source qui dise la taille d'origine une fois les attributs modifiés.
      Object.defineProperty(image, 'naturalWidth', { value: natural.width, configurable: true });
      Object.defineProperty(image, 'naturalHeight', { value: natural.height, configurable: true });
    }
    image.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    flushSync();
    return image;
  }

  // Cherché dans **cet** éditeur, et non dans le document : les montages des tests
  // précédents y restent, et un libellé identique désignerait leur barre d'outils.
  function press(view: ReturnType<typeof render>, label: string) {
    const button = Array.from(view.target.querySelectorAll('button')).find(
      (b) => b.getAttribute('aria-label') === label
    ) as HTMLButtonElement;
    expect(button, `bouton « ${label} » absent`).toBeTruthy();
    button.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    flushSync();
  }

  it('ne propose les tailles que lorsqu’une image est sélectionnée', () => {
    const view = render('<p>Texte</p><img src="/media/a1b2c3.jpg" alt="Équipe" width="1600" height="1200">');
    expect(view.target.querySelector('[aria-label="Image en petit (400 px de large)"]')).toBeNull();

    selectImage(view, { width: 1600, height: 1200 });
    expect(view.target.querySelector('[aria-label="Image en petit (400 px de large)"]')).not.toBeNull();
  });

  it('réduit en gardant les proportions', () => {
    const view = render('<img src="/media/a1b2c3.jpg" alt="Équipe" width="1600" height="1200">');
    selectImage(view, { width: 1600, height: 1200 });

    press(view, 'Image en petit (400 px de large)');
    expect(view.value).toContain('width="400"');
    expect(view.value).toContain('height="300"');
  });

  it("revient aux dimensions d'origine", () => {
    const view = render('<img src="/media/a1b2c3.jpg" alt="Équipe" width="1600" height="1200">');
    selectImage(view, { width: 1600, height: 1200 });

    press(view, 'Image en moyen (800 px de large)');
    expect(view.value).toContain('width="800"');

    press(view, "Image à sa taille d'origine");
    expect(view.value).toContain('width="1600"');
    expect(view.value).toContain('height="1200"');
  });

  it("n'agrandit jamais au-delà du fichier", () => {
    // Étirer un logo de 300 px à 800 le rend flou sans lui ajouter le moindre détail.
    // Le logo part réduit à 200 px : la commande doit agir — et s'arrêter à 300.
    const view = render('<img src="/media/logo.png" alt="Logo" width="200" height="100">');
    selectImage(view, { width: 300, height: 150 });

    press(view, 'Image en moyen (800 px de large)');
    expect(view.value).toContain('width="300"');
    expect(view.value).toContain('height="150"');
  });

  it("enregistre le chemin relatif malgré le redimensionnement", () => {
    const view = render('<img src="/media/a1b2c3.jpg" alt="Équipe" width="1600" height="1200">', ORIGIN);
    selectImage(view, { width: 1600, height: 1200 });

    press(view, 'Image en petit (400 px de large)');
    expect(view.value).toContain('src="/media/a1b2c3.jpg"');
    expect(view.value).not.toContain(ORIGIN);
  });
});
