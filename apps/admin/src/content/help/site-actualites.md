---
title: "Actualités"
description: "Rédiger et publier les actualités du club, pour le site public ou pour les seuls adhérents."
category: "communication"
order: 1
---

**Communication → Actualités** publie les nouvelles du club : compétitions, résultats, animations, vie de l'association, mais aussi les informations réservées aux adhérents — assemblée générale, fermeture de créneaux, changement d'horaire.

> [!IMPORTANT]
> Les **Annonces** n'existent plus comme module distinct : elles ont été absorbées ici. Une actualité porte désormais une **visibilité** qui décide de son public, et une actualité réservée aux adhérents peut être diffusée en notification. Un seul écran, un seul texte à rédiger, deux publics possibles.

## Rédiger une actualité

Le bouton **Nouvelle actualité** ouvre le formulaire.

| Champ | Détail |
|---|---|
| **Titre** | 200 caractères au maximum. Il donne l'adresse publique de l'article |
| **Chapô** | Une phrase d'accroche, 500 caractères. Reprise dans les listes, les partages et les résultats de recherche |
| **Image de couverture** | Choisie dans la [médiathèque](/admin/help/site-mediatheque). Elle illustre les cartes des listes et le partage sur les réseaux |
| **Catégories** | À cocher, si des catégories existent. Elles servent de filtre sur la page d'archives |
| **Texte** | Le corps de l'article |

L'actualité est créée **en brouillon** : elle n'apparaît qu'une fois publiée.

## Qui la voit : la visibilité

Le formulaire pose la question au moment de la rédaction, et c'est le choix le plus structurant de l'écran.

| Visibilité | Public |
|---|---|
| **Tout le monde** | Publiée sur le site public **et** dans l'espace adhérent. Lisible par n'importe qui, indexée par Google, reprise dans le flux RSS |
| **Adhérents seulement** | Visible dans le seul espace adhérent. Ni sur le site public, ni dans le flux, ni pour les moteurs |

Une soirée du club se raconte pour tout le monde ; un changement d'horaire de dernière minute se réserve aux adhérents.

Le cloisonnement est appliqué par l'API selon l'appelant, jamais par l'affichage : une actualité réservée n'est pas simplement masquée sur le site public, elle ne lui est pas transmise.

## Diffuser sur les téléphones

Une actualité **réservée aux adhérents** et **publiée** peut être diffusée en notification depuis le menu **⋯** de la liste. Tous les adhérents abonnés la reçoivent sur leur téléphone, immédiatement.

> [!CAUTION]
> L'envoi est **définitif et unique**. Il ne s'annule pas, et l'application refuse un second envoi pour la même actualité — modifier le texte ensuite ne renotifie personne. Relisez avant de diffuser : un adhérent réveillé pour rien ne se dé-réveille pas.

Contrairement à la notification, l'actualité elle-même reste consultable indéfiniment : un adhérent qui n'a pas activé les notifications, ou qui a balayé la notification sur son téléphone, retrouve l'information dans son espace.

Rédiger et diffuser sont deux droits distincts : la diffusion relève de **Envoyer une notification**, voir [Notifications](/admin/help/notifications).

Le **chapô** mérite qu'on s'y arrête : c'est lui qui s'affiche sous le titre dans la liste des actualités, dans les cartes de la page d'accueil, dans les résultats Google et dans l'aperçu quand quelqu'un partage le lien. Sans chapô, c'est le début du texte qui sert, souvent maladroitement.

## La barre d'outils

**Gras**, *italique*, souligné, liste à puces, liste numérotée, insérer un lien, retirer un lien, et **insérer un fichier à télécharger** — ce dernier ouvre la médiathèque et pose un lien vers le document choisi.

Le collage depuis un traitement de texte ou un courriel ne reprend **que le texte**, sans les polices ni les couleurs.

Pour un lien, sélectionnez le texte à transformer, puis cliquez sur l'icône de chaîne. Les adresses acceptées commencent par `https://`, `http://`, `mailto:` ou `/`.

## Publier

Le statut se change **depuis la liste**, par le menu **⋯** : **Publier**, ou **Repasser en brouillon**. Le formulaire ne sert qu'au contenu.

La **date de publication** est posée à la première mise en ligne, et ne bouge plus ensuite. Corriger une faute dans un vieil article ne le fait donc pas remonter en tête du flux.

Une actualité publiée **pour tout le monde** apparaît :

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

| Diffuser sur les téléphones | Envoyer une notification |

Les rôles **Communication** et **Président·e** disposent de l'ensemble. Le rôle **Secrétaire** peut rédiger, publier et diffuser, mais pas supprimer. Les droits se règlent depuis [Accès & Rôles](/admin/help/acces-permissions).
