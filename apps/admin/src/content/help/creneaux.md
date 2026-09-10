---
title: "Créneaux"
description: "Tenir à jour les horaires d'entraînement affichés sur le site public."
category: "communication"
order: 3
---

**Communication → Créneaux** tient les horaires d'entraînement de la saison : jour, heure, groupe, gymnase.

Ces créneaux sont **la source unique** des horaires. Ils alimentent le site public dès qu'ils changent, sans qu'aucune page ait à être modifiée : chaque page qui porte un bloc **Créneaux** les affiche à jour. Voir [Les blocs de contenu](/admin/help/site-blocs).

Ils remplacent la feuille Google de l'ancien site, que les moteurs de recherche ne voyaient pas : « horaires badminton Nozay » ne ramenait rien. Le tableau est désormais du texte indexable, lisible aussi par un lecteur d'écran.

## La saison

L'écran travaille sur la **saison en cours**, indiquée sous le titre. Elle bascule au mois d'août, comme le calendrier sportif : la saison 25-26 commence en août 2025.

Un créneau créé est rattaché à cette saison. Ceux des saisons précédentes restent en base mais ne s'affichent plus.

## Les gymnases

Un créneau se rattache obligatoirement à un **gymnase**. Si aucun n'est enregistré, l'écran vous le signale et le bouton de création reste indisponible : commencez par faire enregistrer les gymnases du club.

L'adresse du gymnase sert aussi aux données structurées du site — c'est ce qui permet à une recherche « badminton près de chez moi » de situer le club.

## Ajouter un créneau

| Champ | Détail |
|---|---|
| **Jour** | Du lundi au dimanche |
| **Début** et **Fin** | En heure locale. La fin doit suivre le début, l'application le vérifie |
| **Groupe** | Minibad (U9), Poussins (U11), Jeunes, Élite Jeunes, Adultes loisirs, Adultes compétition, Jeu libre |
| **Gymnase** | Parmi ceux enregistrés |
| **Intitulé** | Facultatif. Remplace le nom du groupe sur le site : « Jeunes — groupe compétition » |
| **Séances individuelles** | À cocher sur les créneaux où l'entraîneur prend des candidats en indiv — le mardi de 19 h 30 à 20 h 30 et le mercredi de 19 h 30 à 21 h. La programmation des soirées d'indiv ne propose que ceux-là ; le site n'en montre rien |

Un créneau est **affiché sur le site dès son ajout** : il n'y a pas d'étape de publication. C'est volontaire — un horaire est un fait du club, pas une publication à préparer.

## Masquer plutôt que supprimer

Le menu **⋯** propose **Masquer du site** : le créneau disparaît des pages publiques mais reste dans la liste, grisé, avec la mention « Masqué ». **Réafficher** le remet en ligne.

C'est le bon geste pour une interruption temporaire — vacances scolaires, gymnase indisponible, créneau suspendu quelques semaines.

> [!TIP]
> Préférez toujours le masquage à la suppression pour un retrait temporaire : l'historique est conservé, et vous n'avez pas à ressaisir le créneau au retour.

La **suppression** est définitive. Elle se justifie pour un créneau saisi par erreur.

## Ce que voit le visiteur

Un tableau groupé par jour, avec l'horaire, le groupe (ou l'intitulé si vous en avez saisi un) et le gymnase. Les créneaux masqués n'y figurent jamais.

Une page peut n'afficher qu'une partie des créneaux — ceux des jeunes sur la page Jeunes, par exemple. Ce filtrage se règle dans le bloc de la page, pas ici : voir [Les blocs de contenu](/admin/help/site-blocs).

## Qui peut faire quoi

| Action | Droit requis |
|---|---|
| Consulter les créneaux | Consulter les créneaux |
| Ajouter, modifier, masquer, supprimer | Modifier les créneaux |

Le rôle **Entraîneur·e** porte le droit d'écriture : ce sont les encadrants qui vivent les créneaux au quotidien, et qui savent le premier soir qu'un horaire a changé. Les rôles **Communication**, **Président·e** et **Super administrateur** l'ont également. Les droits se règlent depuis [Accès & Rôles](/admin/help/acces-permissions).
