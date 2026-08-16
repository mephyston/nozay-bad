---
title: Classements et date de référence
description: Importer les classements fédéraux depuis Poona et choisir la date qui fait foi pour chaque championnat.
category: interclubs
order: 1
---

Tout le calcul des valeurs d'équipe repose sur les classements. Cet écran les alimente et
décide **lesquels font foi**.

## L'écran

Deux zones repliables — **dates de référence** et **classements** — dont l'état de pli est
conservé d'une navigation à l'autre.

Les dates restent repliées tant qu'elles sont complètes, et **s'ouvrent d'elles-mêmes dès
qu'une date manque** : sans elle, aucune valeur d'équipe n'est calculable, et la cacher
serait cacher ce qu'il faut corriger. Les classements, que l'on vient consulter, s'ouvrent
par défaut.

L'**import** et les **règlements** ont chacun leur page, atteintes par les boutons du haut
de l'écran. Ce sont des gestes rares — quelques fois par saison — qui n'ont pas à occuper
un écran consulté chaque semaine.

## Importer les classements

L'import attend l'export **« compétiteurs »** de Poona, celui qui porte les colonnes
`ELO simple / double / mixte`. Glissez le fichier, vérifiez ce que l'écran a lu, puis
importez.

Trois points méritent votre attention avant de valider.

**La date des classements.** Elle est lue dans le fichier et affichée en grand, modifiable.
C'est elle qui détermine quel classement fera foi pour toute la saison en départemental :
ne la validez pas machinalement. La CCA la communique en début de saison — pour 2026-2027,
c'est le **jeudi 8 octobre 2026**.

**Les non-compétiteurs.** Environ un tiers du fichier n'a aucun classement : ce sont les
licenciés loisir. Ils sont comptés à part, et ce n'est pas une anomalie.

**Les compétiteurs sans adhérent.** L'import des classements **complète** le fichier des
adhérents, il ne le remplace pas et n'y ajoute personne. Si un compétiteur n'y figure pas,
son classement est tout de même enregistré, mais il vous est signalé : demandez au bureau
de relancer l'import des adhérents, puis rejouez celui-ci. Tant que le rapprochement n'est
pas fait, ce joueur **n'apparaît dans aucun sélecteur de composition**.

Rejouer un import ne crée jamais de doublon : il corrige les lignes de la même date.

## L'historique

Chaque import est conservé sous sa date, il n'écrase pas le précédent. C'est ce qui permet
de recalculer une journée passée, et de justifier une valeur d'équipe contestée. Le
sélecteur de date, au-dessus du tableau, liste les instantanés disponibles avec le nombre
de joueurs de chacun ; en changer fait relire tout le tableau à cette date.

Un export de début de saison ne contient que quelques licenciés : c'est normal, et les
autres joueurs conservent leur classement antérieur.

## Les dates de référence

Les règlements ne désignent pas tous la même date, et cet écran suit chacun d'eux.

| Championnat | Comment la date est choisie |
|---|---|
| Départemental mixte, masculin, vétérans | **Une date fixe pour toute la saison**, que vous épinglez ici (art. 6.1.3). Un reclassement obtenu en cours de saison ne la déplace pas. |
| Régional | **Recalculée à chaque journée** : le jeudi précédant la semaine de la rencontre (art. 4.4.2). Rien à épingler. |

Tant qu'un championnat départemental n'a pas de date épinglée, **aucune valeur d'équipe
n'y est calculable** — l'écran le signale plutôt que de deviner.

## Le règlement de la saison

Le bouton **Règlements** ouvre une page dédiée, où un champ par championnat reçoit le
**lien du règlement**. Déposez le PDF dans la médiathèque du site, puis collez son adresse
ici : il apparaîtra en téléchargement sur la fiche de chaque équipe du championnat, dans
l'espace adhérent.

C'est le texte qui fait foi le soir de la rencontre — composition, ordre des joueurs,
valeurs d'équipe — et qu'aucun joueur ne retrouve seul sur le site du comité. Le lien vaut
pour les quatre championnats, y compris le régional, indépendamment de la politique de date.

## Corriger un classement à la main

Les trois classements — simple, double, mixte — se choisissent directement dans le tableau,
sans quitter l'écran. La ligne passe alors en source **« Saisi à la main »**, ce qui reste
visible : une valeur d'équipe calculée sur une donnée saisie à la main doit pouvoir être
questionnée.

La liste distingue **« — non compétiteur »** de **NC**. Le premier décrit un licencié qui
ne joue pas en compétition ; le second un compétiteur sans résultat, qui vaut zéro point
mais **peut être aligné**. Les confondre ferait entrer en équipe quelqu'un qui n'y a pas sa
place.

La correction ne touche que **l'instantané affiché**, celui de la date sélectionnée. Écrire
sur une date antérieure changerait rétroactivement toutes les journées qui la prennent pour
référence, et donc la conformité de compositions déjà validées : un instantané est un fait
daté, on le corrige là où il est faux, jamais ailleurs.

> Le sélecteur de saison, en haut de l'écran, indique à quelle saison s'appliquent l'import
> et les dates de référence. Vérifiez-le avant d'enregistrer.
