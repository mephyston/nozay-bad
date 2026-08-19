export interface NotifyCaptainInput {
  teamId: number;
  dayNumber: number;
  /** Mot du coach, ajouté au constat. Facultatif. */
  note?: string | null;
}

export interface NotifyCaptainOutput {
  teamName: string;
  /** Destinataires réellement notifiés : capitaine, vice-capitaine, et leurs contacts. */
  recipients: number;
  /**
   * Équipe du dessus, prévenue elle aussi en cas de dépassement de valeur : le règlement
   * fait perdre la rencontre aux deux, et l'arbitrage se fait à deux. `null` sinon.
   */
  counterpartTeamName: string | null;
  counterpartRecipients: number;
  /** Le message envoyé, pour que l'écran montre ce qui est parti. */
  title: string;
  body: string;
  /** Aucune anomalie à signaler : rien n'a été envoyé. */
  skipped: boolean;
}
