---
title: "Menus du site"
description: "Composer la navigation du site public : barre de navigation, pied de page et barre légale."
category: "site"
order: 5
---

**Site public → Menus** compose la navigation du site public. Créer une page ne l'ajoute pas au menu, et la retirer du menu ne la supprime pas : ce sont deux gestes distincts.

## Trois emplacements

L'écran présente un onglet par emplacement, et chacun a son menu :

| Emplacement | Où il s'affiche |
|---|---|
| **En-tête** | La barre de navigation principale, en haut de chaque page |
| **Pied de page** | La colonne « Le site » du pied de page |
| **Barre légale** | Tout en bas, sous le pied de page : mentions légales, confidentialité |

## Une entrée de menu

| Champ | Détail |
|---|---|
| **Intitulé** | Le texte affiché. Il est indépendant du titre de la page : une page « Présentation du club et de ses activités » peut s'appeler « Le club » dans le menu |
| **Cible** | Une **page du site**, une **adresse extérieure**, ou **aucune** |
| **Rangée sous** | L'entrée de premier niveau qui l'accueille, pour former un sous-menu |

L'ordre se règle en déplaçant les entrées dans la liste ; il est enregistré aussitôt.

Deux niveaux au maximum : une entrée, et son sous-menu. Un troisième niveau serait inatteignable au survol sur grand écran et illisible une fois replié sur téléphone.

Une entrée **sans cible** ne sert qu'à regrouper : elle ouvre son sous-menu sans mener nulle part. Réservée au premier niveau — une sous-entrée qui ne mène nulle part n'est qu'une ligne morte, et l'application la refuse.

Une entrée qui pointe une **page du site** suit cette page : son adresse est résolue au moment de l'affichage, et renommer la page ne casse pas le lien. La liste des pages proposées signale les brouillons — les choisir est possible, mais l'entrée mènera à une page invisible tant qu'elle n'est pas publiée.

> [!CAUTION]
> Supprimer une page qui figure au menu retire l'entrée avec elle. Si l'adresse de cette page circulait, pensez à créer la redirection correspondante — voir [Redirections](/admin/help/site-redirections).

## Qui peut le faire

Le droit est **Modifier les pages du site** (`cms:pages:write`), le même que celui de la rédaction : les rôles **Secrétaire**, **Communication**, **Président·e** et **Super administrateur** composent donc les menus.

Les **redirections**, elles, relèvent d'un droit distinct — modifier une adresse se paie en référencement. Voir [Accès & Rôles](/admin/help/acces-permissions).
