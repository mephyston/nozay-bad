---
title: "Médiathèque"
description: "Déposer et gérer les images et documents utilisés par le site public."
category: "site"
order: 4
---

**Site public → Médiathèque** regroupe les images et les documents du site. Un fichier déposé ici est réutilisable partout : couverture d'actualité, bannière d'une grille de liens, galerie, PDF en téléchargement.

L'écran affiche une grille de vignettes — on y cherche une image à l'œil, pas une ligne dans un tableau. La barre de recherche filtre sur la description et le nom de fichier.

## Déposer un fichier

Le bouton **Ajouter un média** demande deux choses : le fichier, et son **texte alternatif**.

**Formats acceptés** : JPEG, PNG, WebP, AVIF, GIF et PDF. Tout le reste est refusé, y compris les fichiers SVG — ce sont des documents qui peuvent porter du code exécutable.

**Taille maximale** : 12 Mo.

> [!NOTE]
> Les images sont **réduites à 1600 pixels de large et converties en WebP dans votre navigateur** avant d'être envoyées. Une photo de téléphone de 4 Mo arrive donc allégée, sans que vous ayez à la retoucher. Une image déjà petite et bien compressée est laissée telle quelle : la réencoder ferait perdre de la qualité pour rien.

Déposer deux fois le même fichier **ne crée pas de doublon** : l'application reconnaît un contenu identique et vous renvoie vers le média existant.

## Le texte alternatif

Il est demandé au dépôt, et obligatoire pour une image. Ce n'est pas une formalité : il est lu à voix haute par les lecteurs d'écran, affiché si l'image ne se charge pas, et utilisé par les moteurs de recherche.

Décrivez ce que **montre** l'image, en quelques mots : « L'équipe interclubs devant le gymnase Pierre Dupuis », et non « photo » ou « IMG_2451 ». C'est aussi ce texte qui sert de nom au média dans les listes et les sélecteurs — un média bien décrit se retrouve à la recherche.

Il est demandé au dépôt parce que personne ne revient le remplir ensuite.

## Utiliser un média

Vous ne choisissez jamais un fichier depuis cet écran : c'est le formulaire qui en a besoin qui ouvre la médiathèque, filtrée sur ce qu'il attend.

| Où | Ce qui est proposé |
|---|---|
| Couverture d'une [actualité](/admin/help/site-actualites) | Les images |
| Fichier inséré dans un texte d'actualité | Les documents |
| Image de fond d'une **Grille de liens** | Les images |
| Image d'une diapositive de **Carrousel** | Les images |
| Bloc **Galerie** | Les images, ajoutées une à une |
| Bloc **Document** | Les documents |

Voir [Les blocs de contenu](/admin/help/site-blocs) pour le détail de chaque bloc.

Le menu **⋯** d'une vignette permet d'**Ouvrir** le fichier dans un nouvel onglet — pratique pour récupérer son adresse publique, de la forme `/media/…`.

Dans tous les cas, la médiathèque s'ouvre avec sa recherche : c'est le texte alternatif et le nom du fichier qui sont interrogés. Une raison de plus de décrire correctement ce que vous déposez.

## Supprimer un média

La suppression est refusée si le média est utilisé comme **couverture d'une actualité ou image d'une page** : le message vous le dit, et vous devez d'abord le retirer de là où il sert.

> [!WARNING]
> Ce contrôle ne couvre pas tous les usages : un fichier utilisé à l'intérieur du texte d'un article, ou dans une galerie, peut être supprimé sans avertissement. Vérifiez avant, surtout pour un document mis en téléchargement depuis plusieurs pages.

Le fichier lui-même reste stocké : seule sa fiche disparaît de la médiathèque. Le redéposer plus tard retombera sur le même fichier, sans occuper d'espace supplémentaire.

## Qui peut faire quoi

| Action | Droit requis |
|---|---|
| Consulter la médiathèque | Consulter la médiathèque |
| Déposer un fichier | Ajouter un média |
| Supprimer | Supprimer un média |

Déposer et supprimer sont deux droits distincts : ajouter un fichier est sans conséquence, alors que retirer un média peut vider l'illustration d'une page déjà en ligne. Les rôles **Communication** et **Président·e** disposent des trois ; le rôle **Secrétaire** peut déposer sans pouvoir supprimer. Les droits se règlent depuis [Accès & Rôles](/admin/help/acces-permissions).
