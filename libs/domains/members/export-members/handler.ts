import { type Db } from '@nba/db';
import { listMembers } from '../list-members/handler';
import type { ListMembersFilters } from '../list-members/dto';
import { membershipStatusLabel } from '../shared/membership-status';

/**
 * Les adresses mail des adhérents, en CSV, aux mêmes critères que la liste.
 *
 * Seule l'adresse de l'adhérent y figure — pas celles des parents, qui servent aux
 * envois du club (voir `getContactEmailsForMembers`) et non à un fichier qu'on ouvre
 * dans un tableur. Un adhérent sans adresse n'y figure pas : le fichier sert à écrire,
 * pas à contrôler le fichier.
 *
 * Conventions du tableur français, comme le journal comptable : `;` en séparateur,
 * guillemets doublés, et l'indicateur d'ordre des octets en tête, sans lequel Excel
 * lit les accents de travers.
 */

/** Plafond de la liste (`list-members/route.ts`) : au-delà, ce ne serait plus un club. */
const LIMITE = 5000;

export interface MembersEmailsExport {
  data: Uint8Array;
  filename: string;
}

const cellule = (valeur: string | null | undefined) => `"${(valeur ?? '').replace(/"/g, '""')}"`;

export function membersEmailsCsv(
  members: { lastName: string; firstName: string; licence: string; status: string; email: string | null }[]
): string {
  const lignes = ['Nom;Prénom;Licence;Statut;Email'];
  for (const m of members) {
    const email = m.email?.trim();
    if (!email) continue;
    lignes.push([cellule(m.lastName), cellule(m.firstName), cellule(m.licence), cellule(membershipStatusLabel(m.status)), cellule(email)].join(';'));
  }
  return lignes.join('\n') + '\n';
}

export async function exportMembersEmails(db: Db, filters: ListMembersFilters): Promise<MembersEmailsExport> {
  const { data } = await listMembers(db, filters, { page: 1, limit: LIMITE });
  const csv = new TextEncoder().encode(membersEmailsCsv(data));
  const bom = new Uint8Array([0xef, 0xbb, 0xbf]);
  const bytes = new Uint8Array(bom.length + csv.length);
  bytes.set(bom, 0);
  bytes.set(csv, bom.length);
  const suffixe = filters.status ? `-${filters.status}` : '';
  return { data: bytes, filename: `adherents-emails-${filters.season ?? 'toutes-saisons'}${suffixe}.csv` };
}
