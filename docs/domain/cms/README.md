# Domaine Métier : Contenu du site (CMS)

Le domaine **CMS** porte tout ce que le club publie : les **pages** du site (composées en blocs), les **actualités**, la **médiathèque**, les **menus** et les **redirections** héritées de WordPress.

Depuis la refonte d'août 2026, il porte aussi ce qui relevait du domaine *Annonces*, désormais supprimé. Deux objets disaient presque la même chose — un titre, un texte riche, une date de publication — et ne se distinguaient que par leur lecteur : les annonces pour l'espace adhérent, les actualités pour le site public. Cette frontière est devenue un champ, `visibility`, et il ne reste qu'un seul objet à rédiger, à catégoriser et à illustrer.

Il ne porte **pas** la diffusion. Prévenir les adhérents relève du domaine [Notifications](../notifications/README.md), que ce domaine appelle en sortie — jamais l'inverse. C'est la distinction structurante : une actualité est un **contenu durable**, une notification est un **événement éphémère** dont l'historique est purgé à 90 jours. Un adhérent qui n'a pas activé les notifications, ou qui a balayé la sienne, retrouve l'information.

Aucune dépendance à `members` : le ciblage « tous les abonnés » est résolu à l'intérieur du contexte notifications, qui reste un contexte feuille.

---

## Dictionnaire de Données & Glossaire Métier

| Terme Métier | Définition & Contexte | Type / Exemple |
|---|---|---|
| **Actualité** | Communication datée du club, conservée sans limite de durée. | `Aggregate` (`cms_posts`) |
| **Brouillon** | Rédigée, mais invisible partout. Statut par défaut à la création. | `status = 'draft'` |
| **Publiée** | Visible des lecteurs que sa visibilité désigne. | `status = 'published'` |
| **Publique** | Lisible sur le site public **et** dans l'espace adhérent. | `visibility = 'public'` |
| **Réservée** | Lisible dans l'espace adhérent seul. Ni indexée, ni atteignable par son adresse depuis le site. | `visibility = 'private'` |
| **Date de publication** | Date du premier passage à « publiée ». Porte l'ordre d'affichage, et ne change plus ensuite. | `published_at` (nullable) |
| **Diffusion** | Envoi unique de l'actualité en notification push aux abonnés. Réservé aux actualités réservées. | `notified_at` (nullable) |
| **Catégorie** | Rubrique de classement. Une actualité peut en porter plusieurs. | `cms_post_categories` |
| **Filtre de rubrique** | L'écran « Actualités » de l'espace adhérent propose une position par catégorie effectivement portée par une actualité, plus « Tout » par défaut. | `/actualites?filtre=<slug>` |
| **Couverture** | Image affichée en carte et en tête d'article. | `cover_media_id` |
| **Événement lié** | Rendez-vous de l'[agenda](../events/README.md) que l'actualité annonce. Simple identifiant, sans clé étrangère : le CMS n'a pas à dépendre du domaine agenda pour stocker un numéro, et un lien devenu orphelin est ignoré au rendu. Quand ses inscriptions sont ouvertes, l'espace adhérent affiche l'encart d'inscription au bout de l'article. | `event_id` (nullable) |
| **Page** | Contenu composé de blocs typés, à une adresse fixe. | `cms_pages` + `cms_page_blocks` |
| **Bloc imbricable** | Bloc qu'une colonne peut accueillir. Six types seulement : les autres portent le `h1`, ou attendent la pleine largeur. | `NESTABLE_BLOCK_TYPES` |
| **Colonnes** | Bloc qui pose 2, 3 ou 4 colonnes de largeurs réglables et héberge un bloc imbricable dans chacune. **Un niveau d'imbrication, pas deux** : au-delà, ce n'est plus une liste de blocs mais un page-builder, et le rendu cesse d'être garanti. | Bloc `columns` |
| **Entrée de menu** | Un lien de navigation, rangé sous l'un des trois emplacements — en-tête, pied de page, barre légale — et éventuellement sous une autre entrée. Deux niveaux au maximum. | `cms_nav_items` |
| **Redirection** | Une ancienne adresse et ce qu'elle répond : une cible (**301**) ou rien (**410 Gone**, page sans successeur). Compte ses passages, pour savoir laquelle purger. | `cms_redirects` |

---

## Règles Fonctionnelles du Domaine

- [RF-CMS-001 : Visibilité d'une actualité](./rules/RF-CMS-001-visibilite-d-une-actualite.md)
- [RF-CMS-002 : Diffusion unique aux adhérents](./rules/RF-CMS-002-diffusion-unique.md)

---

## Frontières

| Ce que le domaine fait | Ce qu'il ne fait pas |
|---|---|
| Décider qui peut lire une actualité | Authentifier le lecteur (`iam`, storefront) |
| Désigner l'événement qu'une actualité annonce | Tenir l'agenda, ni gérer ses inscriptions (`events`) |
| Demander une diffusion push | Choisir les destinataires, gérer les abonnements (`notifications`) |
| Assainir le texte riche à l'écriture | Faire confiance à l'éditeur du navigateur |
| Servir le contenu à trois appelants | Laisser l'appelant décider de ce qu'il voit |
| Tenir l'arborescence des URL : menus, redirections | Décider du référencement d'une page |

---

## L'arborescence des URL est un sujet à part

Rédiger une page et décider de son adresse ne se paient pas de la même façon. Un texte maladroit se corrige ; une adresse déplacée sans redirection perd son référencement, et le lien qui circulait mène à une impasse.

D'où deux droits distincts dans le catalogue : `cms:pages:*` pour la rédaction — **les menus compris**, qui ne font que désigner des pages existantes — et `cms:nav:*` pour les redirections. Le secrétariat rédige et compose les menus ; les redirections restent à la commission Communication et à la présidence.

Trois automatismes accompagnent le renommage d'une page **publiée**, et n'existent que pour éviter les chaînes et les boucles que Google suit mal :

- une redirection est posée de l'ancienne adresse vers la nouvelle ;
- les redirections qui visaient l'ancienne adresse sont repointées vers la nouvelle, sinon un second renommage produirait `A → B → C` ;
- une redirection dont la source devient la cible est supprimée, sinon revenir à une adresse précédente créerait une boucle.

Un brouillon n'a jamais eu d'adresse publique : son renommage ne pose rien. L'écran d'administration (`/admin/website/redirects`) sert aux cas que l'application ne peut pas deviner, et affiche le compteur de passages — sous-estimé pour les 410, dont la réponse est mise en cache un quart d'heure par le site public.
