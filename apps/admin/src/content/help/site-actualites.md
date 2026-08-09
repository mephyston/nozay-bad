---
title: "Actualités du site"
description: "Rédiger et publier les actualités publiques du club."
category: "site"
order: 3
---

**Site public → Actualités du site** publie les nouvelles du club sur le site public : compétitions, résultats, animations, vie de l'association.

> [!IMPORTANT]
> À ne pas confondre avec les [Annonces](/admin/help/annonces). Une **actualité** est publique, lisible par n'importe qui, indexée par Google, et ne prévient personne. Une **annonce** s'adresse aux adhérents connectés à leur espace, et peut déclencher une notification sur leur téléphone. Une soirée du club se raconte en actualité ; un changement d'horaire de dernière minute se diffuse en annonce.

## Rédiger une actualité

Le bouton **Nouvelle actualité** ouvre le formulaire.

| Champ | Détail |
|---|---|
| **Titre** | 200 caractères au maximum. Il donne l'adresse publique de l'article |
| **Chapô** | Une phrase d'accroche, 500 caractères. Reprise dans les listes, les partages et les résultats de recherche |
| **Image de couverture** | Choisie dans la [médiathèque](/admin/help/site-mediatheque). Elle illustre les cartes des listes et le partage sur les réseaux |
| **Catégories** | À cocher, si des catégories existent. Elles servent de filtre sur la page d'archives |
| **Texte** | Le corps de l'article |

L'actualité est créée **en brouillon** : elle n'apparaît sur le site qu'une fois publiée.

Le **chapô** mérite qu'on s'y arrête : c'est lui qui s'affiche sous le titre dans la liste des actualités, dans les cartes de la page d'accueil, dans les résultats Google et dans l'aperçu quand quelqu'un partage le lien. Sans chapô, c'est le début du texte qui sert, souvent maladroitement.

## La barre d'outils

**Gras**, *italique*, souligné, liste à puces, liste numérotée, insérer un lien, retirer un lien, et **insérer un fichier à télécharger** — ce dernier ouvre la médiathèque et pose un lien vers le document choisi.

Le collage depuis un traitement de texte ou un courriel ne reprend **que le texte**, sans les polices ni les couleurs.

Pour un lien, sélectionnez le texte à transformer, puis cliquez sur l'icône de chaîne. Les adresses acceptées commencent par `https://`, `http://`, `mailto:` ou `/`.

## Publier

Le statut se change **depuis la liste**, par le menu **⋯** : **Publier**, ou **Repasser en brouillon**. Le formulaire ne sert qu'au contenu.

La **date de publication** est posée à la première mise en ligne, et ne bouge plus ensuite. Corriger une faute dans un vieil article ne le fait donc pas remonter en tête du flux.

Une actualité publiée apparaît :

- sur la page **Actualités** du site, paginée par douze, avec ses filtres par catégorie ;
- dans les blocs **Actualités** des pages qui en portent un (voir [Les blocs de contenu](/admin/help/site-blocs)) ;
- dans le **flux RSS** du site.

Publier ou dépublier renouvelle le cache du site : comptez quelques secondes.

L'entrée **Voir sur le site** du menu **⋯** ouvre l'article dans un nouvel onglet, pour vérifier le rendu.

## Les catégories

Les catégories permettent de filtrer les archives (`/actualites/?categorie=…`). Elles ne se créent pas encore depuis cet écran : celles reprises de l'ancien site sont disponibles, et l'ajout d'une nouvelle catégorie passe pour l'instant par le responsable technique.

Une actualité peut appartenir à plusieurs catégories, ou à aucune.

## Supprimer

La suppression est **définitive** et l'adresse de l'article ne répond plus.

> [!CAUTION]
> Un article publié a pu être partagé par courriel ou sur les réseaux sociaux, et il est probablement indexé. Le supprimer produit une erreur 404 pour tous ceux qui suivent ces liens. Pour le retirer de la vue du public sans casser les liens existants, préférez **Repasser en brouillon** — l'adresse répondra alors une page « introuvable », mais l'article restera récupérable.

## Qui peut faire quoi

| Action | Droit requis |
|---|---|
| Consulter les actualités | Consulter les actualités du site |
| Créer, modifier, publier | Rédiger et publier une actualité |
| Supprimer | Supprimer une actualité |

Les rôles **Communication** et **Président·e** disposent de l'ensemble. Le rôle **Secrétaire** peut rédiger et publier, mais pas supprimer. Les droits se règlent depuis [Accès & Rôles](/admin/help/acces-permissions).
