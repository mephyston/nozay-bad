import { type Db } from '@nba/db';
import { parseStoredBlock } from '../../shared/block-payload';
import { flattenBlocks } from '../../shared/blocks';
import { enhanceBodyImages, mediaHashesInHtml } from '../../shared/body-images';
import { normalisePath } from '../../shared/slug';
import type { BlockPayload } from '../../shared/blocks';
import { ResolveRouteRepository } from './repository';
import type { ResolveRouteInput, ResolveRouteOutput } from './dto';

/**
 * Résout une URL publique en un contenu, une redirection, ou rien.
 *
 * C'est le chemin le plus chaud du site : toute page vue passe par ici. L'ordre des
 * recherches va donc du plus probable au moins probable, et s'arrête au premier
 * succès.
 *
 * Les pages passent **avant** les redirections, délibérément : si quelqu'un recrée
 * `/forum-2/` comme vraie page, elle doit servir, et non rediriger vers la cible
 * héritée de WordPress.
 */
/**
 * Sert les images des textes riches à la bonne taille.
 *
 * Posé ici, sur le chemin de **rendu**, et non à l'enregistrement : le HTML stocké
 * reste ce que l'auteur a écrit, et tous les articles déjà publiés en profitent sans
 * qu'on les rouvre. `/cms/route` n'est appelée que par le site public — l'écran
 * d'administration passe par `/cms/posts`, qui rend le texte brut, comme il le doit.
 */
async function withSizedImages(
  db: Db,
  repo: ResolveRouteRepository,
  documents: string[]
): Promise<(html: string) => string> {
  const hashes = [...new Set(documents.flatMap((html) => mediaHashesInHtml(html)))];
  if (hashes.length === 0) return (html) => html;
  const variants = await repo.variantsForHashes(db, hashes);
  return (html) => enhanceBodyImages(html, variants);
}

export async function resolveRoute(db: Db, input: ResolveRouteInput): Promise<ResolveRouteOutput> {
  const repo = new ResolveRouteRepository();
  const path = normalisePath(input.path);
  const includeDrafts = input.includeDrafts === true;
  const includePrivate = input.includePrivate === true;

  const page = await repo.findPage(db, path, includeDrafts);
  if (page) {
    const rows = await repo.findBlocks(db, page.id);
    // Une ligne illisible est ignorée, pas fatale : un bloc corrompu ne doit pas
    // emporter une page entière, il doit juste manquer.
    const blocks = rows
      .map((row) => parseStoredBlock(row.type, row.payload))
      .filter((block): block is NonNullable<typeof block> => block !== null);

    // Les blocs de texte, y compris ceux nichés dans une colonne : une image ne pèse
    // pas moins parce qu'elle est dans une demi-largeur.
    const richtexts = flattenBlocks(blocks).filter(
      (block): block is Extract<BlockPayload, { type: 'richtext' }> => block.type === 'richtext'
    );
    const size = await withSizedImages(db, repo, richtexts.map((block) => block.html));
    for (const block of richtexts) block.html = size(block.html);

    return { kind: 'page', page, blocks };
  }

  const post = await repo.findPost(db, path, includeDrafts, includePrivate);
  if (post) {
    // Trois lectures de plus sur le chemin chaud, mais seulement pour un article, et
    // seulement une fois la correspondance trouvée : une page ne les paie jamais. Elles
    // partent ensemble, la troisième ne coûte donc pas un aller-retour de plus.
    const [cover, coverVariants, categories] = await Promise.all([
      post.coverMediaId === null ? Promise.resolve(null) : repo.findMedia(db, post.coverMediaId),
      post.coverMediaId === null ? Promise.resolve([]) : repo.findMediaVariants(db, post.coverMediaId),
      repo.categoriesOf(db, post.id)
    ]);
    const size = await withSizedImages(db, repo, [post.bodyHtml]);
    return {
      kind: 'post',
      post: { ...post, bodyHtml: size(post.bodyHtml) },
      cover: cover ?? null,
      coverVariants,
      categories
    };
  }

  const redirect = await repo.findRedirect(db, path);
  if (redirect) {
    // Comptage attendu, et non détaché.
    //
    // Une promesse laissée en suspens est **annulée** dès que le Worker rend sa
    // réponse : le compteur restait à zéro en production alors qu'il s'incrémentait
    // en test, où rien ne l'interrompt. Attendre coûte une écriture indexée sur un
    // chemin déjà froid — ce sont des URL héritées de WordPress — et c'est ce
    // compteur qui dira quand une redirection peut être retirée.
    //
    // L'échec ne doit pas pour autant transformer une redirection en erreur.
    try {
      await repo.countHit(db, redirect.id);
    } catch {
      // Statistique : son échec ne concerne pas le visiteur.
    }
    if (!redirect.toPath) return { kind: 'gone' };
    return { kind: 'redirect', toPath: redirect.toPath, statusCode: redirect.statusCode };
  }

  return { kind: 'notfound' };
}
