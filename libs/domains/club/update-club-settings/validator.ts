import { Type, type TSchema } from '@sinclair/typebox';
import type { SettingsSection } from '../shared/settings';

const Line = (max = 200) => Type.String({ maxLength: max });
const Required = (max = 200) => Type.String({ minLength: 1, maxLength: max });
const Email = Type.String({ maxLength: 200, pattern: '^$|^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$' });
const Hour = Type.Integer({ minimum: 0, maximum: 23 });

/**
 * Un schéma par section : le corps d'une écriture ne peut porter que les champs de
 * son écran, et rien d'une autre section.
 *
 * Les formats bancaires et administratifs sont vérifiés sur la forme, espaces
 * ôtés : un IBAN se saisit par groupes de quatre, un SIRET par blocs de trois.
 * La clé de contrôle de l'IBAN est vérifiée dans le handler, la validation par
 * schéma ne sachant pas calculer.
 */
export const SECTION_SCHEMAS: Record<SettingsSection, TSchema> = {
  identity: Type.Object({
    name: Required(160),
    shortName: Required(40),
    tagline: Line(160),
    city: Required(100),
    postalCode: Type.String({ pattern: '^[0-9A-Za-z]{2,10}$' }),
    department: Type.String({ pattern: '^[0-9A-Za-z]{1,3}$' }),
    region: Required(100),
    addressLines: Line(400)
  }),
  contacts: Type.Object({
    contactEmail: Email,
    treasurerEmail: Email,
    presidentEmail: Email,
    senderName: Required(120),
    ffbadMembershipUrl: Type.String({ maxLength: 300, pattern: '^$|^https://' })
  }),
  legal: Type.Object({
    legalSeat: Line(300),
    rna: Type.String({ pattern: '^$|^W?[0-9A-Za-z]{9,10}$' }),
    siret: Type.String({ pattern: '^$|^[0-9 ]{14,17}$' }),
    ddjsApproval: Line(60),
    ffbadAffiliation: Line(60)
  }),
  bank: Type.Object({
    bankHolder: Line(120),
    bankName: Line(120),
    iban: Type.String({ pattern: '^$|^[A-Za-z]{2}[0-9]{2}[A-Za-z0-9 ]{10,40}$' }),
    bic: Type.String({ pattern: '^$|^[A-Za-z]{6}[A-Za-z0-9]{2}([A-Za-z0-9]{3})?$' })
  }),
  competition: Type.Object({
    teamPrefix: Type.String({ pattern: '^[A-Z0-9]{2,12}$' }),
    invoicePrefix: Type.String({ pattern: '^[A-Z0-9]{2,12}$' }),
    championshipCommittee: Line(40),
    league: Line(40)
  }),
  branding: Type.Object({
    brandColor: Type.String({ pattern: '^#[0-9A-Fa-f]{6}$' })
  }),
  sending: Type.Object({
    timezone: Type.String({ minLength: 1, maxLength: 60 }),
    dailySendHour: Hour,
    weeklySendDay: Type.Union(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((d) => Type.Literal(d))),
    weeklySendHour: Hour,
    unpaidReminderDelayDays: Type.Integer({ minimum: 1, maximum: 90 }),
    emailSignature: Line(600),
    memberWelcomeText: Line(600)
  }),
  rules: Type.Object({
    indivEligibilityKeyword: Required(40)
  })
};
