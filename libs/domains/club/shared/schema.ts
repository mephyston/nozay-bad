import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

/**
 * L'identité du club.
 *
 * Tout ce qui, jusqu'ici, était écrit en dur dans le code parce qu'il n'y avait qu'un
 * club : son nom et son sigle, son adresse, ses mentions légales, ses coordonnées
 * bancaires, les préfixes de ses équipes et de ses factures, sa charte graphique.
 * Une ligne, `id = 1`, comme `attestation_config` et `cms_site_settings` — la table
 * est un formulaire, pas une collection.
 *
 * Colonnes explicites plutôt qu'un document JSON : chaque champ a un écran, un
 * validateur et des lecteurs nommés (les PDF lisent les mentions légales, les mails
 * l'expéditeur, le site le slogan), et `check-schema-integrity.js` doit les voir.
 *
 * Les adresses des trois applications n'y sont **pas** : elles changent d'un
 * environnement à l'autre (staging, production), ce ne sont pas des données du club
 * mais du déploiement — elles restent des variables de `wrangler.json`.
 */
export const clubSettingsTable = sqliteTable('club_settings', {
  id: integer('id').primaryKey(),

  // — Identité —
  /** Dénomination complète, telle qu'elle figure aux statuts. */
  name: text('name').notNull(),
  /** Sigle usuel (« NBA 91 »), pour les titres et les endroits où le nom complet ne tient pas. */
  shortName: text('short_name').notNull(),
  /** Identifiant technique, minuscules et tirets : futur sous-domaine du club. */
  slug: text('slug').notNull(),
  tagline: text('tagline').notNull().default(''),
  city: text('city').notNull(),
  postalCode: text('postal_code').notNull(),
  /** Numéro du département (« 91 »), pour les libellés et les données structurées. */
  department: text('department').notNull(),
  /** Nom du département ou de la région en toutes lettres (« Essonne »). */
  region: text('region').notNull(),
  /** Adresse postale, une ligne par ligne. */
  addressLines: text('address_lines').notNull().default(''),

  // — Contacts —
  contactEmail: text('contact_email').notNull(),
  treasurerEmail: text('treasurer_email').notNull(),
  presidentEmail: text('president_email').notNull(),
  /** Nom affiché comme expéditeur des mails. */
  senderName: text('sender_name').notNull(),
  /** Page de prise de licence du club sur MyFFBaD. */
  ffbadMembershipUrl: text('ffbad_membership_url').notNull().default(''),

  // — Mentions légales —
  legalSeat: text('legal_seat').notNull().default(''),
  rna: text('rna').notNull().default(''),
  siret: text('siret').notNull().default(''),
  ddjsApproval: text('ddjs_approval').notNull().default(''),
  ffbadAffiliation: text('ffbad_affiliation').notNull().default(''),

  // — Banque —
  bankHolder: text('bank_holder').notNull().default(''),
  bankName: text('bank_name').notNull().default(''),
  iban: text('iban').notNull().default(''),
  bic: text('bic').notNull().default(''),

  // — Compétition et comptabilité —
  /** Préfixe des noms d'équipe (« NBA91 » → « NBA91-1 »). */
  teamPrefix: text('team_prefix').notNull(),
  /** Préfixe des numéros de facture (« FAC-25-26-NBA91-001 »). */
  invoicePrefix: text('invoice_prefix').notNull(),
  /** Comité départemental (« CD91 »). */
  championshipCommittee: text('championship_committee').notNull().default(''),
  /** Ligue régionale (« LIFB »). */
  league: text('league').notNull().default(''),

  // — Marque et documents —
  /** Couleur de la marque, hexadécimale (« #23B8E9 »), pour les PDF et le manifeste PWA. */
  brandColor: text('brand_color').notNull(),
  /** Clés R2 des images, `null` tant que rien n'a été déposé. */
  logoKey: text('logo_key'),
  letterheadHeaderKey: text('letterhead_header_key'),
  letterheadFooterKey: text('letterhead_footer_key'),
  stampKey: text('stamp_key'),
  /** Logos des partenaires imprimés en bas des documents : tableau JSON de clés R2. */
  partnerLogoKeys: text('partner_logo_keys').notNull().default('[]'),

  // — Envois —
  /** Fuseau horaire IANA du club ; les crons tournent en UTC. */
  timezone: text('timezone').notNull().default('Europe/Paris'),
  /** Heure locale (0-23) des envois quotidiens. */
  dailySendHour: integer('daily_send_hour').notNull().default(8),
  /** Jour des envois hebdomadaires, en trois lettres (« MON »). */
  weeklySendDay: text('weekly_send_day').notNull().default('MON'),
  /** Heure locale (0-23) des envois hebdomadaires. */
  weeklySendHour: integer('weekly_send_hour').notNull().default(9),
  /** Délai, en jours, avant de rappeler une commande boutique non réglée. */
  unpaidReminderDelayDays: integer('unpaid_reminder_delay_days').notNull().default(7),
  /** Signature ajoutée en bas des mails envoyés aux adhérents. */
  emailSignature: text('email_signature').notNull().default(''),
  /** Texte d'accueil de l'espace adhérent. */
  memberWelcomeText: text('member_welcome_text').notNull().default(''),

  // — Règles —
  /** Mot cherché dans le libellé du type d'adhésion pour ouvrir les séances individuelles. */
  indivEligibilityKeyword: text('indiv_eligibility_keyword').notNull().default('compétiteur'),

  updatedByEmail: text('updated_by_email'),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
});

/**
 * Ce que le club a éteint.
 *
 * Une ligne par fonctionnalité réglée ; une clé absente vaut « allumée » (voir
 * `effectiveFeatures`). La nomenclature vit dans `features.ts`, pas ici : la colonne
 * `feature` est du texte libre pour la base, mais l'API n'y écrit que le catalogue.
 */
export const clubFeaturesTable = sqliteTable('club_features', {
  feature: text('feature').primaryKey(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  updatedByEmail: text('updated_by_email'),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
});

export type ClubSettingsRow = typeof clubSettingsTable.$inferSelect;
export type ClubFeatureRow = typeof clubFeaturesTable.$inferSelect;
