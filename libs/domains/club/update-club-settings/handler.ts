import { AppError, type Db } from '@nba/db';
import { ClubSettingsRepository, getClubSettings } from '../shared/repository';
import { SETTINGS_SECTIONS, type ClubSettings, type SectionValues, type SettingsSection } from '../shared/settings';

/**
 * Clé de contrôle d'un IBAN (ISO 7064, mod 97-10).
 *
 * Le schéma vérifie la forme ; une lettre inversée passe la forme et fait
 * rejeter le virement par la banque du client — sur une facture, c'est le club
 * qui n'est pas payé. Le calcul se fait sur des entiers par tranches, l'IBAN
 * dépassant la précision d'un nombre JavaScript.
 */
export function isValidIban(iban: string): boolean {
  const compact = iban.replace(/\s+/g, '').toUpperCase();
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{10,30}$/.test(compact)) return false;
  const rearranged = compact.slice(4) + compact.slice(0, 4);
  const digits = rearranged.replace(/[A-Z]/g, (ch) => String(ch.charCodeAt(0) - 55));
  let remainder = 0;
  for (let i = 0; i < digits.length; i += 7) {
    remainder = Number(`${remainder}${digits.slice(i, i + 7)}`) % 97;
  }
  return remainder === 1;
}

/** Un fuseau que le moteur connaît : `Intl` lève sur un nom inconnu. */
export function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('fr-FR', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Les chaînes sont rognées ; les nombres passent tels quels. */
function trimmed<S extends SettingsSection>(section: S, values: SectionValues<S>): SectionValues<S> {
  const out: Record<string, unknown> = {};
  for (const key of SETTINGS_SECTIONS[section] as readonly string[]) {
    const v = (values as Record<string, unknown>)[key];
    out[key] = typeof v === 'string' ? v.trim() : v;
  }
  return out as SectionValues<S>;
}

export async function updateClubSettings<S extends SettingsSection>(
  db: Db,
  section: S,
  input: SectionValues<S>,
  actorEmail: string,
  now: Date = new Date()
): Promise<ClubSettings> {
  const values = trimmed(section, input);

  if (section === 'bank') {
    const bank = values as SectionValues<'bank'>;
    if (bank.iban !== '' && !isValidIban(bank.iban)) {
      throw new AppError("L'IBAN est invalide : vérifiez sa clé de contrôle.", 400);
    }
    // Rangé par groupes de quatre, la forme sous laquelle il s'imprime.
    bank.iban = bank.iban.replace(/\s+/g, '').toUpperCase().replace(/(.{4})(?=.)/g, '$1 ');
    bank.bic = bank.bic.toUpperCase();
  }
  if (section === 'sending') {
    const sending = values as SectionValues<'sending'>;
    if (!isValidTimezone(sending.timezone)) {
      throw new AppError(`Fuseau horaire inconnu : ${sending.timezone}`, 400);
    }
  }

  const written = await new ClubSettingsRepository().updateSection(db, section, values, actorEmail, now);
  if (!written) {
    throw new AppError("La configuration du club n'est pas initialisée : migration manquante.", 500);
  }
  return getClubSettings(db);
}
