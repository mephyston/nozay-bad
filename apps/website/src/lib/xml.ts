/** Échappement XML : un titre contenant « & » ou « < » casserait le flux. */
export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Date au format `AAAA-MM-JJ`, ou la date du jour à défaut.
 *
 * `toISOString()` **lève** sur une date invalide : une seule ligne mal formée en base
 * emporterait sinon tout le sitemap, donc l'exploration du site entier.
 */
export function isoDay(value: string | number | Date): string {
  const date = new Date(value);
  const safe = Number.isNaN(date.getTime()) ? new Date() : date;
  return safe.toISOString().slice(0, 10);
}
