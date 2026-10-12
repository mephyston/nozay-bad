import { parseSuggestion } from './reconciliation-suggestion';
import type { BankStatementLine } from './reconciliation-types';

/**
 * « Qu'est-ce que cette ligne ? » — la seule question que pose le rapprochement.
 *
 * Six façons de traiter une ligne vivaient à six endroits : deux onglets, un bloc replié en
 * haut de l'un d'eux, un interrupteur au milieu du formulaire, et deux boutons sur chaque ligne
 * de la file qui ouvraient chacun leur dialogue. Le bouton « Adhérente » s'affichait sur toutes
 * les lignes au crédit pour un geste rare, sans dire à quoi il servait. Chaque façon est
 * désormais une **nature**, choisie en tête du panneau ; le formulaire qui suit en dépend.
 *
 * La recette et la dépense sont une même nature, la saisie : c'est le sens de la ligne qui la
 * nomme. Le remboursement est à part — une sortie qui diminue une recette, sans charge —, et
 * non un interrupteur caché dans la saisie.
 */
export type NatureDeLigne = 'saisie' | 'pointer' | 'facture' | 'remboursement' | 'virement' | 'avance';

/** Ce que l'écran sait d'une ligne pour en choisir la nature. */
export type ContexteDeNature = {
  /** Les écritures déjà saisies qui correspondent à la ligne. */
  ecrituresExistantes: number;
  /** Factures impayées de l'exercice, et celles qui tombent au montant exact. */
  facturesImpayees: number;
  facturesAuMontant: number;
  virementPossible: boolean;
  avancePossible: boolean;
};

export type OptionDeNature = {
  nature: NatureDeLigne;
  label: string;
  description: string;
  proposee: boolean;
};

const centsDe = (line: BankStatementLine): number =>
  (line as { amountCents?: number }).amountCents ?? line.amount ?? 0;

/**
 * La nature que l'écran présélectionne.
 *
 * L'écriture existante passe avant tout : si les livres portent déjà l'opération, la rapprocher
 * consiste à pointer, jamais à créer — une création ferait un doublon que le rapprochement ne
 * signale pas. Viennent ensuite le virement reconnu par l'analyse, puis la facture au montant.
 */
export function natureProposee(line: BankStatementLine, ctx: ContexteDeNature): NatureDeLigne {
  if (ctx.ecrituresExistantes > 0) return 'pointer';
  if (parseSuggestion(line)?.kind === 'internal-transfer' && ctx.virementPossible) return 'virement';
  if (centsDe(line) > 0 && ctx.facturesAuMontant > 0) return 'facture';
  return 'saisie';
}

/** Les natures qu'une ligne admet, dans l'ordre où elles s'affichent. */
export function naturesDeLigne(line: BankStatementLine, ctx: ContexteDeNature): OptionDeNature[] {
  const credit = centsDe(line) >= 0;
  const proposee = natureProposee(line, ctx);
  const options: Omit<OptionDeNature, 'proposee'>[] = [
    credit
      ? { nature: 'saisie', label: 'Recette', description: 'Une entrée à imputer à une catégorie, ventilable.' }
      : { nature: 'saisie', label: 'Dépense', description: 'Une sortie à imputer à une catégorie, ventilable.' },
    {
      nature: 'pointer',
      label: ctx.ecrituresExistantes > 0 ? `Déjà saisie (${ctx.ecrituresExistantes})` : 'Déjà saisie',
      description: 'Déjà dans les livres : chèque, commande, note de frais…'
    }
  ];
  if (credit && ctx.facturesImpayees > 0) {
    options.push({ nature: 'facture', label: 'Règlement de facture', description: "Le paiement d'une facture émise par le club." });
  }
  if (!credit) {
    options.push({
      nature: 'remboursement',
      label: "Remboursement d'une recette",
      description: "De l'argent rendu : la recette diminue, aucune charge n'est créée."
    });
  }
  if (ctx.virementPossible) {
    options.push({
      nature: 'virement',
      label: 'Virement entre nos comptes',
      description: "De l'argent qui passe d'un compte du club à un autre. Hors résultat."
    });
  }
  if (credit && ctx.avancePossible) {
    options.push({
      nature: 'avance',
      label: "Avance d'un adhérent",
      description: "Il a viré pour son porte-monnaie : l'argent lui reste dû, ce n'est pas une recette."
    });
  }
  return options.map((o) => ({ ...o, proposee: o.nature === proposee }));
}

/** L'intitulé du bouton qui enregistre : il dit ce qu'il fait. */
export function libelleDEnregistrement(nature: NatureDeLigne, line: BankStatementLine, ventilee = false): string {
  if (ventilee) return 'Enregistrer la ventilation';
  switch (nature) {
    case 'saisie':
      return centsDe(line) < 0 ? 'Enregistrer la dépense' : 'Enregistrer la recette';
    case 'facture':
      return 'Enregistrer le règlement';
    case 'remboursement':
      return 'Enregistrer le remboursement';
    case 'virement':
      return 'Enregistrer le virement';
    case 'avance':
      return "Enregistrer l'avance";
    case 'pointer':
      return 'Associer';
  }
}

/** Les natures qui s'enregistrent par le formulaire de saisie. */
export const parLeFormulaire = (nature: NatureDeLigne): boolean =>
  nature === 'saisie' || nature === 'facture' || nature === 'remboursement';

/**
 * L'étiquette de la proposition, sur la ligne de la file : la nature qu'on présélectionnera.
 *
 * Rien quand il n'y a rien à proposer — une saisie sans suggestion n'est pas une proposition,
 * et l'étiquette « Recette » sur chaque ligne sans analyse ne dirait que le sens du montant.
 */
export function etiquetteDeProposition(line: BankStatementLine, ctx: ContexteDeNature): string | null {
  if (line.status !== 'pending') return null;
  const nature = natureProposee(line, ctx);
  if (nature === 'saisie' && !parseSuggestion(line)) return null;
  const option = naturesDeLigne(line, ctx).find((o) => o.nature === nature);
  return option ? option.label.replace(/ \(\d+\)$/, '') : null;
}
