---
title: "Menus du site (à venir)"
description: "Ce que permettra la gestion des menus du site public, et comment faire en attendant."
category: "site"
order: 5
---

> [!IMPORTANT]
> **Cette fonctionnalité est en cours de développement.** Aucun écran ne lui correspond encore dans le menu d'administration. Cet article décrit ce qu'elle permettra, pour que vous sachiez ce qui vous attend — et surtout comment faire d'ici là.

## Comment se règle le menu aujourd'hui

Le menu de l'en-tête du site public et les liens du pied de page sont **écrits dans le code**. Créer une page ne l'y ajoute pas, et la retirer du site ne l'en enlève pas.

Pour faire figurer une nouvelle page dans le menu du site, demandez la modification au responsable technique. Prévoyez le délai d'une mise en production.

> [!CAUTION]
> Conséquence à connaître : si vous **supprimez** une page qui figure dans le menu, le lien reste affiché sur le site et mène à une erreur 404 jusqu'à la prochaine mise en production. Prévenez avant de supprimer une page référencée par le menu — voir [Pages du site](/admin/help/site-pages).

En attendant, une page peut parfaitement être atteinte sans figurer au menu : depuis un bloc **Grille de liens** ou **Accroche** posé sur une page qui, elle, est au menu. C'est souvent suffisant pour une page saisonnière — inscriptions, tournoi annuel.

## Ce que permettra l'écran à venir

Deux menus distincts seront administrables :

- l'**en-tête**, la navigation principale du site ;
- le **pied de page**, réservé aux liens de bas de page.

Chaque entrée portera :

| Champ | Détail |
|---|---|
| **Libellé** | Le texte affiché, 80 caractères au maximum. Il est indépendant du titre de la page : une page « Présentation du club et de ses activités » peut s'appeler « Le club » dans le menu |
| **Cible** | **Soit** une page du site, **soit** une adresse extérieure — jamais les deux |
| **Emplacement** | En-tête ou pied de page |
| **Position** | L'ordre dans le menu ; une nouvelle entrée se pose à la fin |
| **Sous-menu** | Une entrée peut être rangée sous une autre |

Deux niveaux au maximum : une entrée, et son sous-menu. Un troisième niveau serait inatteignable au survol sur grand écran et illisible une fois replié sur téléphone.

Une entrée qui pointe une **page du site** suit cette page : son adresse est résolue au moment de l'affichage, et supprimer la page emportera l'entrée de menu avec elle. C'est précisément ce que le menu écrit en dur ne sait pas faire aujourd'hui.

## Qui pourra le faire

Le droit correspondant s'appelle **Modifier les menus et les redirections**. Il est déjà attribué aux rôles **Communication**, **Président·e** et **Super administrateur**.

Il n'est **pas** accordé au rôle **Secrétaire**, qui peut rédiger des pages mais pas toucher à l'arborescence : modifier un menu ou une redirection se paie en référencement, et cela relève de la commission Communication et de la présidence. Voir [Accès & Rôles](/admin/help/acces-permissions).
