/**
 * Utilitaires d'échappement HTML, sans DOM.
 *
 * Le code tourne dans un Worker Cloudflare : ni `DOMParser`, ni `document`. Tout
 * l'assainissement se fait donc sur la chaîne, d'où ces quelques primitives isolées
 * et testées à part.
 */

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' '
};

/**
 * Décode les entités HTML d'une valeur d'attribut.
 *
 * Indispensable **avant** de juger d'une URL : `java&#115;cript:alert(1)` est un
 * `javascript:` déguisé, qu'une comparaison sur la chaîne brute laisserait passer.
 */
export function decodeEntities(value: string): string {
  return value.replace(/&(#x?[0-9a-f]+|[a-z][a-z0-9]*);?/gi, (match, entity: string) => {
    if (entity[0] === '#') {
      const code =
        entity[1] === 'x' || entity[1] === 'X'
          ? Number.parseInt(entity.slice(2), 16)
          : Number.parseInt(entity.slice(1), 10);
      if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return match;
      try {
        return String.fromCodePoint(code);
      } catch {
        return match;
      }
    }
    const named = NAMED_ENTITIES[entity.toLowerCase()];
    return named ?? match;
  });
}

/**
 * Neutralise le balisage dans un fragment de texte.
 *
 * `&` est volontairement laissé tel quel : le texte vient d'un éditeur qui a déjà
 * encodé ses entités, et le ré-échapper produirait des `&amp;amp;` visibles à l'écran.
 */
export function escapeText(value: string): string {
  return value.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Échappe une valeur d'attribut **décodée**, prête à être placée entre guillemets. */
export function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Schémas d'URL acceptés dans une annonce.
 *
 * Liste blanche, jamais liste noire : `javascript:`, `data:` et `vbscript:` sont les
 * cas connus, mais c'est l'inconnu qui blesse. Un chemin relatif `/…` est accepté pour
 * pointer vers une page de l'espace adhérent.
 */
export function isSafeHref(rawHref: string): boolean {
  // Espaces et caractères de contrôle sont ignorés par les navigateurs au milieu d'un
  // schéma : un « javascript: » coupé par un saut de ligne s'exécute quand même. On les
  // retire donc avant de juger. Boucle sur les points de code plutôt qu'une classe de
  // caractères : une regex portant des octets de contrôle littéraux est illisible et
  // se corrompt à la moindre édition.
  let href = '';
  for (const char of decodeEntities(rawHref)) {
    if (char.codePointAt(0)! > 0x20) href += char;
  }
  href = href.toLowerCase();

  // « // » ouvrirait une URL protocole-relative vers un domaine tiers.
  if (href.startsWith('/')) return !href.startsWith('//');
  return href.startsWith('https://') || href.startsWith('http://') || href.startsWith('mailto:');
}
