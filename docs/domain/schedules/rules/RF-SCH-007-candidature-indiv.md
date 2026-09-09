# RF-SCH-007 : Candidature d'un compétiteur à une soirée

## 1. Description et Objectif Métier

Sur WhatsApp, chacun demandait quand il y pensait, parfois pour trois semaines à l'avance, et l'entraîneur retrouvait les demandes dans un fil de conversation. Cette règle décrit **qui peut demander sa séance**, sur quoi porte la demande, et ce que l'adhérent en voit.

---

## 2. Domaine Fonctionnel

- **Domaine** : schedules
- **Agrégat / Entité clé** : Candidature (`indiv_requests`)
- **Statut** : Validé

---

## 3. Définition de la Règle Métier

**Seuls les groupes compétiteurs candidatent.** Le club n'a pas de liste de compétiteurs ; il a des libellés de tarif Poona. La règle retenue est la plus simple qui les couvre : le mot « compétiteur » dans le libellé du type d'adhésion, sans égard à la casse ni aux accents. Elle est **assumée comme approximative** — « Elite Jeunes (Collège) » n'y répond pas, et c'est un choix connu. Le domaine ne connaît pas les adhérents : l'appelant lui présente le libellé, et **le handler** rend le refus.

**Seul un adhérent connecté candidate, et pour lui-même.** L'identité — adhésion, licence, prénom, nom, adresse, groupe — est imposée par la session et la fiche adhérent, jamais lue dans la requête du navigateur. Le navigateur choisit une préférence de créneau et un mot pour l'entraîneur ; il ne choisit jamais qui candidate.

**La demande porte sur la soirée, avec une préférence.** Le candidat souhaite le premier créneau, le second, ou n'importe lequel. Une préférence est un **souhait**, pas une exigence : l'entraîneur peut placer ailleurs.

**Une candidature par adhérent et par soirée.** Recandidater met à jour — préférence, mot, identité — et **ne touche jamais** à la décision de l'entraîneur.

**Six refus, dans cet ordre** : la soirée n'existe pas, elle est annulée, ses retenus sont annoncés, elle est passée (date seule, jusqu'à minuit), le demandeur n'est pas d'un groupe compétiteur, le créneau souhaité n'existe pas sur cette soirée.

**Se retirer est plus permissif que candidater.** Le seul refus est l'inexistence de la soirée. Se retirer reste possible **après l'annonce** — un retenu empêché doit pouvoir le dire, c'est précisément ce que l'entraîneur a besoin de savoir pour donner la place. Tolérant à l'absence : se retirer deux fois n'est pas une erreur.

**L'adhérent ne voit qu'une soirée à la fois** : la prochaine non annulée, sur l'accueil et en tête du calendrier. La suivante n'apparaît qu'une fois celle-ci passée. C'est ce qui évite les demandes trop à l'avance.

**Compter n'est pas savoir qui.** Avant l'annonce, l'espace adhérent reçoit le nombre de candidats et sa propre situation, aucun nom. Après l'annonce, il reçoit **les retenus par créneau**, prénom et initiale — l'annonce est publique par nature, elle part sur le groupe — et jamais le nom d'un non-retenu.

---

## 4. Scénarios d'Acceptation (Gherkin)

```gherkin
# language: fr

Fonctionnalité: Candidature à une soirée d'indiv

  Scénario: Un compétiteur candidate avec une préférence
    Étant donné une soirée ouverte et un adhérent du groupe « Compétiteurs adultes »
    Quand il candidate en souhaitant le second créneau
    Alors la soirée compte une candidature à son nom, préférence 2

  Scénario: Un adhérent loisirs ne peut pas candidater
    Étant donné un adhérent du groupe « Loisirs 1 (Lundi) »
    Quand il tente de candidater
    Alors l'opération est refusée comme réservée aux groupes compétiteurs

  Scénario: Recandidater ne touche pas à la décision
    Étant donné un candidat déjà retenu sur le créneau 1
    Quand il change sa préférence pour le créneau 2
    Alors sa candidature porte la préférence 2 et il reste retenu sur le créneau 1

  Scénario: Les candidatures se ferment à l'annonce
    Étant donné une soirée dont les retenus sont annoncés
    Quand un compétiteur tente de candidater
    Alors l'opération est refusée

  Scénario: Se retirer reste possible après l'annonce
    Étant donné un candidat retenu sur une soirée annoncée
    Quand il se retire
    Alors sa candidature est supprimée

  Scénario: Une seule soirée visible
    Étant donné des soirées les 17, 19 et 24 mars, celle du 17 annulée
    Quand l'espace adhérent lit la prochaine soirée le 16 mars
    Alors il reçoit celle du 19 mars seulement

  Scénario: Aucun nom avant l'annonce, seulement les retenus après
    Étant donné une soirée avec deux retenus et un non-retenu
    Quand l'espace adhérent lit la soirée avant l'annonce
    Alors il ne reçoit aucun nom
    Quand il la lit après l'annonce
    Alors il reçoit les deux retenus par créneau, et jamais le non-retenu
```
