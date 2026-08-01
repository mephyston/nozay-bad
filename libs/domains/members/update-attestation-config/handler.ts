import { type Db } from '@nba/db';
import { AttestationConfigRepository } from '../shared/attestation/repository';

export type UpdateAttestationConfigInput = {
  signatoryName: string;
  signatoryEmail: string;
  websiteUrl: string;
};

export async function updateAttestationConfig(db: Db, input: UpdateAttestationConfigInput): Promise<void> {
  await new AttestationConfigRepository().updateInfo(db, {
    signatoryName: input.signatoryName.trim(),
    signatoryEmail: input.signatoryEmail.trim(),
    websiteUrl: input.websiteUrl.trim()
  });
}
