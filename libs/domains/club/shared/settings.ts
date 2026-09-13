import type { ClubSettingsRow } from './schema';

/**
 * L'identité du club telle que le reste de l'application la lit.
 *
 * C'est la ligne `club_settings`, moins `id`, avec la liste des logos partenaires
 * décodée. Tout ce qui affiche, imprime ou envoie quelque chose au nom du club
 * passe par ce type — jamais par la table.
 */
export interface ClubSettings {
  name: string;
  shortName: string;
  slug: string;
  tagline: string;
  city: string;
  postalCode: string;
  department: string;
  region: string;
  addressLines: string;

  contactEmail: string;
  treasurerEmail: string;
  presidentEmail: string;
  senderName: string;
  ffbadMembershipUrl: string;

  legalSeat: string;
  rna: string;
  siret: string;
  ddjsApproval: string;
  ffbadAffiliation: string;

  bankHolder: string;
  bankName: string;
  iban: string;
  bic: string;

  teamPrefix: string;
  invoicePrefix: string;
  championshipCommittee: string;
  league: string;

  brandColor: string;
  logoKey: string | null;
  letterheadHeaderKey: string | null;
  letterheadFooterKey: string | null;
  stampKey: string | null;
  partnerLogoKeys: string[];

  timezone: string;
  dailySendHour: number;
  weeklySendDay: string;
  weeklySendHour: number;
  unpaidReminderDelayDays: number;
  emailSignature: string;
  memberWelcomeText: string;

  indivEligibilityKeyword: string;

  updatedByEmail: string | null;
  updatedAt: Date;
}

/**
 * Les sections du formulaire, et les champs que chacune écrit.
 *
 * Un écran par section, un validateur par section, une écriture par section : le
 * bureau enregistre la banque sans retoucher les mentions légales, et un champ
 * n'appartient qu'à un seul écran. `sections.test.ts` vérifie que l'union couvre
 * bien tout ce qui se règle.
 */
export const SETTINGS_SECTIONS = {
  identity: ['name', 'shortName', 'tagline', 'city', 'postalCode', 'department', 'region', 'addressLines'],
  contacts: ['contactEmail', 'treasurerEmail', 'presidentEmail', 'senderName', 'ffbadMembershipUrl'],
  legal: ['legalSeat', 'rna', 'siret', 'ddjsApproval', 'ffbadAffiliation'],
  bank: ['bankHolder', 'bankName', 'iban', 'bic'],
  competition: ['teamPrefix', 'invoicePrefix', 'championshipCommittee', 'league'],
  branding: ['brandColor'],
  sending: [
    'timezone',
    'dailySendHour',
    'weeklySendDay',
    'weeklySendHour',
    'unpaidReminderDelayDays',
    'emailSignature',
    'memberWelcomeText'
  ],
  rules: ['indivEligibilityKeyword']
} as const satisfies Record<string, readonly (keyof ClubSettings)[]>;

export type SettingsSection = keyof typeof SETTINGS_SECTIONS;

export const SETTINGS_SECTION_NAMES = Object.keys(SETTINGS_SECTIONS) as SettingsSection[];

export function isSettingsSection(value: unknown): value is SettingsSection {
  return typeof value === 'string' && Object.hasOwn(SETTINGS_SECTIONS, value);
}

/** Les champs d'une section, typés. */
export type SectionValues<S extends SettingsSection> = Pick<
  ClubSettings,
  (typeof SETTINGS_SECTIONS)[S][number]
>;

/**
 * Les images du club, réglées par dépôt de fichier et non par formulaire.
 *
 * Chacune est une clé R2, ou `null` : le document s'imprime alors sans elle (pas
 * de bande d'en-tête, pas de tampon), jamais avec une image d'un autre club.
 */
export const CLUB_ASSETS = ['logo', 'letterheadHeader', 'letterheadFooter', 'stamp'] as const;
export type ClubAsset = (typeof CLUB_ASSETS)[number];

export function isClubAsset(value: unknown): value is ClubAsset {
  return typeof value === 'string' && (CLUB_ASSETS as readonly string[]).includes(value);
}

/** Colonne portant la clé de chaque image. */
export const CLUB_ASSET_COLUMNS: Record<ClubAsset, 'logoKey' | 'letterheadHeaderKey' | 'letterheadFooterKey' | 'stampKey'> = {
  logo: 'logoKey',
  letterheadHeader: 'letterheadHeaderKey',
  letterheadFooter: 'letterheadFooterKey',
  stamp: 'stampKey'
};

/** Décodage tolérant de la colonne JSON : une valeur corrompue vaut « aucun logo ». */
export function parsePartnerLogoKeys(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((k): k is string => typeof k === 'string') : [];
  } catch {
    return [];
  }
}

export function settingsFromRow(row: ClubSettingsRow): ClubSettings {
  const { id: _id, partnerLogoKeys, ...rest } = row;
  return { ...rest, partnerLogoKeys: parsePartnerLogoKeys(partnerLogoKeys) };
}

/**
 * Un club neutre.
 *
 * Ce que reçoit une base sans ligne `club_settings` — un jeu de test, un
 * environnement monté sans la migration — et le point de départ d'un club créé
 * depuis la plateforme. Rien n'y désigne un club réel : c'est précisément ce que le
 * test d'architecture `club-identity.test.ts` interdit au code.
 */
export const NEUTRAL_CLUB_SETTINGS: ClubSettings = {
  name: 'Club de badminton',
  shortName: 'Club',
  slug: 'club',
  tagline: '',
  city: '',
  postalCode: '',
  department: '',
  region: '',
  addressLines: '',
  contactEmail: '',
  treasurerEmail: '',
  presidentEmail: '',
  senderName: 'Club de badminton',
  ffbadMembershipUrl: '',
  legalSeat: '',
  rna: '',
  siret: '',
  ddjsApproval: '',
  ffbadAffiliation: '',
  bankHolder: '',
  bankName: '',
  iban: '',
  bic: '',
  teamPrefix: 'CLUB',
  invoicePrefix: 'CLUB',
  championshipCommittee: '',
  league: '',
  brandColor: '#C96442',
  logoKey: null,
  letterheadHeaderKey: null,
  letterheadFooterKey: null,
  stampKey: null,
  partnerLogoKeys: [],
  timezone: 'Europe/Paris',
  dailySendHour: 8,
  weeklySendDay: 'MON',
  weeklySendHour: 9,
  unpaidReminderDelayDays: 7,
  emailSignature: '',
  memberWelcomeText: '',
  indivEligibilityKeyword: 'compétiteur',
  updatedByEmail: null,
  updatedAt: new Date(0)
};
