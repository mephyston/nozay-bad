/**
 * Les notes de version, lues pour un humain.
 *
 * `CHANGELOG.md` est reconstitué à chaque déploiement depuis les Releases GitHub
 * (`scripts/generate-changelog.mjs`) : c'est du Markdown de semantic-release, avec ses
 * intitulés anglais (« Features », « Bug Fixes »), ses numéros de version, ses liens de
 * commit et ses portées techniques (`**ci:**`). Le texte de chaque ligne, lui, est déjà
 * écrit pour l'utilisateur — c'est la règle des messages de commit.
 *
 * On garde donc le texte et on jette le reste : regroupement par mois, trois niveaux
 * (nouveauté, amélioration, correction), une rubrique en français à la place de la
 * portée, et rien de ce qui ne concerne que l'outillage.
 */

export type ReleaseKind = 'feature' | 'improvement' | 'fix';

export interface ReleaseEntry {
  kind: ReleaseKind;
  text: string;
  /** Rubriques en français, dans l'ordre des portées du commit. */
  areas: string[];
  /** Qui est concerné, quand la portée le dit sans ambiguïté. */
  audience: string | null;
  /** Date de la version, AAAA-MM-JJ. */
  date: string;
}

export interface ReleaseMonth {
  /** « 2026-11 » : clé stable. */
  key: string;
  /** « Novembre 2026 ». */
  label: string;
  features: ReleaseEntry[];
  improvements: ReleaseEntry[];
  fixes: ReleaseEntry[];
}

const SECTION_KIND: Record<string, ReleaseKind> = {
  features: 'feature',
  'performance improvements': 'improvement',
  'bug fixes': 'fix'
};

/** Portées de l'outillage : rien à en dire à un utilisateur. */
const HIDDEN_SCOPES = new Set(['ci', 'checks', 'deps', 'deps-dev', 'build', 'release', 'test', 'tests', 'docs', 'lint', 'tooling', 'dx', 'media', 'claude']);

const AREA_LABELS: Record<string, string> = {
  accounting: 'Comptabilité',
  invoices: 'Factures',
  expenses: 'Notes de frais',
  dashboard: 'Tableau de bord',
  admin: 'Administration',
  members: 'Adhérents',
  storefront: 'Espace adhérent',
  shop: 'Boutique',
  teams: 'Interclubs',
  events: 'Calendrier',
  schedules: 'Créneaux et jeu libre',
  indiv: 'Séances individuelles',
  buvette: 'Buvette',
  caisse: 'Caisse',
  cms: 'Site public',
  website: 'Site public',
  notifications: 'Notifications',
  club: 'Réglages du club',
  iam: 'Accès et droits',
  security: 'Sécurité',
  ui: 'Affichage',
  pwa: 'Application',
  help: 'Aide'
};

const AUDIENCES: Record<string, string> = {
  storefront: 'Adhérents',
  members: 'Bureau',
  accounting: 'Bureau',
  invoices: 'Bureau',
  expenses: 'Bureau',
  dashboard: 'Bureau',
  admin: 'Bureau',
  cms: 'Bureau',
  caisse: 'Bénévoles'
};

const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

const VERSION_HEADING = /^#{1,2} (.+)$/;
const SECTION_HEADING = /^### (.+)$/;
const ENTRY = /^\* (?:\*\*([^*]+):\*\* )?(.+)$/;
const DATE = /(\d{4}-\d{2}-\d{2})/;
/** Les liens qui terminent une ligne : commit « ([abc1234](…)) », demande « ([#38](…)) », « closes … ». */
const TRAILING_LINKS = /\s*(?:,\s*closes\b.*|\((?:\[[^\]]+\]\([^)]*\)(?:,\s*)?)+\))\s*$/i;

/**
 * Une version de la mise en production ou après. Les bêtas et la série 1.x d'avant
 * sont l'historique du chantier, en anglais et technique : GitHub les garde.
 */
function isShownVersion(heading: string): boolean {
  const version = /v?(\d+)\.\d+\.\d+(-[\w.]+)?/.exec(heading);
  return Boolean(version && Number(version[1]) >= 2 && !version[2]);
}

function cleanText(raw: string): string {
  let text = raw.trim();
  for (let previous = ''; previous !== text; ) {
    previous = text;
    text = text.replace(TRAILING_LINKS, '').trim();
  }
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Lit le Markdown et rend les entrées visibles, de la plus récente à la plus ancienne. */
export function parseReleaseNotes(markdown: string): ReleaseEntry[] {
  const entries: ReleaseEntry[] = [];
  const seen = new Set<string>();
  let date: string | null = null;
  let kind: ReleaseKind | null = null;

  for (const line of markdown.split('\n')) {
    const version = VERSION_HEADING.exec(line);
    if (version) {
      date = isShownVersion(version[1]) ? (DATE.exec(version[1])?.[1] ?? null) : null;
      kind = null;
      continue;
    }
    const section = SECTION_HEADING.exec(line);
    if (section) {
      kind = SECTION_KIND[section[1].trim().toLowerCase()] ?? null;
      continue;
    }
    const entry = ENTRY.exec(line);
    if (!entry || !date || !kind) continue;

    const scopes = (entry[1] ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
    if (scopes.some((s) => HIDDEN_SCOPES.has(s))) continue;
    const text = cleanText(entry[2]);
    // Une même ligne peut revenir d'une version à l'autre (correctif repris) : une fois suffit.
    const key = `${kind}:${text}`;
    if (!text || seen.has(key)) continue;
    seen.add(key);

    entries.push({
      kind,
      text,
      areas: [...new Set(scopes.map((s) => AREA_LABELS[s]).filter((label): label is string => Boolean(label)))],
      audience: scopes.map((s) => AUDIENCES[s]).find(Boolean) ?? null,
      date
    });
  }
  return entries.sort((a, b) => b.date.localeCompare(a.date));
}

/** Regroupe par mois, du plus récent au plus ancien. */
export function groupByMonth(entries: ReleaseEntry[]): ReleaseMonth[] {
  const months = new Map<string, ReleaseMonth>();
  for (const entry of entries) {
    const key = entry.date.slice(0, 7);
    let month = months.get(key);
    if (!month) {
      const [year, m] = key.split('-').map(Number);
      month = { key, label: `${MONTHS[m - 1]} ${year}`, features: [], improvements: [], fixes: [] };
      months.set(key, month);
    }
    const list = entry.kind === 'feature' ? month.features : entry.kind === 'improvement' ? month.improvements : month.fixes;
    list.push(entry);
  }
  return [...months.values()].sort((a, b) => b.key.localeCompare(a.key));
}
