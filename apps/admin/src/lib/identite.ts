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

/**
 * Durée pendant laquelle l'identité gardée fait foi, sans rappeler la route.
 *
 * Sans elle, chaque chargement de page faisait un appel — cent-trois mesurés sur une
 * session de navigation. C'est l'invocation la moins chère du système, mais c'en est une
 * par page, et depuis que les écrans sont figés elle pèse dans le compte.
 *
 * Cinq minutes, comme l'alerte des dirigeants : des droits changent quelques fois par an,
 * les relire à chaque page est disproportionné. Le prix est qu'un rôle retiré met jusqu'à
 * cinq minutes à disparaître du menu — l'API, elle, refuse immédiatement.
 */
const FRAICHEUR_MS = 5 * 60 * 1000;

interface Gardee {
  identite: Identite;
  /** Horodatage de la réponse, pour savoir si elle vaut encore. */
  t: number;
}

function lireGardee(): Gardee | null {
  try {
    const brut = localStorage.getItem(CLE);
    if (!brut) return null;
    const gardee = JSON.parse(brut) as Gardee | Identite;
    // Forme antérieure, sans horodatage : traitée comme périmée plutôt que rejetée.
    if (!('identite' in gardee)) return { identite: gardee as Identite, t: 0 };
    return gardee;
  } catch {
    // Stockage illisible ou refusé : on attendra le réseau.
    return null;
  }
}

/** Ce que le dernier chargement a rendu, ou rien. Synchrone : sert au premier rendu. */
export function derniereIdentite(): Identite | null {
  return lireGardee()?.identite ?? null;
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

  // Encore fraîche : aucune requête. C'est le cas courant d'une navigation dans l'heure.
  const gardee = lireGardee();
  if (gardee && Date.now() - gardee.t < FRAICHEUR_MS) {
    enCours = Promise.resolve(gardee.identite);
    return enCours;
  }

  enCours = (async () => {
    try {
      const res = await fetch('/admin/api/me');
      if (!res.ok) throw new Error(String(res.status));
      const recue = ((await res.json()) as { data?: Identite }).data;
      if (!recue?.email) throw new Error('identité vide');
      try {
        localStorage.setItem(CLE, JSON.stringify({ identite: recue, t: Date.now() }));
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
