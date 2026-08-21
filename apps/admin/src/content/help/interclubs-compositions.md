---
title: Compositions et valeurs d'équipe
description: Comment les capitaines composent depuis l'espace adhérent, et ce que le calcul de valeur contrôle.
category: interclubs
order: 3
---

C'est la raison d'être de la fonctionnalité. Le règlement sanctionne **les deux équipes**
par rencontre perdue par pénalité dès qu'une équipe présente une valeur inférieure à celle
de l'équipe qui la suit dans la hiérarchie du club. Le vérifier suppose de croiser les
compositions de toutes les équipes d'un même championnat, pour une même journée — ce que
personne ne peut faire de tête le samedi matin.

## Qui compose

Depuis l'espace adhérent, menu **Équipes**, tout le club consulte les équipes, leur staff et
leur effectif. Seuls le **capitaine** et le **vice-capitaine** d'une équipe peuvent en
modifier la composition. Ce droit vient de leur désignation dans l'écran *Équipes*, pas d'un
rôle d'administration.

L'écran masque le bouton aux autres, mais c'est le serveur qui tient la règle : une
tentative d'écriture par quelqu'un d'autre est refusée.

## Ce que voit le capitaine

Une ligne par match du format de sa division, avec pour chacune le classement lu et les
points correspondants, puis le total et la **valeur d'équipe**. Le tout se recalcule à
chaque changement.

Sous le total figure la phrase qui décide de tout : *« NBA91-2 est à 5,20 sur cette journée :
votre équipe doit rester inférieure ou égale. »* Le capitaine voit sa contrainte **avant**
d'enregistrer. Si l'équipe du dessus n'a pas encore composé, l'écran le dit plutôt que
d'afficher une contrainte fausse.

Les sélecteurs ne proposent que **l'effectif déclaré de l'équipe**, restreint aux joueurs de
genre compatible avec la ligne, et grisent ceux qui sont indisponibles en indiquant pourquoi.

Aligner quelqu'un qui n'est pas à l'effectif suppose de **l'y ajouter d'abord** depuis
l'administration : c'est un geste du coach, et il laisse une trace. Auparavant la liste
partait de l'annuaire de la saison entière — près de trois cents personnes.

> [!IMPORTANT]
> L'éligibilité est jugée **discipline par discipline**. En régional, les divisions PN à R2
> exigent un classement minimum *dans la discipline jouée* : un joueur classé en simple mais
> pas en double est proposé en simple et grisé en double. Une ligne grisée ne veut donc pas
> dire que le joueur est indisponible pour toute la rencontre.

Si les classements de la journée ne sont pas disponibles — la mise à jour fédérale n'a pas
encore été importée — l'écran l'annonce **en tête du composeur** plutôt que de griser
silencieusement toutes les lignes. Aucun classement de remplacement n'est deviné : il
produirait des valeurs d'équipe apparemment normales sur une base que le règlement rejette.
Voir [Classements](/admin/help/interclubs-classements).

## Ce qui bloque, et ce qui avertit

**Bloquant** — objectif et vérifiable :

| | Règle |
|---|---|
| Classement | hors des limites de la division, dans la discipline jouée |
| Nombre de matchs | plus de deux pour un même joueur |
| Discipline | deux matchs dans la même discipline |
| Semaine | joueur déjà aligné dans une autre équipe du club cette semaine |
| Genre | homme en simple dame, et réciproquement |
| Catégorie | non admise dans le championnat |
| Mutés | plus de deux sur la rencontre |

**Avertissement** — dépend d'informations encore en mouvement :

- **la valeur dépasse celle de l'équipe du dessus** ;
- l'ordre des joueurs n'est pas décroissant ;
- l'équipe est incomplète ;
- un classement manque à la date de référence.

La hiérarchie des valeurs n'est **jamais bloquante**, et c'est délibéré : la valeur de
l'équipe supérieure change tant que son capitaine saisit. Bloquer le premier parce que le
troisième n'a rien rempli rendrait l'outil inutilisable.

### Trois avertissements qui regardent la saison passée

Ceux-là ne se déduisent d'aucune composition du jour — ils lisent l'historique des
rencontres déjà saisies.

| | Règle |
|---|---|
| **Titularisation** | Trois rencontres avec une équipe et le joueur ne peut plus être aligné dans une équipe inférieure du même championnat (art. 6.3.2). Monter reste libre. |
| **Renforts croisés** | Une équipe ne se renforce pas de plus de deux joueurs dont la **dernière** rencontre était dans l'autre championnat départemental (art. 6.3.2). |
| **Venus du régional** | Une équipe départementale ne présente qu'un seul joueur ayant déjà disputé le régional cette saison (art. 6.1.7). |

Ils restent des avertissements, et non des refus : l'historique ne connaît que les
rencontres saisies dans l'outil. Une partie de la saison a pu se jouer avant sa mise en
service, et bloquer sur une base incomplète refuserait des compositions parfaitement
régulières.

## Comment la valeur se calcule

Les formules diffèrent d'un championnat à l'autre.

**Départemental.** Chaque ligne vaut les points de son joueur, ou la **moyenne** de la paire
en double. On additionne, puis on divise par le **nombre de lignes composées** — et non par
le format. Le règlement est explicite : une équipe incomplète se divise par le nombre de
matchs joués.

*Exemple, tiré de l'annexe du règlement mixte :* SH1 N3 (10), SH2 R4 (9), SH3 D7 (6),
SD R6 (7), DH N2-D7 (8,5), DD R6-R6 (7), MX D8-R5 (6,5) → total 54, valeur **54 / 7 = 7,71**.

**Régional.** On ignore les lignes : les **3 meilleurs joueurs et les 3 meilleures joueuses**
de la feuille, chacun au meilleur de ses trois classements, divisés par 6. Un joueur aligné
deux fois ne compte qu'une. Les places non pourvues valent zéro.

**Vétérans.** Aucune valeur d'équipe : leur règlement n'en définit pas, et aucune contrainte
de hiérarchie n'en découle.

Une valeur **non calculable** — classement manquant, date de référence non épinglée — est
affichée comme telle. Elle n'est jamais remplacée par une estimation.

## Les deux rencontres d'une journée régionale

En régional, une journée compte **deux rencontres**, disputées le même week-end contre deux
adversaires différents. Elles se composent **séparément** : l'écran de composition en ouvre
une à la fois, et son en-tête rappelle laquelle dès que la journée en compte plusieurs.

La page de l'équipe liste donc une entrée par rencontre. Chacune est nommée par son
**adversaire** quand il est saisi, et par son rang sinon — d'où l'intérêt de renseigner le
nom de l'équipe adverse : c'est lui qui rend les deux rencontres discernables partout
ailleurs.

> [!CAUTION]
> Vérifiez l'en-tête avant de composer. Les deux rencontres ont le même numéro de journée,
> et une composition saisie sur la mauvaise laisse l'autre vide.

Les autres championnats n'ont qu'une rencontre par journée : l'écran ne dit alors rien de
particulier.

## La date de la rencontre

Au-dessus de la composition, le capitaine fixe la **date réelle** de sa rencontre, le
gymnase et l'**équipe adverse**. C'est une information de logistique, propre à son équipe :
elle ne déplace jamais la journée, qui reste celle du calendrier du comité et porte les
règles.

Le bureau peut saisir les mêmes informations sans passer par le capitaine, depuis la feuille
**Rencontres** d'une équipe — voir [Équipes](/admin/help/interclubs-equipes). Le capitaine
connaît son calendrier, le bureau a le calendrier du comité : les deux chemins écrivent au
même endroit.

Une date hors de la semaine théorique est refusée au premier essai, avec l'explication de
ce qu'elle changerait ; un second envoi la confirme. Le calendrier signale alors la
rencontre comme reportée, en rappelant la semaine d'origine.

## Enregistrer ou valider

**Enregistrer** conserve la composition en brouillon. **Valider** la fige et la signale au
coach. Dans les deux cas, une règle bloquante refuse l'écriture, et la composition
précédente reste intacte — le motif du refus s'affiche sous la composition, avec l'article
concerné.

## Qui est prévenu, et quand

Rien ne part tant que la composition reste un brouillon : elle se construit en plusieurs
passes, et une notification par passe apprendrait à l'équipe à les ignorer toutes.

À la **validation** — et à chaque modification d'une composition déjà validée — deux
messages partent, dans la catégorie *Mes équipes interclubs* que chacun peut couper depuis
ses préférences de notification :

- aux **joueurs alignés** : l'équipe, l'adversaire, le lieu, et la date si elle est connue
  — sinon la semaine ;
- aux **joueurs de l'effectif non retenus** : ils ne sont pas sur la feuille de cette
  journée. C'est l'information qui manquait le plus : sans elle, un joueur ne sait pas s'il
  est attendu ou si le capitaine n'a rien saisi, et doit poser la question chaque semaine.

Le capitaine qui enregistre n'est jamais destinataire de son propre envoi.

Sur l'accueil de l'espace adhérent, un encart **Prochaine rencontre** annonce la même chose
en permanence : l'équipe, la journée, la date, et si l'adhérent figure sur la feuille.

Le calendrier est arrêté par le comité en septembre-octobre et transmis aux capitaines par
le président : **porter la date exacte sur la rencontre, comme saisir la composition, est
la responsabilité du capitaine**. Tant que ce n'est pas fait, l'encart annonce la semaine
théorique et l'écrit sans détour — « votre capitaine n'a pas encore renseigné la date
exacte », « votre capitaine n'a pas encore saisi la composition ». Présenter ces absences
comme des décisions en attente laisserait les joueurs patienter là où il suffit de relancer
leur capitaine. Un adhérent que la composition existante ne retient pas lit, lui, qu'il
n'est pas aligné : les deux situations ne se confondent jamais.

## Les journées dans l'agenda

Les journées de championnat apparaissent aussi dans l'**agenda de l'espace adhérent**, pour
les seuls adhérents engagés en équipe, mêlées aux rendez-vous du club et dans la couleur de
la catégorie *Interclubs* — c'est le même rendez-vous, il n'a pas à s'afficher deux fois de
deux façons. Chaque ligne rappelle le championnat, la division, et si l'adhérent est aligné.

La date affichée suit trois sources, dans cet ordre :

1. **la date saisie par le capitaine**, heure comprise : elle fait foi ;
2. à défaut, le **jour commun du calendrier** — le dimanche des vétérans ;
3. à défaut encore, le **lundi de la semaine théorique**, pour le mixte et le masculin qui
   se jouent en semaine sans jour commun. La ligne précise alors que la date reste à
   préciser par le capitaine, et que la rencontre se joue dans la semaine, pas
   nécessairement le lundi.

On ne s'inscrit pas à une rencontre : ces lignes ne portent aucun bouton d'inscription.

## Signaler une anomalie depuis l'écran de contrôle

Sur *Interclubs → Contrôle des journées*, chaque anomalie porte un bouton de signalement.
Le message est **construit à partir du constat affiché**, jamais saisi : le coach clique,
il ne rédige pas.

Un **dépassement de valeur part aux deux capitaines concernés** — celui de l'équipe qui
dépasse et celui de l'équipe du dessus. Le règlement fait perdre la rencontre aux deux, et
la correction peut venir de l'une comme de l'autre : renforcer celle du dessus vaut alléger
celle du dessous. Chaque message nomme l'autre capitaine pour qu'ils se rapprochent.

Une **erreur dure** ne part qu'au capitaine fautif : elle se corrige dans sa seule
composition. Le vice-capitaine est prévenu avec le capitaine dans les deux cas. Rien n'est
envoyé si la composition est saine.
