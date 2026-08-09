import { Value } from '@sinclair/typebox/value';
import { sanitizeRichText, isRichTextEmpty, isSafeHref, CMS_PROFILE } from '@nba/html';
import { BLOCK_SCHEMAS, type BlockPayload, type BlockType, type CtaLinkValue } from './blocks';
import { CmsBlockPayloadError } from './errors';

/**
 * Normalisation d'une charge utile de bloc, côté serveur et faisant autorité.
 *
 * Le schéma TypeBox dit la **forme** ; ce fichier dit ce qui est **acceptable**. La
 * distinction compte : un `href` est une chaîne de moins de 500 caractères dans les
 * deux cas, mais `javascript:alert(1)` ne doit jamais atteindre la base.
 *
 * Rien ici ne fait confiance à l'éditeur : la charge utile arrive d'un navigateur.
 */

/** Identifiant de ressource chez un fournisseur d'intégration : un jeton opaque. */
const RESOURCE_ID = /^[A-Za-z0-9_-]{8,200}$/;

/**
 * Identifiant d'agenda Google : une **adresse**, et non un jeton.
 *
 * `nom@gmail.com` pour un agenda personnel, `…@group.calendar.google.com` pour un
 * agenda partagé. Le contrôle reste grossier — c'est Google qui tranchera — mais il
 * écarte l'erreur réellement commise : coller l'URL d'intégration entière. D'où le
 * refus de la barre oblique, qu'aucun identifiant ne porte et que toute URL porte.
 */
const CALENDAR_ID = /^[^\s@/]+@[^\s@/]+\.[^\s@/]{2,}$/;

/** Adresse électronique, contrôle de forme volontairement grossier. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Retient les liens exploitables et jette les autres.
 *
 * Un lien refusé fait disparaître **l'entrée entière**, et non seulement son URL : un
 * bouton d'appel à l'action sans destination n'a aucun sens, là où un lien dans une
 * phrase peut se contenter de perdre son ancre.
 */
function keepSafeLinks(items: readonly CtaLinkValue[]): CtaLinkValue[] {
  return items.filter((item) => isSafeHref(item.href));
}

/**
 * Valide et assainit une charge utile déjà associée à son type.
 *
 * @param position Rang du bloc dans la page, pour situer l'erreur à l'écran.
 */
export function normaliseBlockPayload(type: BlockType, raw: unknown, position: number): BlockPayload {
  const schema = BLOCK_SCHEMAS[type];
  if (!schema) throw new CmsBlockPayloadError(position, `type de bloc inconnu « ${type} »`);

  // `Clean` avant `Check` : l'éditeur transporte des champs d'état qui ne concernent
  // pas la base (identifiant local, pliage). On les retire plutôt que de refuser
  // l'enregistrement de la page entière.
  const candidate = Value.Clean(schema, { ...(raw as object), type });

  if (!Value.Check(schema, candidate)) {
    const [first] = [...Value.Errors(schema, candidate)];
    const where = first?.path ? `${first.path} — ` : '';
    throw new CmsBlockPayloadError(position, `${where}${first?.message ?? 'charge utile invalide'}`);
  }

  const payload = candidate as BlockPayload;

  switch (payload.type) {
    case 'richtext': {
      const html = sanitizeRichText(payload.html, CMS_PROFILE);
      // Un bloc vide n'est pas une erreur de saisie anodine : il occupe une position,
      // se retrouve dans le rendu, et personne ne comprend pourquoi la page « saute ».
      if (isRichTextEmpty(html, CMS_PROFILE) && !html.includes('<img')) {
        throw new CmsBlockPayloadError(position, 'le texte est vide');
      }
      return { ...payload, html };
    }

    case 'hero':
      return { ...payload, ctas: keepSafeLinks(payload.ctas) };

    case 'cta_grid':
      return { ...payload, items: keepSafeLinks(payload.items) };

    case 'carousel': {
      const slides = payload.slides.map((slide, index) => {
        // Une diapositive est d'abord une image : sans elle il ne reste qu'un trou à
        // la taille d'une carte, que le ruban promènera indéfiniment.
        if (!slide.mediaId) {
          throw new CmsBlockPayloadError(position, `diapositive ${index + 1} : choisissez une image`);
        }
        const title = slide.title.trim();
        if (!title) {
          throw new CmsBlockPayloadError(position, `diapositive ${index + 1} : le titre est vide`);
        }

        // Contrairement à `cta_grid`, un lien inexploitable ne fait pas disparaître
        // l'entrée : la carte garde son image, son titre et sa description, qui
        // valent d'être lus. Seul le bouton tombe — un bouton sans destination, lui,
        // n'a toujours aucun sens.
        const { ctaLabel, ctaHref, ...rest } = slide;
        const label = ctaLabel?.trim();
        const keepCta = !!label && !!ctaHref && isSafeHref(ctaHref);

        return keepCta ? { ...rest, title, ctaLabel: label, ctaHref } : { ...rest, title };
      });
      return { ...payload, slides };
    }

    case 'embed': {
      // La forme attendue dépend du fournisseur : YouTube et Sheets désignent leur
      // ressource par un jeton, Google Agenda par une adresse. Un contrôle unique
      // refusait tout agenda, alors même que l'écran en demandait l'adresse.
      const isCalendar = payload.provider === 'google_calendar';
      const accepted = isCalendar
        ? CALENDAR_ID.test(payload.resourceId)
        : RESOURCE_ID.test(payload.resourceId);

      if (!accepted) {
        throw new CmsBlockPayloadError(
          position,
          isCalendar
            ? "l'identifiant de l'agenda est une adresse, de la forme nom@group.calendar.google.com"
            : "l'identifiant de la ressource n'est pas reconnu — collez l'identifiant, pas l'adresse complète"
        );
      }
      // `fixed` sans hauteur ne peut pas réserver sa place dans la page, donc décale
      // tout ce qui suit au chargement du cadre.
      if (payload.aspect === 'fixed' && payload.heightPx === undefined) {
        throw new CmsBlockPayloadError(position, 'une hauteur est nécessaire pour un cadre à taille fixe');
      }
      return payload;
    }

    case 'person_cards':
      return {
        ...payload,
        people: payload.people.map((person) => ({
          ...person,
          // Une adresse mal formée deviendrait un `mailto:` cassé à l'affichage.
          email: person.email && EMAIL.test(person.email) ? person.email : undefined
        }))
      };

    case 'gallery':
      // Doublons retirés : la même image deux fois dans une galerie est toujours une
      // fausse manœuvre, jamais une intention.
      return { ...payload, mediaIds: [...new Set(payload.mediaIds)] };

    default:
      return payload;
  }
}

/**
 * Relit une charge utile stockée.
 *
 * Le contenu a déjà été assaini à l'écriture ; ce chemin ne refait pas le travail, il
 * se protège d'une ligne corrompue ou écrite par une version antérieure du code.
 */
export function parseStoredBlock(type: string, payload: string): BlockPayload | null {
  try {
    const parsed = JSON.parse(payload);
    const schema = BLOCK_SCHEMAS[type as BlockType];
    if (!schema || !Value.Check(schema, parsed)) return null;
    return parsed as BlockPayload;
  } catch {
    return null;
  }
}
