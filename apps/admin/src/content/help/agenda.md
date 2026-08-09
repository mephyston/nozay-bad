---
title: "Agenda"
description: "Publier les compétitions, stages et animations sur l'agenda du site public."
category: "communication"
order: 4
---

**Communication → Agenda** tient le calendrier du club : compétitions, interclubs, tournois, stages, animations et assemblées. Les événements publiés composent la page **Agenda** du site public.

Ils remplacent l'agenda Google intégré de l'ancien site, dont le contenu était **entièrement invisible pour les moteurs de recherche** : une compétition annoncée n'existait que pour qui ouvrait la page. Chaque événement publié est désormais du texte indexable, accompagné de ses données structurées — c'est ce qui permet à une date d'apparaître directement dans une recherche.

## Ajouter un événement

| Champ | Détail |
|---|---|
| **Titre** | 200 caractères au maximum. « Interclubs D3 — journée 4 » |
| **Début** | Date et heure. Obligatoire |
| **Catégorie** | Compétition, Interclubs, Tournoi, Stage, Vie du club, Assemblée |
| **Lieu** | Texte libre : « Halle des Sports », ou le gymnase du club adverse |

Le **lieu** est volontairement libre, et non choisi parmi les gymnases du club : la moitié des événements se déroulent en déplacement, dans des salles que le club ne référence pas.

L'événement est créé **en brouillon** : il n'apparaît sur le site qu'une fois publié.

> [!NOTE]
> Le formulaire ne demande pas d'heure de fin ni de description. Le modèle les prévoit, ainsi qu'un lien vers la fiche FFBaD ou Badnet, mais les champs correspondants ne sont pas encore dans l'écran. Mettez l'essentiel dans le titre en attendant.

## Publier, annuler, supprimer

Le statut se change **depuis la liste**, par le menu **⋯**.

| Statut | Sur le site public |
|---|---|
| **Brouillon** | Invisible |
| **En ligne** | Affiché dans l'agenda, s'il est à venir |
| **Annulé** | Retiré de l'agenda |

> [!IMPORTANT]
> **Annuler retire l'événement du site**, il ne l'y laisse pas barré. Si l'annulation doit être portée à la connaissance de ceux qui comptaient s'y rendre, publiez une [annonce](/admin/help/annonces) ou une [actualité](/admin/help/site-actualites) : l'agenda, lui, ne montre que ce qui aura bien lieu.

Le statut **Annulé** garde une trace côté administration : l'événement reste dans la liste, marqué en rouge, plutôt que d'être effacé. C'est ce qui le distingue de la **suppression**, définitive, réservée à un événement saisi par erreur.

## Ce que voit le visiteur

La page **Agenda** liste les cinquante prochains événements publiés, du plus proche au plus lointain, avec leur date en toutes lettres, leur heure, leur catégorie et leur lieu.

Un événement du jour **reste affiché jusqu'à minuit**, même si son heure de début est passée : une compétition ne disparaît pas de l'affiche à 9 h 01.

Les événements passés disparaissent du site le lendemain, mais restent visibles dans l'écran d'administration, qui affiche aussi l'historique.

## Agenda ou créneaux ?

Deux rubriques voisines, à ne pas confondre :

- l'**Agenda** porte des événements **datés et ponctuels** : un tournoi le 14 novembre, l'assemblée générale du 20 juin ;
- les [**Créneaux**](/admin/help/creneaux) portent les **horaires hebdomadaires** d'entraînement, qui reviennent chaque semaine de la saison.

## Qui peut faire quoi

| Action | Droit requis |
|---|---|
| Consulter l'agenda | Consulter l'agenda |
| Ajouter, modifier, publier, annuler | Créer et modifier un événement |
| Supprimer | Supprimer un événement |

Les rôles **Communication**, **Président·e** et **Super administrateur** disposent de l'ensemble. Le rôle **Secrétaire** peut créer et modifier, mais pas supprimer. Les droits se règlent depuis [Accès & Rôles](/admin/help/acces-permissions).
