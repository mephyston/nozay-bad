import { escapeAttribute, escapeText } from './entities';

/**
 * Dissimulation des adresses e-mail dans du texte riche déjà assaini.
 *
 * Ce qu'il faut en attendre, sans se raconter d'histoire : les moissonneurs qui
 * balaient le HTML à coups d'expression régulière — l'immense majorité, parce que
 * c'est ce qui coûte le moins cher à l'échelle du web — n'y trouvent plus rien. Un
 * robot qui exécute le JavaScript dans un navigateur sans interface, lui, verra
 * l'adresse restituée. Aucune dissimulation ne l'en empêchera : la seule parade
 * complète est de ne pas publier l'adresse, et de passer par un formulaire.
 *
 * D'où l'encodage retenu, **base64 et non l'inversion** : `contact@nozaybad.fr` à
 * l'envers reste `rf.dabyazon@tcatnoc`, que le moindre `\S+@\S+` attrape encore. La
 * base64 ne laisse ni arobase ni point.
 *
 * La transformation se fait **au rendu**, jamais à l'enregistrement : le contenu
 * stocké reste lisible et modifiable, et l'auteur retrouve dans l'éditeur ce qu'il a
 * écrit. Elle s'applique donc au site public seul — l'espace adhérent est derrière
 * une authentification, où aucun moissonneur n'entre.
 */

/**
 * Adresse e-mail, au sens de ce qu'on veut soustraire aux robots.
 *
 * Volontairement plus permissive que la norme, et plus stricte que `\S+@\S+` : elle
 * doit reconnaître ce qu'un rédacteur écrit, sans avaler la ponctuation qui suit.
 */
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/g;

/** Découpe le HTML en balises et en texte. Le texte seul est réécrit. */
const TAG = /<[^>]*>/g;

/**
 * Encodage transportable dans un attribut.
 *
 * `btoa` n'accepte que du latin-1 ; une adresse sort de l'ASCII assez rarement pour
 * qu'on préfère, dans ce cas, ne pas dissimuler du tout plutôt que d'écrire une
 * valeur que le navigateur ne saura pas relire.
 */
function encode(address: string): string | null {
  if (!/^[\x20-\x7E]+$/.test(address)) return null;
  // `btoa` côté navigateur, `Buffer` côté Node : les Workers ont les deux, les tests
  // tournent sur l'un ou l'autre selon l'environnement.
  return typeof btoa === 'function'
    ? btoa(address)
    : Buffer.from(address, 'binary').toString('base64');
}

/** Forme lisible servie avant restitution : lisible d'un humain, inerte pour un regex. */
function readable(address: string): string {
  const [local, domain] = address.split('@');
  return `${local} [arobase] ${domain}`;
}

/**
 * Remplace une adresse par son enveloppe.
 *
 * `data-eml` porte l'adresse encodée ; le texte visible reste compréhensible sans
 * JavaScript, ce qui vaut mieux qu'un espace vide pour qui navigue sans, et pour un
 * lecteur d'écran arrivé avant l'exécution du script.
 */
function wrap(address: string): string {
  const encoded = encode(address);
  if (!encoded) return escapeText(address);
  return `<span data-eml="${escapeAttribute(encoded)}">${escapeText(readable(address))}</span>`;
}

/**
 * Dissimule les adresses d'un fragment HTML assaini.
 *
 * Deux formes sont traitées : l'adresse écrite en toutes lettres dans le texte, et le
 * lien `mailto:` — dont le `href` est le plus facile à moissonner de tous.
 *
 * L'entrée est supposée **déjà passée par `sanitizeRichText`** : ni `<script>` ni
 * `<style>` n'y subsistent, donc aucun texte à ne surtout pas réécrire ne peut se
 * cacher entre deux balises.
 */
export function obfuscateEmails(html: string): string {
  if (!html || !html.includes('@')) return html;

  let out = '';
  let index = 0;

  for (const match of html.matchAll(TAG)) {
    const start = match.index;
    out += html.slice(index, start).replace(EMAIL, (address) => wrap(address));
    out += rewriteTag(match[0]);
    index = start + match[0].length;
  }
  out += html.slice(index).replace(EMAIL, (address) => wrap(address));
  return out;
}

/** Neutralise `href="mailto:…"`, en laissant le reste de la balise intact. */
function rewriteTag(tag: string): string {
  const mailto = tag.match(/\bhref\s*=\s*"mailto:([^"?]+)([^"]*)"/i);
  if (!mailto) return tag;

  const encoded = encode(mailto[1].trim());
  if (!encoded) return tag;

  // `href="#"` et non l'attribut retiré : le lien doit rester atteignable au clavier
  // avant que le script ne l'ait rétabli.
  return tag.replace(mailto[0], `href="#" data-eml="${escapeAttribute(encoded)}"`);
}
