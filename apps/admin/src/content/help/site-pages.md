---
title: "Pages du site"
description: "Composer, publier et faire évoluer les pages du site public."
category: "site"
order: 1
---

**Site public → Pages** contient les pages du site que voient les visiteurs — présentation du club, inscription, contacts. C'est le site public, à ne pas confondre avec l'[espace adhérent](/admin/help/espace-adherent), qui demande une connexion.

## Une page est une pile de blocs

Une page n'est pas un document libre : c'est une **suite ordonnée de blocs**, chacun d'un type précis — un texte, une accroche, une galerie, un tableau de créneaux. Vous les empilez, vous les déplacez, vous les retirez.

C'est un choix délibéré. Un éditeur libre laisse produire des pages illisibles sur téléphone, des images de 4 Mo et des titres dans le désordre — c'est exactement ce que faisait l'ancien site WordPress. Avec des blocs, la mise en page reste cohérente quoi que vous saisissiez.

Le détail de chaque type de bloc est décrit dans [Les blocs de contenu](/admin/help/site-blocs).

## Créer une page

Le bouton **Nouvelle page** ne demande qu'un titre. La page est créée **en brouillon**, et son adresse est déduite du titre : « Notre club » donne `/notre-club/`.

> [!IMPORTANT]
> L'adresse est fixée à la création et ne se modifie pas depuis l'application. Choisissez le titre en conséquence : une page publiée puis renommée garderait son adresse d'origine. En cas d'erreur, supprimez la page tant qu'elle est en brouillon et recréez-la.

Une page est toujours créée en brouillon, jamais en ligne : une page vide publiée le temps d'être rédigée serait indexée dans cet état par les moteurs de recherche.

## L'éditeur

Cliquez sur le titre d'une page pour l'ouvrir. L'écran réunit :

| Zone | Rôle |
|---|---|
| **Bandeau du haut** | Statut (Brouillon / En ligne), adresse publique, lien **Aperçu**, et la mention « Modifications non enregistrées » s'il y a lieu |
| **Titre** | Le titre affiché en haut de la page publique, et repris dans l'onglet du navigateur |
| **Titre pour les moteurs** | Ce que Google affiche dans ses résultats. Vide, c'est le titre de la page qui sert |
| **Description pour les moteurs** | La phrase sous le lien dans les résultats de recherche. Visez 155 caractères |
| **Les blocs** | Le contenu proprement dit, dans l'ordre où il s'affichera |
| **Ajouter un bloc** | Un bouton par type de bloc ; survolez-en un pour lire ce qu'il fait |
| **Anciennes adresses** | Les adresses qui redirigent vers cette page, avec leur nombre de visites |
| **Historique** | Les versions précédentes de la page |

Chaque bloc porte son numéro, son type, et trois commandes : **↑** et **↓** pour le déplacer, **Retirer** pour le supprimer. Retirer un bloc ne prend effet qu'à l'enregistrement.

## Enregistrer, puis publier

Ce sont deux gestes distincts.

**Enregistrer** écrit vos modifications et crée une version dans l'historique. Une page en ligne est mise à jour immédiatement pour les visiteurs ; une page en brouillon reste invisible.

**Publier** met la page en ligne. **Retirer du site** l'en enlève sans rien effacer : la page redevient un brouillon, son contenu est conservé.

> [!NOTE]
> Publier exige d'avoir enregistré au préalable. Si vous tentez de publier avec des modifications en cours, l'application refuse et vous le dit : sans cela, vous mettriez en ligne la version précédente en croyant publier celle que vous avez sous les yeux.

Publier ou dépublier **renouvelle le cache de tout le site**. Comptez quelques secondes avant que le changement soit visible partout — et sachez que c'est ce mécanisme qui garantit qu'aucun visiteur ne reste sur une version périmée.

La **date de publication** n'est posée qu'à la première mise en ligne. Corriger une faute dans une vieille page ne la fait donc pas passer pour une nouveauté aux yeux de Google.

## Relire avant de publier

Le lien **Aperçu** ouvre la page sur le site public, telle qu'elle sera rendue, même si elle est encore en brouillon. Le lien porte un jeton signé, valable pour cette page : il permet de faire relire un brouillon par quelqu'un d'autre sans le publier.

C'est le seul moyen fiable de vérifier une mise en page : l'éditeur montre les champs, pas le rendu.

## L'historique

Chaque enregistrement conserve un instantané de l'état **précédent** — celui qui fonctionnait. Le panneau **Historique**, en bas de l'éditeur, les liste avec leur date, leur auteur et leur nombre de blocs. Les **vingt dernières versions** d'une page sont conservées ; au-delà, les plus anciennes sont effacées.

**Restaurer** remplace le contenu actuel par celui de la version choisie. L'adresse et la mise en ligne ne changent pas, et le contenu remplacé part lui-même dans l'historique : un retour en arrière reste réversible.

## Supprimer une page

La suppression est **définitive** : la page, ses blocs et son historique disparaissent, et son adresse ne répond plus.

> [!CAUTION]
> Si la page était en ligne, son adresse est probablement connue de Google et partagée dans des courriels ou sur les réseaux. La supprimer produit une erreur 404 pour tous ces visiteurs. Pour retirer une page de la vue du public en conservant cette possibilité de retour, préférez **Retirer du site**.

Les redirections d'une ancienne adresse vers une nouvelle se consultent et se règlent depuis **Site public → Redirections** : après une suppression, vous pouvez y rediriger l'ancienne adresse vers une page qui la remplace, ou la déclarer supprimée (410) pour que les moteurs l'oublient. Il faut pour cela le droit *Modifier les menus et les redirections*.

## Qui peut faire quoi

| Action | Droit requis |
|---|---|
| Consulter les pages | Consulter les pages du site |
| Créer, modifier, publier, restaurer une version | Créer et modifier une page du site |
| Supprimer | Supprimer une page du site |

Les rôles **Communication** et **Président·e** disposent de l'ensemble. Le rôle **Secrétaire** peut créer et modifier, mais pas supprimer. Les droits se règlent depuis [Accès & Rôles](/admin/help/acces-permissions).
