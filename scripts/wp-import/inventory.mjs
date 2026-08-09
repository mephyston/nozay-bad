import { writeFileSync, mkdirSync } from 'node:fs';
import { readWxr, publicPath } from './wxr.mjs';

/**
 * Inventaire du contenu WordPress.
 *
 * Produit le tableau que le bureau doit trancher : quelles pages passent en ligne,
 * lesquelles partent en redirection. Rien n'est décidé ici — le script propose, la
 * colonne `décision` fait foi.
 */

const WXR = '.data/wp/nozaybadmintonassociation.WordPress.2026-08-08.xml';
const OUT = '.data/wp/inventaire.csv';

/** Pages atteignables depuis le menu du site actuel. */
const MENU = new Set([
  '/', '/notre-club/', '/presentation/', '/notre-equipe/', '/la-direction-technique/',
  '/inscription/', '/creneaux/', '/jeulibre/', '/partenaires/', '/politique-de-confidentialite/',
  '/jeunes-2/', '/calendrier-des-competitions/', '/ecoles-francaises-de-badminton/',
  '/minibad/', '/poussins/', '/elite-jeunes/', '/jeunes-3/', '/adultes-2/',
  '/adultes-loisirs/', '/agenda/', '/connexion/'
]);

/** Pages sans valeur : démonstrations du thème, essais, restes de plugins. */
const WORTHLESS = /^\/(forum-2|photos-2|my-instagram-feed-demo|facebook-demo|compte-client|formulaire-client|vignetter-les-photos|page-de-destination-de-widget|tutorial-badnet|consignes-sanitaires|calendrier-codep|article-de-presse|les-joueurs|\d+-\d+)\/$/;

/** Redirections évidentes, dérivées de l'arborescence de l'ancien site. */
function suggestTarget(path) {
  if (WORTHLESS.test(path)) return { decision: '410', target: '' };
  if (path.startsWith('/les-equipes/') || /^\/(equipe-|saison-|classement-)/.test(path))
    return { decision: '301', target: '/adultes-2/' };
  if (/^\/(bureau|organigramme)\/$/.test(path)) return { decision: '301', target: '/notre-equipe/' };
  if (/^\/(materiel-badminton|vente-materiel|vente-de-vetement)\/$/.test(path))
    return { decision: '301', target: '/partenaires/' };
  if (/^\/(jeunes|poussins-2|loisirs-4)\/$/.test(path)) return { decision: '301', target: '/jeunes-2/' };
  if (/^\/(adultes|inscriptions-aux-tournois)\/$/.test(path)) return { decision: '301', target: '/adultes-2/' };
  if (/^\/(photos|videos|albums-photo)\/$/.test(path)) return { decision: '301', target: '/' };
  return { decision: 'à trancher', target: '' };
}

const items = readWxr(WXR);
const media = items.filter((i) => i.type === 'attachment');
const content = items.filter((i) => ['post', 'page'].includes(i.type) && i.status === 'publish');

const rows = content.map((item) => {
  const path = publicPath(item);
  const body = item.body ?? '';
  const empty = body.trim().length < 20;
  const inMenu = MENU.has(path);

  let decision = 'importer';
  let target = '';
  if (item.type === 'page') {
    if (inMenu) decision = 'importer';
    else {
      const suggested = suggestTarget(path);
      decision = suggested.decision;
      target = suggested.target;
    }
  }
  // Une page du menu vide reste à importer : c'est une coquille de rubrique, à
  // regarnir à la main plutôt qu'à jeter.
  const notes = [];
  if (empty) notes.push(inMenu ? 'VIDE — coquille de rubrique à regarnir' : 'vide');
  const shortcodes = [...body.matchAll(/\[([a-z_][a-z0-9_-]*)/g)].map((m) => m[1]);
  if (shortcodes.length) notes.push(`shortcodes: ${[...new Set(shortcodes)].join(' ')}`);
  if (/<iframe/i.test(body)) notes.push('iframe');

  return {
    type: item.type,
    path,
    titre: item.title,
    menu: inMenu ? 'oui' : '',
    caracteres: body.length,
    images: (body.match(/<img/gi) ?? []).length,
    decision,
    cible: target,
    notes: notes.join(' | ')
  };
});

rows.sort((a, b) => (a.type === b.type ? a.path.localeCompare(b.path) : a.type.localeCompare(b.type)));

const header = ['type', 'path', 'titre', 'menu', 'caracteres', 'images', 'decision', 'cible', 'notes'];
const escape = (v) => `"${String(v).replace(/"/g, '""')}"`;
mkdirSync('.data/wp', { recursive: true });
writeFileSync(OUT, [header.join(','), ...rows.map((r) => header.map((h) => escape(r[h])).join(','))].join('\n') + '\n');

const count = (predicate) => rows.filter(predicate).length;
console.log(`Inventaire écrit → ${OUT}`);
console.log(`  articles             ${count((r) => r.type === 'post')}`);
console.log(`  pages                ${count((r) => r.type === 'page')}`);
console.log(`  médias               ${media.length}`);
console.log('');
console.log('Décisions proposées :');
for (const d of ['importer', '301', '410', 'à trancher']) {
  console.log(`  ${d.padEnd(12)} ${count((r) => r.decision === d)}`);
}
console.log('');
console.log('À trancher :');
for (const r of rows.filter((r) => r.decision === 'à trancher')) {
  console.log(`  ${r.path.padEnd(42)} ${r.caracteres.toString().padStart(6)} c.  ${r.notes}`);
}
