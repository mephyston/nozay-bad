import { type Db } from '@nba/db';
import { getContactEmailsForMember, type MemberSummary } from '@nba/members-api';
import { normalizeLicence } from './ranking';

export interface StaffContactsResult {
  emails: string[];
  names: string[];
}

/** Annuaire du staff : licences normalisées, adresses de contact, nom affichable. */
export async function staffContacts(
  db: Db,
  byLicence: Map<string, MemberSummary>,
  licences: Array<string | null>
): Promise<StaffContactsResult> {
  const emails = new Set<string>();
  const names: string[] = [];
  for (const raw of licences) {
    if (!raw) continue;
    const member = byLicence.get(normalizeLicence(raw));
    if (!member) continue;
    names.push(`${member.firstName} ${member.lastName}`.trim());
    for (const email of await getContactEmailsForMember(db, member.id)) emails.add(email);
  }
  return { emails: [...emails], names };
}
