// Helpers de formatage pour l'attestation CSE. Extraits de la page Astro
// (apps/admin/.../attestations/[id].astro) et centralisés ici pour être
// réutilisés par le générateur PDF et testés isolément.

const UNITS = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
const TEENS = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
const TENS = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix'];

const MONTHS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
];

/** Convertit un entier (0-999) en toutes lettres, en français. */
export function numberToFrenchWords(num: number): string {
  if (num === 0) return 'zéro';

  let words = '';
  const hundreds = Math.floor(num / 100);
  const remainder100 = num % 100;

  if (hundreds > 0) {
    if (hundreds === 1) {
      words += 'cent ';
    } else {
      words += UNITS[hundreds] + ' cent';
      if (remainder100 === 0) words += 's';
      words += ' ';
    }
  }

  if (remainder100 > 0) {
    if (remainder100 < 10) {
      words += UNITS[remainder100];
    } else if (remainder100 < 20) {
      words += TEENS[remainder100 - 10];
    } else if (remainder100 === 80) {
      words += 'quatre-vingts';
    } else {
      const tenVal = Math.floor(remainder100 / 10);
      const unitVal = remainder100 % 10;

      if (tenVal === 7) {
        words += unitVal === 1 ? 'soixante et onze' : 'soixante-' + TEENS[unitVal];
      } else if (tenVal === 8) {
        words += unitVal === 1 ? 'quatre-vingt-un' : 'quatre-vingt-' + UNITS[unitVal];
      } else if (tenVal === 9) {
        words += 'quatre-vingt-' + TEENS[unitVal];
      } else {
        words += TENS[tenVal];
        if (unitVal > 0) {
          words += unitVal === 1 ? ' et un' : '-' + UNITS[unitVal];
        }
      }
    }
  }

  return words.trim();
}

/** ISO `YYYY-MM-DD` → `21 septembre 1974`. Renvoie la chaîne d'origine si non parsable. */
export function formatFrenchDate(dateStr: string): string {
  if (!dateStr || dateStr === 'date de validation') return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const monthNum = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  const monthName = MONTHS[monthNum - 1] || parts[1];
  return `${day} ${monthName} ${parts[0]}`;
}

/** `24-25` → `2024-2025`. Renvoie tel quel si déjà au bon format. */
export function formatSeason(seasonId: string): string {
  if (!seasonId) return '';
  const parts = seasonId.split('-');
  if (parts.length === 2 && parts[0].length === 2) {
    return `20${parts[0]}-20${parts[1]}`;
  }
  return seasonId;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  virement: 'virement bancaire',
  cheque: 'chèque',
  especes: 'espèces',
  labaz: 'Labaz',
  ancv: 'ANCV',
  pass_sport: "Pass'Sport",
  ticket_loisir: 'Ticket Loisir',
  up_loisir: 'Up Loisir'
};

/** Libellé lisible d'un mode de règlement ; renvoie la clé brute si inconnue. */
export function paymentMethodLabel(method: string): string {
  return PAYMENT_METHOD_LABELS[method] || method;
}
