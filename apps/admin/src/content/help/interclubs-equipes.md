---
title: Équipes, staff et calendrier
description: Engager les équipes du club, désigner capitaines et vice-capitaines, saisir les journées de championnat.
category: interclubs
order: 2
---

Le club engage des équipes dans quatre championnats aux règlements distincts. Cet écran les
déclare, leur donne un staff et un effectif, et pose leur calendrier.

## Créer une équipe

Le **championnat** est le premier champ, et il commande tout le reste : les divisions
proposées, le format de la rencontre et les limites de classement affichées en aide
changent avec lui.

Le **numéro d'équipe** n'est pas une étiquette. C'est lui qui porte la **hiérarchie du
club** : le règlement exige que la valeur de l'équipe *n* reste inférieure ou égale à celle
de l'équipe *n−1*, et sanctionne **les deux équipes** par rencontre perdue si ce n'est pas
le cas. Le nom en découle — `NBA91-3` — et ne se saisit pas, pour qu'il ne puisse jamais
contredire le numéro.

Deux équipes ne peuvent pas porter le même numéro dans un championnat. Elles le peuvent en
revanche dans deux championnats différents : `NBA91-1` en mixte et `NBA91-1` en masculin
sont deux équipes distinctes.

> Une équipe vit **une saison**. D'une saison à l'autre, elle peut changer de division,
> d'effectif et de capitaine : ce sont de nouvelles équipes, pas les mêmes modifiées.
> Le sélecteur de saison, en haut de l'écran, indique celle que vous garnissez.

## Staff et effectif

La désignation du **capitaine** et du **vice-capitaine** n'est pas décorative : c'est elle,
et rien d'autre, qui ouvre le droit de composer l'équipe depuis l'espace adhérent. Le
vice-capitaine est une notion interne au club, absente des règlements — il est là pour
suppléer.

Les deux doivent figurer au fichier des adhérents de la saison. Une licence inconnue est
refusée : ce serait un droit accordé à personne.

L'**effectif** est indicatif. Le règlement autorise un joueur à évoluer dans n'importe
quelle équipe de son club ; l'effectif sert à présélectionner dans l'écran de composition,
pas à interdire. Chaque joueur y est affiché avec ses classements et signalé s'il n'est pas
éligible à la division.

## Les journées

Le bouton **Journées** ouvre le calendrier du championnat choisi.

Une journée **est une semaine**, du lundi au dimanche. Ce n'est pas un détail : chaque
championnat numérote ses journées pour lui seul — la J1 du régional et celle du mixte sont
deux dates sans rapport — et ce sont les **semaines**, jamais les numéros, qui les relient.

Quand deux championnats tombent la même semaine, l'écran l'indique par un badge
« aussi *Interclubs Départemental Masculin* » en face de la journée. C'est le signal à
surveiller : un joueur ne tient qu'une seule équipe du club par semaine, mixte, masculin et
régional confondus. Les vétérans font exception — leur règlement ne cite aucun autre
championnat.

Vous saisissez n'importe quelle date de la semaine : elle est ramenée au lundi.

**Les jours de jeu diffèrent d'un championnat à l'autre**, ce qui explique que deux équipes
puissent partager une semaine sans partager un seul jour :

| Championnat | Jour de rencontre |
|---|---|
| Départemental mixte et masculin | du **lundi au vendredi**, en soirée (art. 3.4.1) |
| Départemental vétérans | le **dimanche**, samedi par dérogation (art. 3.3.1) |
| Régional | **samedi ou dimanche** — deux rencontres par journée |

Les **barrages** sont des journées à part : toutes les équipes ne les disputent pas, seules
celles que leur classement y envoie. Une équipe sans composition y est donc normale.

## Deux dates à ne pas confondre

C'est le point le plus subtil de la fonctionnalité.

**La semaine théorique de la journée** vient du calendrier du comité. Elle est **figée**,
commune à toutes les équipes, et porte **toutes les règles** : valeur d'équipe, mouvements
de joueurs, « un joueur ne tient qu'une seule équipe du club » (art. 6.3.7). Rien ne la
déplace.

**La date réelle de la rencontre** est **propre à chaque équipe**. C'est le capitaine qui la
saisit depuis l'espace adhérent, et elle dit simplement quand se présenter. Elle tombe
normalement dans la semaine théorique, mais un gymnase indisponible ou des intempéries
peuvent l'en faire sortir (art. 4.2.3).

Dans ce cas, l'écran du capitaine **refuse d'abord** la date — c'est presque toujours une
faute de frappe — puis l'accepte s'il confirme. Le calendrier affiche alors la date réelle
en rappelant la journée d'origine.

Les faire porter les mêmes règles reviendrait à laisser un aléa de gymnase changer ce que
le règlement autorise : la J2 de l'équipe 2 se compare à la J2 de l'équipe 3, reportée ou
non.
