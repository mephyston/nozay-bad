import { ArrowLeftRight, Check, Link2, SquarePen } from '@lucide/svelte';
import { formatAmount, type SwipeAction, type Tone } from '@nba/ui';
import { accrualLabel } from '../../../shared/accrual-labels';
import { isOneClickValidatable, parseSuggestion } from './reconciliation-suggestion';
import type { BankStatementLine } from './reconciliation.svelte';

/**
 * Le vocabulaire de la file de rapprochement.
 *
 * Une ligne de relevé n'est pas un enregistrement qu'on consulte : c'est une décision
 * en attente, et elle se lit comme telle — le fait bancaire d'un côté, ce qu'on propose
 * d'en faire de l'autre. Ce module dit la seconde moitié, qui vivait jusqu'ici dans une
 * cascade de `{#if}` au milieu du markup, donc introuvable et intestable.
 */

export type EtatDeLigne = {
  /** Une écriture existante attend d'être pointée : on pointe, on ne crée pas. */
  ecrituresExistantes: { date: string; description: string }[];
  /** La ligne peut s'écrire en virement entre deux comptes du club. */
  virementPossible: boolean;
  /** La nature que l'écran présélectionnera, en étiquette ; rien sans proposition. */
  etiquette?: string | null;
  categories: { id: string; name: string }[];
  isClosed: boolean;
};

export const montantCents = (line: BankStatementLine): number =>
  (line as { amountCents?: number }).amountCents ?? line.amount ?? 0;

/**
 * Ce qu'on propose de faire de cette ligne, en une phrase.
 *
 * L'ordre des cas n'est pas indifférent. **L'écriture existante passe avant tout le
 * reste** : si les livres portent déjà l'opération, la rapprocher consiste à pointer,
 * jamais à créer — proposer « Valider » sur une telle ligne produit un doublon de
 * recette que le rapprochement ne signale même pas.
 */
export function propositionDe(
  line: BankStatementLine,
  etat: EtatDeLigne
): { texte: string; precision?: string; ton: Tone } {
  if (line.status === 'reconciled') {
    return { texte: 'Rapprochée', ton: 'success' };
  }

  const nb = etat.ecrituresExistantes.length;
  if (nb > 0) {
    const premiere = etat.ecrituresExistantes[0];
    return {
      texte: nb === 1 ? 'Une écriture existante correspond' : `${nb} écritures existantes correspondent`,
      precision: `${premiere.date} · ${premiere.description}`,
      ton: 'success'
    };
  }

  const sug = parseSuggestion(line);
  if (sug?.kind === 'internal-transfer') {
    return {
      texte: 'Virement interne',
      precision: etat.virementPossible
        ? 'Deux écritures, une par compte : rien ne pèse sur le résultat.'
        : 'À saisir au grand livre, en deux jambes.',
      ton: 'primary'
    };
  }

  if (sug) {
    const categorie =
      sug.category != null
        ? (etat.categories.find((c) => c.id === String(sug.category))?.name ?? 'Catégorie à choisir')
        : 'Catégorie à choisir';
    const qui = sug.memberName || (sug.memberId ? `Adhérent #${sug.memberId}` : null);
    const cutoff =
      sug.accrualType && sug.accrualType !== 'normal'
        ? `${accrualLabel(sug.accrualType)}${sug.targetSeason ? ` — ${sug.targetSeason}` : ''}`
        : null;
    return {
      texte: categorie,
      precision: [qui, cutoff].filter(Boolean).join(' · ') || undefined,
      ton: 'primary'
    };
  }

  // Sans analyse, une nature peut venir du montant seul : une facture impayée qui tombe juste.
  if (etat.etiquette) {
    return { texte: etat.etiquette, precision: "Proposée d'après le montant", ton: 'primary' };
  }

  return { texte: 'Aucune proposition — à saisir', ton: 'muted' };
}

export type LigneDeReleve = {
  titre: string;
  sousTitre: string;
  precision?: string;
  valeur: string;
  ton: Tone;
  legende: string;
};

/**
 * Projection d'une ligne de relevé en rangée de liste.
 *
 * Le libellé de la banque identifie, la proposition occupe le sous-titre — c'est sur
 * elle qu'on tranche —, le montant est la valeur de droite et la date sa légende. Le
 * mémo, le compte et la référence bancaire vivent sur la fiche de décision : tronqués
 * sur une rangée, ils ne permettaient de vérifier quoi que ce soit.
 */
export function ligneDeReleve(line: BankStatementLine, etat: EtatDeLigne): LigneDeReleve {
  const cents = montantCents(line);
  const proposition = propositionDe(line, etat);
  return {
    titre: line.name,
    // L'étiquette dit la nature que « Traiter » présélectionnera ; le texte, ce qu'elle porte.
    sousTitre:
      etat.etiquette && etat.etiquette !== proposition.texte ? `${etat.etiquette} · ${proposition.texte}` : proposition.texte,
    precision: proposition.precision,
    valeur: formatAmount(cents, { showSign: true }),
    ton: cents < 0 ? 'destructive' : cents > 0 ? 'success' : 'muted',
    legende: line.date
  };
}

/** Les gestes qu'une ligne accepte, déclarés en données. */
export type GestesDeLigne = {
  onValider?: (line: BankStatementLine) => void;
  onPointer?: (line: BankStatementLine) => void;
  onVirement?: (line: BankStatementLine) => void;
  onOuvrir?: (line: BankStatementLine) => void;
};

/**
 * Ce qu'on peut faire d'une ligne, dans l'ordre : au plus le geste proposé, puis « Traiter ».
 *
 * Le premier est celui qu'un balayage long exécute, et c'est la décision courante : pointer
 * l'écriture qui existe, ouvrir le virement que l'analyse a reconnu, ou valider la proposition.
 * Toutes sont réversibles — une association se défait — ce qui est la condition pour qu'un geste
 * ample les porte.
 *
 * « Virement » et « Adhérente » s'offraient sur chaque ligne qui pouvait l'être, soit presque
 * toutes : quatre gestes au balayage, dont deux rares. Ils vivent désormais dans le choix de la
 * nature, que « Traiter » ouvre.
 */
export function gestesDeLigne(
  line: BankStatementLine,
  etat: EtatDeLigne,
  gestes: GestesDeLigne
): SwipeAction<BankStatementLine>[] {
  if (etat.isClosed) return [];

  const liste: SwipeAction<BankStatementLine>[] = [];
  const enAttente = line.status === 'pending';
  const sug = parseSuggestion(line);

  if (enAttente && etat.ecrituresExistantes.length > 0 && gestes.onPointer) {
    liste.push({ id: 'pointer', label: 'Pointer', icon: Link2, tone: 'primary', run: gestes.onPointer });
  } else if (enAttente && sug?.kind === 'internal-transfer' && etat.virementPossible && gestes.onVirement) {
    liste.push({ id: 'virement', label: 'Virement', icon: ArrowLeftRight, tone: 'primary', run: gestes.onVirement });
  } else if (enAttente && isOneClickValidatable(sug) && gestes.onValider) {
    liste.push({ id: 'valider', label: 'Valider', icon: Check, tone: 'primary', run: gestes.onValider });
  }

  if (gestes.onOuvrir) {
    liste.push({
      id: 'traiter',
      label: enAttente ? 'Traiter' : 'Voir le détail',
      icon: SquarePen,
      run: gestes.onOuvrir
    });
  }
  return liste;
}
