/**
 * Ce qu'on fait de ce qu'un modèle de vision a lu sur un chèque français.
 *
 * Le modèle transcrit ; il ne décide pas. Tout ce qui demande une règle — quel montant
 * fait foi, quelle année vaut « 26 », quel nom est l'émetteur — se joue ici, en code
 * testable, et non dans l'invite. Un modèle qui écrit « 150,00 » dans un champ nombre,
 * ou « 05/09/26 » sans siècle, n'est pas en faute : c'est ce qu'il y a sur le chèque.
 */

/** Sept chiffres sur un chèque français ; le numéro peut être précédé de zéros. */
const CHECK_NUMBER_LENGTH = 7;

/**
 * Le numéro du chèque : le premier bloc de la ligne CMC7, en bas à gauche.
 *
 * Cette ligne porte trois nombres — numéro du chèque, code banque et guichet, numéro de
 * compte. Un modèle en rend parfois toute la ligne, ou le numéro avec des espaces. On
 * garde le premier groupe de sept chiffres ; à défaut, un groupe de six à huit chiffres
 * qui n'est pas un compte à onze chiffres.
 */
export function normaliseCheckNumber(raw: string | null | undefined): string {
  if (!raw) return '';
  const groups = raw.replace(/[^\d\s]/g, ' ').split(/\s+/).filter(Boolean);
  const exact = groups.find((g) => g.length === CHECK_NUMBER_LENGTH);
  if (exact) return exact;
  const compact = raw.replace(/\D/g, '');
  if (compact.length === CHECK_NUMBER_LENGTH) return compact;
  const near = groups.find((g) => g.length >= 6 && g.length <= 8);
  return near ?? '';
}

const UNITS: Record<string, number> = {
  zero: 0, un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9,
  dix: 10, onze: 11, douze: 12, treize: 13, quatorze: 14, quinze: 15, seize: 16,
  vingt: 20, trente: 30, quarante: 40, cinquante: 50, soixante: 60, quatrevingt: 80, quatrevingts: 80
};

/**
 * Un montant en lettres, tel qu'on l'écrit sur la ligne « payez contre ce chèque ».
 *
 * Rend des centimes, ou `null` si le texte n'est pas un nombre. Les formes courantes sont
 * couvertes : « cent cinquante », « deux cents », « mille deux cent trente-cinq »,
 * « quatre-vingt-dix », « soixante-quinze euros et vingt centimes », « 150 euros ». Le
 * texte du modèle arrive avec traits d'union, accents et casse variables.
 */
export function parseFrenchAmountWords(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const text = raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[-']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return null;

  // « … euros et vingt centimes » : la partie entière est avant « euro », les centimes après.
  const [eurosPart, centsPart] = text.split(/\s*euros?\s*/);
  const euros = wordsToNumber(eurosPart ?? '');
  if (euros === null) return null;
  const cents = centsPart ? wordsToNumber(centsPart.replace(/\s*centimes?\s*/, ' ').replace(/^et\s+/, '')) ?? 0 : 0;
  if (cents >= 100) return null;
  return euros * 100 + cents;
}

/** « mille deux cent trente cinq » → 1235 ; « 150 » → 150 ; texte inconnu → null. */
function wordsToNumber(text: string): number | null {
  const words = text
    .replace(/\bquatre vingts?\b/g, 'quatrevingt')
    .split(' ')
    .filter((w) => w && w !== 'et');
  if (words.length === 0) return null;
  if (words.length === 1 && /^\d+$/.test(words[0])) return Number(words[0]);

  let total = 0;
  let current = 0;
  for (const word of words) {
    if (word === 'cent' || word === 'cents') {
      current = (current || 1) * 100;
    } else if (word === 'mille') {
      total += (current || 1) * 1000;
      current = 0;
    } else if (word in UNITS) {
      current += UNITS[word];
    } else if (/^\d+$/.test(word)) {
      current += Number(word);
    } else {
      return null;
    }
  }
  return total + current;
}

/**
 * Un montant en chiffres, tel qu'écrit dans la case : « 150,00 », « 150.00 », « 150 €
 * 00 », « 1 250,50 », « 150 ». Rend des centimes, ou `null`.
 *
 * La virgule est le séparateur décimal : c'est un chèque français. Un point l'est aussi,
 * un modèle anglophone le préfère. Une espace ou un « € » entre euros et centimes se lit
 * comme sur la case imprimée.
 */
export function parseAmountFigures(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') return Number.isFinite(raw) && raw > 0 ? Math.round(raw * 100) : null;
  const text = raw.replace(/eur(os?)?/gi, '€').trim();
  // Milliers séparés par une espace (fine ou insécable comprise) ou un point.
  const match = text.match(/(\d{1,3}(?:[ \u00a0\u202f.]\d{3})+|\d+)(?:\s*[,.€]\s*(\d{1,2}))?\s*€?\s*$/);
  if (!match) return null;
  const euros = Number(match[1].replace(/[ \u00a0\u202f.]/g, ''));
  const cents = match[2] ? Number(match[2].padEnd(2, '0')) : 0;
  if (!Number.isFinite(euros) || euros + cents === 0) return null;
  return euros * 100 + cents;
}

/**
 * Le montant retenu, en centimes.
 *
 * Sur un chèque, c'est le montant **en lettres** qui fait foi en cas de désaccord, et
 * c'est aussi celui qu'un modèle lit le mieux : des mots, pas une virgule manuscrite
 * dans une petite case. Quand les deux lectures existent et divergent, les lettres
 * gagnent ; quand une seule existe, on la prend ; sans lecture, zéro — l'écran laisse
 * alors le champ vide.
 */
export function chooseAmountCents(figures: string | number | null | undefined, words: string | null | undefined): number {
  const fromWords = parseFrenchAmountWords(words);
  const fromFigures = parseAmountFigures(figures);
  return fromWords ?? fromFigures ?? 0;
}

const MONTHS: Record<string, number> = {
  janvier: 1, fevrier: 2, mars: 3, avril: 4, mai: 5, juin: 6, juillet: 7, aout: 8,
  septembre: 9, octobre: 10, novembre: 11, decembre: 12,
  janv: 1, fev: 2, avr: 4, juil: 7, sept: 9, oct: 10, nov: 11, dec: 12
};

/**
 * La date d'émission, en ISO, ou `null`.
 *
 * Manuscrite après « le », elle arrive sous toutes les formes : « 05/09/26 »,
 * « 5-9-2026 », « 05.09.26 », « 5 sept 2026 », « 2026-09-05 » quand le modèle l'a déjà
 * traduite. Une année à deux chiffres vaut 20xx. Une date qui s'éloigne de plus d'un an
 * du jour de la lecture est rejetée : un chèque n'est encaissable qu'un an et huit jours,
 * et un « 2020 » lu sur un « 2026 » manuscrit vaut mieux absent que faux — l'écran garde
 * alors la date du jour, et le contrôle d'exercice refuserait de toute façon la fausse.
 */
export function normaliseIssueDate(raw: string | null | undefined, today: Date): string | null {
  if (!raw) return null;
  const text = raw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

  let day: number | undefined;
  let month: number | undefined;
  let year: number | undefined;

  let m = text.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) {
    [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  } else if ((m = text.match(/(\d{1,2})\s*[/.\-]\s*(\d{1,2})\s*[/.\-]\s*(\d{4}|\d{2})(?!\d)/))) {
    [day, month, year] = [Number(m[1]), Number(m[2]), Number(m[3])];
  } else if ((m = text.match(/(\d{1,2})(?:er)?\s+([a-z]+)\.?\s+(\d{4}|\d{2})(?!\d)/))) {
    const monthName = m[2];
    month = MONTHS[monthName] ?? MONTHS[monthName.slice(0, 4)] ?? MONTHS[monthName.slice(0, 3)];
    [day, year] = [Number(m[1]), Number(m[3])];
  }
  if (!day || !month || year === undefined) return null;
  if (year < 100) year += 2000;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCMonth() !== month - 1) return null;
  const drift = Math.abs(date.getTime() - today.getTime()) / 86_400_000;
  if (drift > 366) return null;
  return date.toISOString().slice(0, 10);
}

/** Ce qu'on écrit à l'ordre de n'importe quel club de badminton, quel que soit son nom. */
const GENERIC_CLUB_PATTERNS = [/badminton/i, /\bbad\b/i, /association/i];

/**
 * Le club lui-même, sous les formes qu'on écrit sur la ligne « à l'ordre de ».
 *
 * `clubForms` vient de `clubNameVariants(settings)` : le nom, le sigle et leurs
 * abréviations. Les motifs génériques restent — un chèque « à l'ordre de l'association »
 * est pour le club, quel que soit son nom.
 */
export function looksLikeClub(name: string | null | undefined, clubForms: string[] = []): boolean {
  if (!name) return false;
  const lower = name.toLowerCase();
  return GENERIC_CLUB_PATTERNS.some((pattern) => pattern.test(name)) || clubForms.some((form) => lower.includes(form));
}

/**
 * L'émetteur : le titulaire du compte, imprimé, jamais le club.
 *
 * Le modèle rend titulaire et bénéficiaire séparément, et c'est pour ça qu'on les lui
 * demande : un seul champ « émetteur » revenait une fois sur deux avec « Nozay
 * Badminton », le nom écrit en plus gros et à la main. Mais il lui arrive d'intervertir
 * les deux. Or ici le bénéficiaire est **toujours** le club : le seul nom qui n'est pas
 * le club, où qu'il ait été rangé, est celui de l'émetteur. Le titulaire a la priorité,
 * le bénéficiaire ne sert qu'à défaut.
 */
export function pickEmitter(holder: string | null | undefined, payee: string | null | undefined, clubForms: string[] = []): string {
  for (const raw of [holder, payee]) {
    const candidate = (raw ?? '').replace(/\s+/g, ' ').trim();
    if (candidate && !looksLikeClub(candidate, clubForms)) return candidate;
  }
  return '';
}
