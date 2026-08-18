# RF-TEA-006 : Le rappel de composition avant la journée

## 1. Description et Objectif Métier

Le contrôle de hiérarchie des valeurs (RF-TEA-003) ne peut se faire que si les compositions sont **validées avant que la journée se joue**. Un capitaine qui compose au dernier moment prive les équipes voisines de toute marge de correction — et la pénalité frappe les deux équipes.

À l'approche d'une journée, les capitaines et vice-capitaines dont la composition n'est pas validée sont relancés chaque jour, jusqu'à validation ou jusqu'à ce que relancer n'ait plus de sens.

---

## 2. Domaine Fonctionnel

- **Domaine** : teams (déclenchement et destinataires), notifications (diffusion)
- **Agrégat / Entité clé** : `lineup_slots` (`status`), `team_fixtures` (`played_at`), `championship_days`
- **Statut** : Validé

---

## 3. Définition de la Règle Métier

- **Périmètre : là où le risque de valeur existe.** Seuls les championnats où le club aligne **plusieurs équipes actives** et qui ont une hiérarchie de valeur (les vétérans n'en ont pas) sont concernés. Une équipe seule dans son championnat n'est jamais relancée.
- **Échéance partagée** par championnat et par journée : la **première rencontre du club** (plus petit `played_at` saisi), sinon le jour commun fixé par le comité (`match_date`), sinon le **lundi** de la journée — une journée va du lundi au dimanche.
- **Fenêtre** : la relance démarre la **veille de la journée** (ou la veille de l'échéance si une rencontre est fixée plus tôt), puis chaque jour.
- **Arrêt**, par équipe : toutes ses rencontres de la journée validées (`status = 'validated'` — un brouillon ne suffit pas, c'est la validation qui prévient les joueurs) ; ou l'horaire de la première rencontre dépassé quand il est connu ; ou la fin de la semaine de la journée sinon. Une rencontre reportée au-delà de sa semaine sort du radar à la fin de celle-ci : le report est exceptionnel.
- Exempt (`bye`) ou forfait déclaré : rien à composer. Barrages : seules les équipes qui ont une rencontre saisie sont relancées.
- Un message par équipe et par journée (les deux rencontres d'une journée régionale sont fusionnées), une relance par jour au plus (`source` par équipe et journée + fenêtre de 20 h).
- Interrupteur : `PUSH_LINEUP_REMINDERS_ENABLED`, désactivé par défaut.

---

## 4. Scénarios d'Acceptation (Gherkin)

```gherkin
# language: fr

Fonctionnalité: Rappel de composition

  Scénario: La veille d'une journée sans composition
    Étant donné deux équipes du club en ICD mixte et une journée qui commence demain
    Et aucune composition validée
    Quand le cron quotidien s'exécute
    Alors les capitaines et vice-capitaines des deux équipes sont relancés

  Scénario: La composition validée arrête les relances
    Étant donné une équipe relancée hier
    Quand son capitaine valide sa composition
    Alors le cron du lendemain ne la relance plus
    Et l'autre équipe, toujours sans composition validée, reste relancée

  Scénario: L'horaire de la première rencontre est dépassé
    Étant donné une rencontre du championnat fixée vendredi à 20 h
    Quand le cron s'exécute après cet horaire
    Alors plus aucune relance ne part pour cette journée

  Scénario: Une seule équipe dans le championnat
    Étant donné une unique équipe du club en ICD masculin
    Quand le cron s'exécute la veille de sa journée
    Alors elle n'est pas relancée : sans équipe voisine, aucun risque de valeur
```
