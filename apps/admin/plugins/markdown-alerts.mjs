/**
 * Rend les encarts GitHub (`> [!NOTE]`, `> [!WARNING]`, …) écrits dans le centre
 * d'aide et le CHANGELOG.
 *
 * Sans ce plugin, la syntaxe est rendue telle quelle : une citation grise dont la
 * première ligne est le texte littéral « [!NOTE] ». La citation devient ici un
 * `<aside class="md-alert md-alert-note" data-label="Note">`, mis en forme par
 * `styles/global.css`, et le marqueur disparaît du texte.
 *
 * C'est un plugin **hast** (arbre HTML) et non mdast : le passage mdast→hast se
 * fait en Rust, `data.hName` n'y survivrait pas. Écrit à la main plutôt qu'en
 * dépendance — la syntaxe est figée par GitHub et le monorepo n'a pas d'autre
 * usage de plugin Markdown.
 */

/** Marqueurs reconnus, et libellé français affiché en tête d'encart. */
const ALERTS = {
  NOTE: { kind: 'note', label: 'Note' },
  TIP: { kind: 'tip', label: 'Astuce' },
  IMPORTANT: { kind: 'important', label: 'Important' },
  WARNING: { kind: 'warning', label: 'Attention' },
  CAUTION: { kind: 'caution', label: 'Prudence' }
};

const MARKER = /^\[!([A-Z]+)\]\n?/;

/**
 * Visiteur de `<blockquote>` : renvoie l'encart de remplacement, ou rien pour
 * laisser la citation intacte.
 */
export function visitBlockquote(node) {
  const children = node.children ?? [];
  const firstParagraph = children.find((child) => child.type === 'element' && child.tagName === 'p');
  const firstText = firstParagraph?.children?.[0];
  if (firstText?.type !== 'text') return;

  const match = firstText.value.match(MARKER);
  const alert = match && ALERTS[match[1]];
  if (!alert) return;

  // Le marqueur occupe toujours sa propre ligne : le retirer laisse soit le reste
  // du paragraphe, soit un paragraphe vide qu'on écarte.
  const remaining = firstText.value.slice(match[0].length);
  const paragraphChildren = remaining
    ? [{ type: 'text', value: remaining }, ...firstParagraph.children.slice(1)]
    : firstParagraph.children.slice(1);

  const rebuilt = children
    .map((child) => {
      if (child !== firstParagraph) return child;
      if (paragraphChildren.length === 0) return null;
      return {
        type: 'element',
        tagName: 'p',
        properties: firstParagraph.properties ?? {},
        children: paragraphChildren
      };
    })
    .filter((child) => child !== null);

  return {
    type: 'element',
    tagName: 'aside',
    properties: {
      className: ['md-alert', `md-alert-${alert.kind}`],
      // Le libellé est porté par un attribut : il est ainsi posé par CSS et n'entre
      // pas dans le texte copié depuis la page.
      'data-label': alert.label
    },
    children: rebuilt
  };
}

/** Plugin hast, au format attendu par `markdown.hastPlugins` d'Astro. */
export const satteriAlerts = {
  name: 'md-alerts',
  element: {
    filter: ['blockquote'],
    visit: visitBlockquote
  }
};

export default satteriAlerts;
