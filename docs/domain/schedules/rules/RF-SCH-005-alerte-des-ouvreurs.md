# RF-SCH-005 : Alerte « créneau à pourvoir »

## 1. Description et Objectif Métier

Une séance peut réunir assez de joueurs et rester fermée, faute d'un bénévole pour ouvrir le gymnase. Le bureau devait le repérer lui-même en relisant le tableur, puis relancer par SMS.

Cette règle décrit **quand le club sollicite ses ouvreurs**, comment, et ce qui garantit qu'il ne les harcèle pas.

---

## 2. Domaine Fonctionnel

- **Domaine** : schedules (émission), notifications (acheminement), members (adressage)
- **Agrégat / Entité clé** : Séance (`open_play_sessions`), Ouvreur (`open_play_openers`)
- **Statut** : Validé

---

## 3. Définition de la Règle Métier

**Une séance est « à pourvoir »** quand elle est ouverte, que son seuil est atteint — invités compris — et que personne ne s'est engagé à l'ouvrir. C'est un **état dérivé**, recalculé à chaque lecture : rien n'est stocké, donc rien ne peut mentir après un désistement.

**L'alerte part une fois par jour**, au passage de sept heures, et ne considère que les séances des **sept prochains jours**. Assez tôt pour qu'un bénévole s'organise, assez tard pour que l'affluence soit connue : au-delà, l'alerte porterait sur des séances encore vides qui trouveront preneur d'elles-mêmes.

**Un seul message, agrégé.** Trois notifications à sept heures du matin font désinstaller l'application. Le message annonce combien de séances cherchent preneur, en nomme deux au plus, et ouvre la page où le détail se lit.

**Elle ne s'adresse qu'aux ouvreurs désignés** de la saison, à leur adresse et à celle de leurs représentants légaux. Aucune liste d'adresses n'est recopiée : elles sont résolues à l'envoi depuis les licences, parce qu'une adresse recopiée périme en silence — le bénévole ne reçoit plus rien, et personne ne s'en aperçoit.

**Trois silences volontaires** : aucune séance au seuil, aucun ouvreur désigné, ou aucun ouvreur joignable. Dans les trois cas rien ne part, et le fait est journalisé — un envoi qui n'a pas eu lieu doit se constater.

**Elle ne peut pas se répéter dans la journée.** Un Cron Trigger peut être invoqué plusieurs fois pour la même échéance ; un message de même origine émis dans les vingt dernières heures suffit à annuler l'envoi.

**Elle est éteinte par défaut**, derrière un interrupteur distinct de celui de la fonctionnalité : l'un dit si le jeu libre existe, l'autre s'il a le droit de réveiller les gens. Les deux ne s'allument pas le même jour.

**Elle est désabonnable**, sous sa propre catégorie. Elle ne se range ni sous « Relances » — un bénévole qui coupe les rappels de cotisation couperait du même geste les appels à ouvrir le gymnase, sans comprendre pourquoi le club ne le prévient plus — ni sous « Communications du bureau », n'étant pas une communication mais une sollicitation opérationnelle. Comme toutes les catégories, elle est **active tant que l'adhérent ne l'a pas coupée**.

**Le domaine des créneaux n'envoie rien lui-même.** Il ne connaît ni les adhérents ni les notifications : il expose deux lectures — les séances à pourvoir, les ouvreurs de la saison — et c'est l'application qui les croise. C'est ce qui le maintient sans dépendance.

---

## 4. Scénarios d'Acceptation (Gherkin)

```gherkin
# language: fr

Fonctionnalité: Alerte « créneau à pourvoir »

  Scénario: Une séance atteint son seuil sans ouvreur
    Étant donné une séance dans six jours, avec quatre joueurs attendus et un seuil de quatre
    Et Marie désignée comme ouvreuse de la saison
    Quand l'alerte quotidienne s'exécute
    Alors Marie est prévenue qu'un créneau cherche un ouvreur
    Et la notification ouvre la page du jeu libre

  Scénario: Sous le seuil, rien ne part
    Étant donné une séance dans six jours, avec deux joueurs attendus et un seuil de quatre
    Quand l'alerte quotidienne s'exécute
    Alors aucune notification n'est émise

  Scénario: Une séance déjà pourvue ne déclenche rien
    Étant donné une séance au seuil, que Marie s'est engagée à ouvrir
    Quand l'alerte quotidienne s'exécute
    Alors aucune notification n'est émise

  Scénario: Au-delà de la semaine, rien ne part
    Étant donné une séance dans six semaines, au seuil et sans ouvreur
    Quand l'alerte quotidienne s'exécute
    Alors aucune notification n'est émise

  Scénario: Aucun ouvreur désigné
    Étant donné une séance au seuil et sans ouvreur
    Et aucun adhérent porteur d'un badge
    Quand l'alerte quotidienne s'exécute
    Alors aucune notification n'est émise
    Et le fait est journalisé

  Scénario: Plusieurs séances, un seul message
    Étant donné trois séances de la semaine au seuil et sans ouvreur
    Quand l'alerte quotidienne s'exécute
    Alors une seule notification est émise
    Et elle annonce que trois séances cherchent un ouvreur

  Scénario: Le cron rejoué ne double pas l'envoi
    Étant donné une alerte déjà émise ce matin
    Quand l'alerte quotidienne s'exécute de nouveau une minute plus tard
    Alors aucune seconde notification n'est émise

  Scénario: L'alerte est éteinte par défaut
    Étant donné un environnement où l'interrupteur des alertes de jeu libre n'est pas activé
    Quand l'alerte quotidienne s'exécute
    Alors aucune notification n'est émise, quelles que soient les séances

  Scénario: Un ouvreur se désabonne
    Étant donné Marie, ouvreuse désignée, qui a coupé la catégorie « Jeu libre »
    Quand l'alerte quotidienne s'exécute
    Alors Marie ne reçoit rien
    Et ses autres notifications continuent de lui parvenir
```
