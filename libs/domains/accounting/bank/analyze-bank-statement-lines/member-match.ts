/**
 * Choix de l'adhérent désigné par un libellé bancaire.
 *
 * Au club, le parent paie pour son enfant : son nom figure sur presque tous les virements,
 * et c'est pour cela que `parent1_name` sert d'indice de rattachement. Mais un parent est
 * souvent adhérent lui-même — et quand il règle **sa** licence, deux adhérents portent
 * alors la même trace dans le texte : lui, par son nom ; son enfant, par le nom de son
 * parent. Les départager par l'ordre des lignes en base revient à tirer à pile ou face.
 *
 * D'où la règle : le nom propre de l'adhérent l'emporte sur celui d'un parent. Et lorsqu'un
 * seul adhérent est nommé de la sorte, la désignation n'est plus une hypothèse — elle est
 * lue, pas devinée.
 */
import { cleanName } from '../../shared/helpers';

/** Le terme apparaît-il comme un mot entier ? « marc » ne doit pas se lire dans « marcel ». */
export function includesWord(text: string, term: string): boolean {
  if (!term) return false;
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`).test(text);
}

export interface MemberCandidate {
  id: number;
  firstName: string | null;
  lastName: string | null;
  parent1Name?: string | null;
  parent2Name?: string | null;
}

export interface MemberMatch<T> {
  /** Le meilleur candidat, ou `null` si le texte n'en nomme aucun. */
  candidate: T | null;
  /**
   * Un seul adhérent est nommé par ses **propres** prénom et nom.
   *
   * Le rattachement cesse alors d'être une suggestion : on le maintient même si le modèle
   * propose autre chose, comme on maintient le rattachement d'exercice. Deux adhérents
   * nommés (« virement de Sylvain, motif : cotisation de Morgane ») rendent la main au
   * modèle, qui lit le motif mieux qu'une règle.
   */
  certain: T | null;
}

export function pickMemberCandidate<T extends MemberCandidate>(candidates: T[], text: string): MemberMatch<T> {
  const byOwnName = candidates.filter((m) => {
    const first = cleanName(m.firstName);
    const last = cleanName(m.lastName);
    return first !== '' && last !== '' && includesWord(text, first) && includesWord(text, last);
  });

  const byParentName = candidates.filter((m) => {
    const p1 = cleanName(m.parent1Name);
    const p2 = cleanName(m.parent2Name);
    return (p1 !== '' && includesWord(text, p1)) || (p2 !== '' && includesWord(text, p2));
  });

  return {
    candidate: byOwnName[0] ?? byParentName[0] ?? null,
    certain: byOwnName.length === 1 ? byOwnName[0] : null
  };
}
