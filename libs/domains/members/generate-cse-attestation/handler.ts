import { type Db } from '@nba/db';
import { getMemberCseData } from '../get-member-cse-data/handler';
import { getEffectiveConfig } from '../shared/attestation/repository';
import { generateCseAttestationPdf } from '../shared/attestation/generate-pdf';
import { formatSeason } from '../shared/attestation/format';

export type GenerateCseAttestationOutput = {
  pdf: Uint8Array;
  filename: string;
};

/** Nom de fichier sûr (ASCII, sans caractères problématiques pour Content-Disposition). */
function safeFilename(firstName: string, lastName: string, season: string): string {
  const base = `Attestation CSE ${lastName} ${firstName} ${season}`
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9 -]/g, '')
    .trim()
    .replace(/\s+/g, '-');
  return `${base}.pdf`;
}

export async function generateCseAttestation(db: Db, id: number): Promise<GenerateCseAttestationOutput> {
  // Réutilise la logique existante : lève MemberNotFoundError / MemberNothingPaidError.
  const data = await getMemberCseData(db, id);
  const config = await getEffectiveConfig(db);
  const pdf = await generateCseAttestationPdf(data, config);
  return {
    pdf,
    filename: safeFilename(data.firstName, data.lastName, formatSeason(data.season))
  };
}
