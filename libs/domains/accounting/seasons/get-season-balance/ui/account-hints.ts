/**
 * Ce que le formulaire explique, selon le compte et le geste.
 *
 * Les explications vivaient dans le menu « Nouveau », une par geste métier : il fallait les
 * lire toutes pour choisir. Le menu n'offre plus que recette, dépense et virement ; la phrase
 * qui éclaire le cas s'affiche dans le formulaire, et suit les comptes choisis — choisir la
 * banque comme destination d'un virement depuis Labaz, c'est saisir le remboursement de
 * l'organisme, et c'est ce que l'écran dit.
 */
type Compte = { code: string; label?: string; kind?: string };
type Panneau = 'recette' | 'depense' | 'transfert' | null;

export interface Indication {
  texte: string;
  /** Libellé proposé à un virement dont le trésorier n'a encore rien écrit. */
  libelle?: string;
}

const HORS_RESULTAT = 'Hors résultat : l’argent change de compte, il ne se gagne ni ne se dépense.';

const RECETTES: Record<string, string> = {
  cash: 'Cotisation, buvette, tournoi… payés en espèces. Quand c’est un adhérent qui paie, rattachez-le : c’est ce qui fait apparaître le règlement sur sa fiche.',
  voucher: 'Un paiement validé chez l’organisme (code, QR code ou chèque papier) : datez-le du jour où l’adhérent a payé et rattachez-le. Le remboursement de l’organisme se saisit ensuite en virement vers la banque.',
  wallet: 'Par exemple les inscriptions encaissées pour un tournoi du club : une écriture par tournoi suffit.'
};

const DEPENSES: Record<string, string> = {
  cash: 'Un achat réglé avec les espèces de la caisse.',
  voucher: 'Ce que l’organisme retient (commission) ou ne rembourse pas (code refusé, périmé) : catégorie Frais de fonctionnement.',
  wallet: 'L’inscription d’une équipe à un tournoi, ou la commission prélevée par la plateforme.'
};

function virement(source: Compte | undefined, destination: Compte | undefined): Indication {
  const de = source?.kind;
  const vers = destination?.kind;
  if (de === 'cash' && vers === 'bank') return { texte: `Dépôt des espèces en banque. ${HORS_RESULTAT}`, libelle: 'Dépôt des espèces en banque' };
  if (de === 'bank' && vers === 'cash') return { texte: `Retrait d’espèces pour la caisse. ${HORS_RESULTAT}`, libelle: 'Retrait pour la caisse' };
  if (de === 'wallet' && vers === 'bank') return { texte: `Rapatriement du porte-monnaie vers la banque, après un tournoi du club par exemple. ${HORS_RESULTAT}`, libelle: 'Rapatriement vers la banque' };
  if (de === 'bank' && vers === 'wallet') return { texte: `Recharge du porte-monnaie depuis la banque. ${HORS_RESULTAT}`, libelle: 'Recharge du porte-monnaie' };
  if (de === 'voucher' && vers === 'bank') {
    return { texte: `Le remboursement de l’organisme pour les paiements validés, reçu en banque. ${HORS_RESULTAT}`, libelle: `Remboursement ${source?.label ?? ''}`.trim() };
  }
  return { texte: HORS_RESULTAT };
}

/** L'explication du cas en cours, ou `null` quand il n'y a rien à dire (une recette en banque). */
export function indicationDeSaisie(
  panneau: Panneau,
  compte: Compte,
  sourceCode: string,
  destinationCode: string,
  comptes: Compte[]
): Indication | null {
  const trouver = (code: string) => comptes.find((c) => c.code === code) ?? (code === compte.code ? compte : undefined);
  if (panneau === 'transfert') return virement(trouver(sourceCode), trouver(destinationCode));
  const kind = compte.kind ?? 'bank';
  const texte = panneau === 'recette' ? RECETTES[kind] : panneau === 'depense' ? DEPENSES[kind] : undefined;
  return texte ? { texte } : null;
}
