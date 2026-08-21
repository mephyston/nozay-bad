import { type DbOrTx } from '@nba/db';
import { getMemberLastPaymentTransaction, getSeasonById } from '@nba/accounting-api';
import { getMemberById, type MemberSummary } from '../shared/queries';

export class MemberCseDataRepository {
  /**
   * L'attestation imprime l'identité de la **personne** et le montant de l'**adhésion** :
   * la lecture jointe de `shared/queries` rend exactement les deux, il n'y a pas de
   * seconde requête à écrire ici.
   */
  async getById(db: DbOrTx, id: number): Promise<MemberSummary | undefined> {
    return getMemberById(db, id);
  }

  async getLastPaymentTransaction(db: DbOrTx, memberId: number): Promise<{ paymentMethod: string; date: string } | undefined> {
    return getMemberLastPaymentTransaction(db, memberId);
  }

  // Résolution de la saison via la fonction publique du domaine accounting
  // (pas de SQL cross-domaine : accounting possède la table `seasons`).
  async getSeasonCode(db: DbOrTx, seasonId: number): Promise<string | undefined> {
    const season = await getSeasonById(db, seasonId);
    return season?.code;
  }
}
