/**
 * Les pictogrammes des articles : choisis d'après le nom, ou imposés depuis le catalogue.
 * Un nom qu'aucun mot ne reconnaît garde son initiale. Les mots sont comparés sans accents ni
 * majuscules, sur des mots entiers ou leur début (« croque » reconnaît « croque-monsieur »).
 */
export const ITEM_ICONS = [
  { key: 'coffee', label: 'Boisson chaude', words: ['cafe', 'expresso', 'espresso', 'capuccino', 'cappuccino', 'the', 'infusion', 'chocolat chaud', 'latte'] },
  { key: 'soda', label: 'Soda, canette', words: ['coca', 'soda', 'limonade', 'orangina', 'ice tea', 'icetea', 'fanta', 'sprite', 'oasis', 'canette', 'schweppes', 'pepsi', 'perrier', 'jus', 'sirop'] },
  { key: 'water', label: 'Eau', words: ['eau', 'evian', 'cristaline', 'vittel', 'volvic'] },
  { key: 'energy', label: 'Boisson énergétique', words: ['red bull', 'redbull', 'monster', 'powerade', 'gatorade', 'isotonique'] },
  { key: 'beer', label: 'Bière', words: ['biere', 'pression', 'demi'] },
  { key: 'wine', label: 'Vin', words: ['vin', 'rose', 'champagne', 'cidre'] },
  { key: 'burger', label: 'Burger', words: ['burger', 'hamburger', 'cheeseburger'] },
  { key: 'sandwich', label: 'Sandwich', words: ['sandwich', 'croque', 'panini', 'hot dog', 'hotdog', 'wrap', 'jambon beurre', 'baguette', 'kebab'] },
  { key: 'pizza', label: 'Pizza, quiche', words: ['pizza', 'quiche', 'tarte salee', 'part de pizza'] },
  { key: 'pasta', label: 'Plat chaud', words: ['pates', 'pasta', 'lasagne', 'bolognaise', 'plat', 'chili', 'risotto', 'gratin', 'soupe'] },
  { key: 'salad', label: 'Salade', words: ['salade', 'taboule'] },
  { key: 'croissant', label: 'Viennoiserie', words: ['croissant', 'viennoiserie', 'pain au chocolat', 'chocolatine', 'brioche'] },
  { key: 'cake', label: 'Gâteau', words: ['gateau', 'cake', 'brownie', 'muffin', 'crepe', 'gaufre', 'tarte', 'part de', 'cookie au'] },
  { key: 'cookie', label: 'Biscuit', words: ['cookie', 'biscuit', 'madeleine', 'sable'] },
  { key: 'candy', label: 'Barre, confiserie', words: ['barre', 'chocolat', 'twix', 'mars', 'snickers', 'kinder', 'bounty', 'kitkat', 'kit kat', 'bonbon', 'confiserie', 'sucette', 'haribo'] },
  { key: 'icecream', label: 'Glace', words: ['glace', 'cornet', 'esquimau', 'magnum', 'sorbet'] },
  { key: 'fruit', label: 'Fruit', words: ['fruit', 'pomme', 'banane', 'orange', 'compote', 'clementine', 'poire'] },
  { key: 'snack', label: 'Chips, pop-corn', words: ['chips', 'popcorn', 'pop corn', 'pop-corn', 'frites', 'cacahuete', 'pringles'] }
] as const;

export type ItemIconKey = (typeof ITEM_ICONS)[number]['key'];

const KEYS = new Set<string>(ITEM_ICONS.map((icon) => icon.key));

function normalize(value: string): string {
  return ` ${value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()} `;
}

/** Le pictogramme que le nom évoque, ou `null`. Le premier mot reconnu dans l'ordre de la liste l'emporte. */
export function guessItemIcon(name: string): ItemIconKey | null {
  const text = normalize(name);
  let best: { key: ItemIconKey; at: number } | null = null;
  for (const icon of ITEM_ICONS) {
    for (const word of icon.words) {
      const at = text.indexOf(` ${word}`);
      if (at >= 0 && (!best || at < best.at)) best = { key: icon.key, at };
    }
  }
  return best?.key ?? null;
}

/** Le choix du catalogue s'il y en a un, sinon la devinette sur le nom. */
export function resolveItemIcon(name: string, icon?: string | null): ItemIconKey | null {
  if (icon && KEYS.has(icon)) return icon as ItemIconKey;
  return guessItemIcon(name);
}

export function isItemIconKey(value: string): value is ItemIconKey {
  return KEYS.has(value);
}
