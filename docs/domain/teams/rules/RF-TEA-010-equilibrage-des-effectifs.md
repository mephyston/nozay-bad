# RF-TEA-010 : Équilibrer les effectifs d'un championnat en début de saison

## 1. Description et Objectif Métier

En début de saison, le coach répartit les joueurs entre les équipes d'un même championnat. La règle de hiérarchie (art. 6.3.2) veut que chaque équipe reste sous celle du dessus. Une répartition mal pensée condamne pourtant toute la saison à des compositions acrobatiques, voire à un dépassement inévitable (RF-TEA-009).

L'outil « Équilibrer les effectifs » propose une répartition complète. Le coach la relit, puis l'applique d'un bloc ou la laisse.

---

## 2. Domaine Fonctionnel

- **Domaine** : teams
- **Agrégat / Entité clé** : `team_roster` des équipes actives d'un championnat
- **Statut** : Validé

---

## 3. Définition de la Règle Métier

### Le vivier

- Ce sont les joueurs **déjà inscrits** dans les équipes actives du championnat. L'outil ne puise jamais dans l'annuaire : l'effectif reste la déclaration qui fait foi.
- Un joueur inscrit dans deux équipes du même championnat compte une fois, dans la plus haute.
- Classements utilisés : la date de référence de la saison en départemental, le dernier import en régional.

### Les contraintes

- **Éligibilité de la division** : plafonds, planchers et catégorie. Un joueur trop fort pour une division n'y est jamais placé.
- **Garçons et filles** : chaque équipe reçoit autant de garçons, et autant de filles, à un près. Quand les plafonds de division le rendent impossible, l'outil s'en approche au mieux et l'écran le dit.
- Un joueur inscrit sans adhésion cette saison n'entre pas dans le vivier : l'écran le nomme, car l'application le retire de son équipe.
- Un joueur qu'aucune équipe du championnat n'admet n'est pas déplacé. L'outil le signale.

Seuls l'éligibilité et l'appartenance à une seule équipe sont garanties en toute circonstance.

### Les joueurs figés

- Le coach peut **figer** un joueur d'un clic sur son cadenas : il reste dans son équipe actuelle, y compte pour les quotas et les plages, et la répartition s'organise autour de lui.
- Le calcul est relancé à chaque joueur figé ou libéré.
- Les joueurs figés sont mémorisés dans le navigateur, par saison et par championnat. C'est une commodité, pas une donnée : un autre appareil ne les connaît pas.
- Figer un joueur peut empêcher l'équilibre garçons/filles. L'écran le signale alors, comme pour les plafonds de division.

### Ce qui est optimisé

Le score d'une répartition, du plus important au moins important :

1. une équipe qui ne peut pas remplir sa rencontre coûte 100 ;
2. un dépassement inévitable (la compo la plus faible dépasse la plus forte du dessus) coûte dix fois son ampleur ;
3. un chevauchement entre équipes voisines coûte son ampleur ;
4. chaque joueur déplacé coûte un millième : à résultat égal, la répartition qui bouscule le moins l'emporte.

La recherche part de deux répartitions :
- les plus forts d'abord, dans l'ordre des équipes ;
- les effectifs actuels, s'ils respectent déjà les contraintes.

Elle améliore ensuite par échanges de deux joueurs de même genre et par déplacements, tant que le score baisse.

### Où ça tourne

- Le calcul se fait dans le navigateur : il évalue des milliers de répartitions, bien au-delà des 10 ms de CPU d'un Worker du plan gratuit.
- L'API livre le vivier (`GET /teams/roster-balance`). Elle écrit la répartition en un seul lot (`PUT /teams/rosters`), qui exige toutes les équipes actives du championnat et refuse un joueur dans deux équipes.
- Comme pour une saisie à la main, les licences inconnues et les catégories d'âge non admises sont écartées et signalées.
- Les vétérans, sans valeur d'équipe, ne sont pas proposés.

---

## 4. Scénarios d'Acceptation (Gherkin)

```gherkin
# language: fr

Fonctionnalité: Équilibrage des effectifs

  Scénario: Les plus forts remontent en tête
    Étant donné deux équipes mixtes dont l'équipe 1 réunit les joueurs les plus faibles
    Quand le coach lance l'équilibrage
    Alors les plus forts sont proposés en équipe 1
    Et la plus faible compo de l'équipe 1 reste au-dessus de la plus forte de l'équipe 2

  Scénario: Autant de garçons et de filles dans chaque équipe
    Étant donné un vivier de 8 garçons et 4 filles pour deux équipes
    Quand le coach lance l'équilibrage
    Alors chaque équipe reçoit 4 garçons et 2 filles

  Scénario: Un plafond de division n'est jamais franchi
    Étant donné un joueur R5 en championnat masculin et une équipe 2 en division 2, plafonnée à D7
    Quand le coach lance l'équilibrage
    Alors ce joueur reste en équipe 1

  Scénario: Un joueur figé ne change pas d'équipe
    Étant donné le meilleur joueur du vivier inscrit en équipe 2
    Et figé par le coach
    Quand le coach lance l'équilibrage
    Alors ce joueur reste en équipe 2
    Et les autres sont répartis autour de lui, quotas compris

  Scénario: Rien à proposer quand la répartition est déjà la meilleure
    Étant donné des effectifs déjà répartis au mieux
    Quand le coach lance l'équilibrage
    Alors aucun mouvement n'est proposé

  Scénario: La répartition s'écrit d'un bloc
    Étant donné une répartition proposée
    Quand le coach l'applique
    Alors les effectifs de toutes les équipes sont remplacés en une seule écriture
    Et une répartition qui oublie une équipe, ou inscrit un joueur deux fois, est refusée sans rien modifier
```
