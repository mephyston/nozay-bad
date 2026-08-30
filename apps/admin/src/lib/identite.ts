/**
 * L'identité de la personne connectée, côté navigateur.
 *
 * Mutualisée : `AdminLayout` en a besoin pour filtrer le menu, et les écrans figés qui
 * masquent une entrée selon les droits en ont besoin aussi. Sans ce cache partagé, chaque
 * consommateur ferait son propre appel — deux ou trois par page.
 *
 * Le dernier état connu est gardé dans `localStorage` : il permet d'afficher quelque chose
 * de juste dès le premier pinceau, sans attendre le réseau. Il peut être périmé — un
 * compte dont les droits viennent d'être retirés verrait brièvement une entrée de trop, et
 * se ferait refuser à l'ouverture. L'API reste l'autorité ; ici on ne fait qu'afficher.
 */

export interface Identite {
  email: string;
  name?: string | null;
  permissions: string[];
  realEmail: string;
}

const CLE = 'admin_identite';
const VIDE: Identite = { email: '', name: undefined, permissions: [], realEmail: '' };

/** Ce que le dernier chargement a rendu, ou rien. Synchrone : sert au premier rendu. */
export function derniereIdentite(): Identite | null {
  try {
    const brut = localStorage.getItem(CLE);
    return brut ? (JSON.parse(brut) as Identite) : null;
  } catch {
    // Stockage illisible ou refusé : on attendra le réseau.
    return null;
  }
}

/**
 * Une seule requête par chargement de page, quel que soit le nombre d'appelants.
 *
 * La promesse est mémorisée : deux composants qui la demandent au même moment partagent
 * le même appel. Elle n'est pas invalidée — un rechargement de page en refait une, ce qui
 * est le bon rythme pour une donnée qui ne change qu'à l'attribution d'un rôle.
 */
let enCours: Promise<Identite> | null = null;

export function chargerIdentite(): Promise<Identite> {
  if (enCours) return enCours;
  enCours = (async () => {
    try {
      const res = await fetch('/admin/api/me');
      if (!res.ok) throw new Error(String(res.status));
      const recue = ((await res.json()) as { data?: Identite }).data;
      if (!recue?.email) throw new Error('identité vide');
      try {
        localStorage.setItem(CLE, JSON.stringify(recue));
      } catch {
        /* Sans stockage, le prochain chargement refera simplement la requête. */
      }
      return recue;
    } catch {
      /*
        Indisponible : on rend ce qu'on sait déjà plutôt que rien. Perdre son menu parce
        que le réseau a hoqueté serait pire que de l'afficher un instant de trop.
      */
      return derniereIdentite() ?? VIDE;
    }
  })();
  return enCours;
}
