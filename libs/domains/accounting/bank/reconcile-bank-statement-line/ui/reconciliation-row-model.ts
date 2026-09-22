import { ArrowLeftRight, Check, HandCoins, Link2, Pencil } from '@lucide/svelte';
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
  /** La ligne peut être le virement d'une adhérente vers son porte-monnaie. */
  adherentePossible: boolean;
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
        ? "Le geste « Virement » l'écrit en deux jambes."
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
    sousTitre: proposition.texte,
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
  onAdherente?: (line: BankStatementLine) => void;
  onOuvrir?: (line: BankStatementLine) => void;
};

/**
 * Ce qu'on peut faire d'une ligne, dans l'ordre.
 *
 * La première est celle qu'un balayage long exécute, et c'est la décision courante :
 * pointer l'écriture qui existe, ou valider la proposition. Toutes sont réversibles —
 * une association se défait — ce qui est la condition pour qu'un geste ample les porte.
 *
 * « Modifier » vient en dernier et ouvre la fiche : c'est le chemin de ce qui ne se
 * décide pas d'un geste.
 */
export function gestesDeLigne(
  line: BankStatementLine,
  etat: EtatDeLigne,
  gestes: GestesDeLigne
): SwipeAction<BankStatementLine>[] {
  if (etat.isClosed) return [];

  const liste: SwipeAction<BankStatementLine>[] = [];
  const enAttente = line.status === 'pending';

  if (enAttente && etat.ecrituresExistantes.length > 0 && gestes.onPointer) {
    liste.push({ id: 'pointer', label: 'Pointer', icon: Link2, tone: 'primary', run: gestes.onPointer });
  } else if (enAttente && isOneClickValidatable(parseSuggestion(line)) && gestes.onValider) {
    liste.push({ id: 'valider', label: 'Valider', icon: Check, tone: 'primary', run: gestes.onValider });
  }

  if (enAttente && etat.virementPossible && gestes.onVirement) {
    liste.push({ id: 'virement', label: 'Virement', icon: ArrowLeftRight, run: gestes.onVirement });
  }
  if (enAttente && etat.adherentePossible && gestes.onAdherente) {
    liste.push({ id: 'adherente', label: 'Adhérente', icon: HandCoins, run: gestes.onAdherente });
  }
  if (gestes.onOuvrir) {
    liste.push({
      id: 'modifier',
      label: enAttente ? 'Modifier' : 'Voir le détail',
      icon: Pencil,
      run: gestes.onOuvrir
    });
  }
  return liste;
}
