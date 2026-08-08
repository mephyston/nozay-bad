import { describe, it, expect } from 'vitest';
// @ts-expect-error — plugin en .mjs, consommé tel quel par astro.config.mjs
import { visitBlockquote, satteriAlerts } from './markdown-alerts.mjs';

/** Citation telle que la produit Sätteri : des textes d'indentation encadrent les blocs. */
function blockquote(...paragraphs: { type: string; value?: string; tagName?: string; children?: any[] }[][]) {
  return {
    type: 'element',
    tagName: 'blockquote',
    properties: {},
    children: [
      { type: 'text', value: '\n' },
      ...paragraphs.map((children) => ({ type: 'element', tagName: 'p', properties: {}, children })),
      { type: 'text', value: '\n' }
    ]
  };
}

const text = (value: string) => ({ type: 'text', value });

describe('encarts Markdown', () => {
  it("s'abonne aux seules citations", () => {
    expect(satteriAlerts.element.filter).toEqual(['blockquote']);
  });

  it('transforme une citation marquée en encart et retire le marqueur', () => {
    const result: any = visitBlockquote(blockquote([text('[!NOTE]\nCeci est une note.')]));

    expect(result.tagName).toBe('aside');
    expect(result.properties.className).toEqual(['md-alert', 'md-alert-note']);
    expect(result.properties['data-label']).toBe('Note');

    const paragraph = result.children.find((c: any) => c.tagName === 'p');
    expect(paragraph.children[0].value).toBe('Ceci est une note.');
  });

  it.each([
    ['[!NOTE]\nx', 'md-alert-note', 'Note'],
    ['[!TIP]\nx', 'md-alert-tip', 'Astuce'],
    ['[!IMPORTANT]\nx', 'md-alert-important', 'Important'],
    ['[!WARNING]\nx', 'md-alert-warning', 'Attention'],
    ['[!CAUTION]\nx', 'md-alert-caution', 'Prudence']
  ])('reconnaît %s', (value, className, label) => {
    const result: any = visitBlockquote(blockquote([text(value)]));
    expect(result.properties.className).toContain(className);
    expect(result.properties['data-label']).toBe(label);
  });

  it('laisse intacte une citation ordinaire', () => {
    expect(visitBlockquote(blockquote([text('Une citation sans marqueur.')]))).toBeUndefined();
  });

  it('ignore un marqueur inconnu plutôt que de produire un encart sans style', () => {
    expect(visitBlockquote(blockquote([text('[!DANGER]\nx')]))).toBeUndefined();
  });

  it("ne traite pas un marqueur qui n'ouvre pas la citation", () => {
    expect(visitBlockquote(blockquote([text('Texte.\n[!NOTE]')]))).toBeUndefined();
  });

  it('conserve le formatage qui suit le marqueur', () => {
    const strong = { type: 'element', tagName: 'strong', properties: {}, children: [text('gras')] };
    const result: any = visitBlockquote(blockquote([text('[!WARNING]\nAttention au '), strong]));

    const paragraph = result.children.find((c: any) => c.tagName === 'p');
    expect(paragraph.children).toHaveLength(2);
    expect(paragraph.children[1]).toBe(strong);
  });

  it('conserve les paragraphes suivants', () => {
    const result: any = visitBlockquote(
      blockquote([text('[!NOTE]\nPremier.')], [text('Second.')])
    );

    const paragraphs = result.children.filter((c: any) => c.tagName === 'p');
    expect(paragraphs.map((p: any) => p.children[0].value)).toEqual(['Premier.', 'Second.']);
  });

  it('supprime le paragraphe devenu vide quand le marqueur est seul', () => {
    const result: any = visitBlockquote(blockquote([text('[!TIP]\n')], [text('Le contenu.')]));

    const paragraphs = result.children.filter((c: any) => c.tagName === 'p');
    expect(paragraphs).toHaveLength(1);
    expect(paragraphs[0].children[0].value).toBe('Le contenu.');
  });
});
