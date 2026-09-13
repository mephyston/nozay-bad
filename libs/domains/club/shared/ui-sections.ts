import type { SettingsSection } from './settings';

/**
 * Ce que chaque écran de configuration affiche : ses champs, leurs libellés et leur aide.
 *
 * Une spécification et un seul formulaire (`ClubSectionForm.svelte`) plutôt que huit
 * formulaires : les champs sont tous des textes, des nombres ou des choix, et ce qui
 * les distingue tient dans ces lignes. Le validateur de l'API (`update-club-settings/
 * validator.ts`) reste l'autorité ; ici on ne fait qu'aider à saisir juste.
 */
export type FieldKind = 'text' | 'textarea' | 'email' | 'url' | 'number' | 'select' | 'color';

export interface FieldSpec {
  key: string;
  label: string;
  kind: FieldKind;
  help?: string;
  placeholder?: string;
  maxlength?: number;
  required?: boolean;
  min?: number;
  max?: number;
  options?: { value: string; label: string }[];
  /** Champ sur toute la largeur de la grille. */
  wide?: boolean;
}

export interface SectionSpec {
  section: SettingsSection;
  title: string;
  description: string;
  /** Ce que touche cette section, dit au bureau : où les valeurs apparaissent. */
  usedIn: string;
  fields: FieldSpec[];
}

const WEEKDAYS = [
  { value: 'MON', label: 'Lundi' },
  { value: 'TUE', label: 'Mardi' },
  { value: 'WED', label: 'Mercredi' },
  { value: 'THU', label: 'Jeudi' },
  { value: 'FRI', label: 'Vendredi' },
  { value: 'SAT', label: 'Samedi' },
  { value: 'SUN', label: 'Dimanche' }
];

const TIMEZONES = [
  { value: 'Europe/Paris', label: 'Métropole (Europe/Paris)' },
  { value: 'Indian/Reunion', label: 'La Réunion' },
  { value: 'Indian/Mayotte', label: 'Mayotte' },
  { value: 'America/Guadeloupe', label: 'Guadeloupe' },
  { value: 'America/Martinique', label: 'Martinique' },
  { value: 'America/Cayenne', label: 'Guyane' },
  { value: 'Pacific/Noumea', label: 'Nouvelle-Calédonie' },
  { value: 'Pacific/Tahiti', label: 'Polynésie française' },
  { value: 'America/Miquelon', label: 'Saint-Pierre-et-Miquelon' }
];

export const SECTION_SPECS: SectionSpec[] = [
  {
    section: 'identity',
    title: 'Identité',
    description: 'Le nom du club et où il se trouve.',
    usedIn: "Titres des applications, pied de page du site, données structurées pour les moteurs, en-tête des documents.",
    fields: [
      { key: 'name', label: 'Nom complet', kind: 'text', required: true, maxlength: 160, help: 'Tel qu’il figure aux statuts.', wide: true },
      { key: 'shortName', label: 'Sigle', kind: 'text', required: true, maxlength: 40, help: 'Pour les titres courts et l’onglet du navigateur.' },
      { key: 'tagline', label: 'Slogan', kind: 'text', maxlength: 160 },
      { key: 'city', label: 'Ville', kind: 'text', required: true, maxlength: 100 },
      { key: 'postalCode', label: 'Code postal', kind: 'text', required: true, maxlength: 10 },
      { key: 'department', label: 'Département', kind: 'text', required: true, maxlength: 3, help: 'Le numéro : 91, 2A, 974…' },
      { key: 'region', label: 'Département ou région en toutes lettres', kind: 'text', required: true, maxlength: 100, help: 'Ce que lit un visiteur qui cherche un club près de chez lui.' },
      { key: 'addressLines', label: 'Adresse postale', kind: 'textarea', maxlength: 400, help: 'Une ligne par ligne, comme sur une enveloppe.', wide: true }
    ]
  },
  {
    section: 'contacts',
    title: 'Contacts',
    description: 'Les adresses que le club expose et l’expéditeur de ses mails.',
    usedIn: "Mails de connexion et de rappel, mentions légales de l’espace adhérent, sujet des notifications.",
    fields: [
      { key: 'contactEmail', label: 'Adresse de contact', kind: 'email', maxlength: 200, help: 'Celle à laquelle les adhérents répondent.' },
      { key: 'treasurerEmail', label: 'Adresse de la trésorerie', kind: 'email', maxlength: 200 },
      { key: 'presidentEmail', label: 'Adresse de la présidence', kind: 'email', maxlength: 200 },
      { key: 'senderName', label: 'Nom d’expéditeur des mails', kind: 'text', required: true, maxlength: 120 },
      { key: 'ffbadMembershipUrl', label: 'Page de prise de licence (MyFFBaD)', kind: 'url', maxlength: 300, placeholder: 'https://www.myffbad.fr/adherer/…', wide: true }
    ]
  },
  {
    section: 'legal',
    title: 'Mentions légales',
    description: 'Ce que la loi oblige à faire figurer sur une facture et sur un site.',
    usedIn: 'Bas de page des factures, bordereaux et attestations ; page « Mentions légales » de l’espace adhérent.',
    fields: [
      { key: 'legalSeat', label: 'Siège social', kind: 'text', maxlength: 300, placeholder: 'Mairie de …, 00000 VILLE', wide: true },
      { key: 'publicationDirector', label: 'Directeur de la publication', kind: 'text', maxlength: 120, help: 'Le représentant légal, en général la présidence.', wide: true },
      { key: 'rna', label: 'Numéro RNA (association déclarée)', kind: 'text', maxlength: 12, placeholder: 'W091000000' },
      { key: 'siret', label: 'SIRET', kind: 'text', maxlength: 17, placeholder: '000 000 000 00000' },
      { key: 'ddjsApproval', label: 'Agrément jeunesse et sports', kind: 'text', maxlength: 60 },
      { key: 'ffbadAffiliation', label: 'Numéro d’affiliation FFBaD', kind: 'text', maxlength: 60, placeholder: 'LIGUE.00.00.000' }
    ]
  },
  {
    section: 'bank',
    title: 'Coordonnées bancaires',
    description: 'Le compte que les clients du club doivent créditer.',
    usedIn: 'Factures émises, bordereaux de remise de chèques, confirmation de commande de la boutique.',
    fields: [
      { key: 'bankHolder', label: 'Titulaire du compte', kind: 'text', maxlength: 120 },
      { key: 'bankName', label: 'Banque', kind: 'text', maxlength: 120 },
      { key: 'iban', label: 'IBAN', kind: 'text', maxlength: 42, placeholder: 'FR76 0000 0000 0000 0000 0000 000', help: 'La clé de contrôle est vérifiée à l’enregistrement.', wide: true },
      { key: 'bic', label: 'BIC', kind: 'text', maxlength: 11 }
    ]
  },
  {
    section: 'competition',
    title: 'Compétition et numérotation',
    description: 'Les préfixes qui nomment les équipes et numérotent les factures.',
    usedIn: 'Noms d’équipe (« CLUB-1 »), numéros de facture (« FAC-2526-CLUB-0001 »), libellés des championnats.',
    fields: [
      { key: 'teamPrefix', label: 'Préfixe des équipes', kind: 'text', required: true, maxlength: 12, help: 'Majuscules et chiffres, sans espace.' },
      { key: 'invoicePrefix', label: 'Préfixe des factures', kind: 'text', required: true, maxlength: 12, help: 'Changer le préfixe ne renumérote pas les factures déjà émises.' },
      { key: 'championshipCommittee', label: 'Comité départemental', kind: 'text', maxlength: 40, placeholder: 'CD91' },
      { key: 'league', label: 'Ligue régionale', kind: 'text', maxlength: 40, placeholder: 'LIFB' }
    ]
  },
  {
    section: 'branding',
    title: 'Couleur de la marque',
    description: 'La couleur qui signe les documents.',
    usedIn: 'Titres et filets des PDF, couleur d’accent des applications installées.',
    fields: [{ key: 'brandColor', label: 'Couleur', kind: 'color', required: true }]
  },
  {
    section: 'sending',
    title: 'Envois et rappels',
    description: 'Quand partent les envois automatiques, et ce que disent les mails.',
    usedIn: 'Cron des notifications, mails de l’espace adhérent, page d’accueil de l’espace adhérent.',
    fields: [
      { key: 'timezone', label: 'Fuseau horaire', kind: 'select', options: TIMEZONES, required: true },
      { key: 'dailySendHour', label: 'Heure des envois quotidiens', kind: 'number', min: 0, max: 23, help: 'Anniversaires, rappels de compositions et d’ouvreurs.' },
      { key: 'weeklySendDay', label: 'Jour des envois hebdomadaires', kind: 'select', options: WEEKDAYS, required: true },
      { key: 'weeklySendHour', label: 'Heure des envois hebdomadaires', kind: 'number', min: 0, max: 23, help: 'Rappel de cotisation et de commande à régler.' },
      { key: 'unpaidReminderDelayDays', label: 'Délai avant de relancer une commande (jours)', kind: 'number', min: 1, max: 90 },
      { key: 'emailSignature', label: 'Signature des mails', kind: 'textarea', maxlength: 600, wide: true },
      { key: 'memberWelcomeText', label: 'Texte d’accueil de l’espace adhérent', kind: 'textarea', maxlength: 600, wide: true }
    ]
  },
  {
    section: 'rules',
    title: 'Règles',
    description: 'Les mots et seuils qui décident à la place du bureau.',
    usedIn: 'Éligibilité aux séances individuelles.',
    fields: [
      { key: 'indivEligibilityKeyword', label: 'Mot du type d’adhésion qui ouvre les séances individuelles', kind: 'text', required: true, maxlength: 40, help: 'Cherché, sans tenir compte de la casse, dans le libellé du type d’adhésion (« Adulte compétiteur »).', wide: true }
    ]
  }
];

export function sectionSpec(section: string): SectionSpec | undefined {
  return SECTION_SPECS.find((s) => s.section === section);
}
