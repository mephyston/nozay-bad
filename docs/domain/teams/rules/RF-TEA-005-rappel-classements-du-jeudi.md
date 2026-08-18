# RF-TEA-005 : Le rappel des classements du jeudi

## 1. Description et Objectif Métier

En régional, le classement applicable à une journée est celui publié le **jeudi qui la précède** (RF-TEA-001, art. 4.4.2). Si personne n'importe l'export Poona ce jour-là, toutes les valeurs d'équipes de la journée se calculent sur un classement périmé — et le contrôle de hiérarchie (RF-TEA-003) ne protège plus personne.

Le jeudi de référence d'une journée régionale, une notification rappelle aux **fonctions du club** (bureau, comité d'administration, entraîneurs — RF-MEM-001) d'exporter les classements depuis Poona et de les importer dans l'admin. Les capitaines ne sont pas visés : l'import est un geste d'administration auquel ils n'ont pas forcément accès.

---

## 2. Domaine Fonctionnel

- **Domaine** : teams (déclenchement), members (destinataires), notifications (diffusion)
- **Agrégat / Entité clé** : `championship_days` (`week_start`), `member_club_functions`
- **Statut** : Validé

---

## 3. Définition de la Règle Métier

- Déclenchement : le cron quotidien cherche les journées dont `week_start` tombe **dans quatre jours** — `thursdayBefore(weekStart) = weekStart − 4`, et `week_start` étant normalisé au lundi, seuls les jeudis peuvent matcher. Le jour est évalué en **heure de Paris** (le cron tourne en UTC).
- Périmètre : championnats à classement **par journée** (`rankingPolicy: 'per_day'`, l'ICR seniors aujourd'hui) où le club aligne au moins une équipe active. Le départemental joue toute la saison sur une date fixe : un rappel hebdomadaire n'y changerait rien.
- Destinataires : toutes les fonctions du club de la saison en cours (résolue par date, jamais par le drapeau comptable `active`), via leurs emails de contact.
- Une seule notification par journée concernée (`source` dédiée + fenêtre de 20 h : un Cron Trigger peut être ré-invoqué pour la même échéance).
- Interrupteur : `PUSH_RANKING_REMINDERS_ENABLED`, désactivé par défaut — rien ne part du seul fait d'un déploiement.

---

## 4. Scénarios d'Acceptation (Gherkin)

```gherkin
# language: fr

Fonctionnalité: Rappel des classements du jeudi

  Scénario: Le jeudi de référence d'une journée régionale
    Étant donné une journée ICR dont la semaine commence lundi prochain
    Et un trésorier et un entraîneur renseignés pour la saison
    Quand le cron quotidien s'exécute ce jeudi
    Alors une notification « Classements à mettre à jour » part vers leurs appareils

  Scénario: Un championnat départemental la même semaine
    Étant donné une journée ICD mixte dont la semaine commence lundi prochain
    Quand le cron quotidien s'exécute ce jeudi
    Alors aucune notification de classement ne part pour cette journée

  Scénario: Aucune fonction renseignée
    Étant donné une journée ICR la semaine prochaine et aucune fonction au club saisie
    Quand le cron quotidien s'exécute ce jeudi
    Alors rien ne part et le vide est journalisé
```
