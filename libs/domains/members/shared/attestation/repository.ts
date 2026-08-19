import { eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { attestationConfigTable } from '@nba/members/schema';
import { AttestationConfig, DEFAULT_ATTESTATION_CONFIG } from './config';

const SINGLETON_ID = 1;

type ConfigInfo = Pick<AttestationConfig, 'signatoryName' | 'signatoryEmail' | 'websiteUrl'>;

export class AttestationConfigRepository {
  getRow(db: DbOrTx) {
    return db.select().from(attestationConfigTable).where(eq(attestationConfigTable.id, SINGLETON_ID)).get();
  }

  /** Upsert de l'identité du signataire (laisse la signature inchangée). */
  async updateInfo(db: DbOrTx, info: ConfigInfo): Promise<void> {
    await db
      .insert(attestationConfigTable)
      .values({ id: SINGLETON_ID, ...info, updatedAt: new Date() })
      .onConflictDoUpdate({ target: attestationConfigTable.id, set: { ...info, updatedAt: new Date() } });
  }

  /** Upsert de la seule signature (base64 JPEG). */
  async updateSignature(db: DbOrTx, signatureBase64: string): Promise<void> {
    await db
      .insert(attestationConfigTable)
      .values({ id: SINGLETON_ID, signatureBase64, updatedAt: new Date() })
      .onConflictDoUpdate({ target: attestationConfigTable.id, set: { signatureBase64, updatedAt: new Date() } });
  }
}

/** Config effective : la ligne en base fusionnée sur les valeurs par défaut. */
export async function getEffectiveConfig(db: DbOrTx): Promise<AttestationConfig> {
  const row = await new AttestationConfigRepository().getRow(db);
  if (!row) {
    return { ...DEFAULT_ATTESTATION_CONFIG, signatureBase64: null };
  }
  return {
    signatoryName: row.signatoryName,
    signatoryEmail: row.signatoryEmail,
    websiteUrl: row.websiteUrl,
    signatureBase64: row.signatureBase64 ?? null
  };
}
