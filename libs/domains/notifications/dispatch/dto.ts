export interface DispatchInput {
  /**
   * Nombre maximal d'envois par invocation. Chaque envoi est une sous-requête ;
   * le plafond du plan gratuit est de 50 par invocation de Worker.
   */
  limit?: number;
}

export interface DispatchOutput {
  sent: number;
  failed: number;
  /** Abonnements supprimés car révoqués par le service de push (404/410). */
  pruned: number;
  /** Livraisons encore en attente après ce lot. */
  remaining: number;
}
